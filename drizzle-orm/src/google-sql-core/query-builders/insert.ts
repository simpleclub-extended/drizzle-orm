import type { GoogleSqlDialect } from '~/google-sql-core/dialect.ts';
import type {
	GoogleSqlPreparedQuery,
	GoogleSqlQueryResultHKT,
	GoogleSqlQueryResultKind,
	GoogleSqlSession,
	PreparedQueryConfig,
} from '~/google-sql-core/session.ts';
import type { GoogleSqlTable, TableConfig } from '~/google-sql-core/table.ts';
import { entityKind, is } from '~/entity.ts';
import type { TypedQueryBuilder } from '~/query-builders/query-builder.ts';
import type { SelectResultFields } from '~/query-builders/select.types.ts';
import { preparedStatementName } from '~/query-name-generator.ts';
import { QueryPromise } from '~/query-promise.ts';
import type { RunnableQuery } from '~/runnable-query.ts';
import { SelectionProxyHandler } from '~/selection-proxy.ts';
import type { ColumnsSelection, Placeholder, Query, SQLWrapper } from '~/sql/sql.ts';
import { Param, SQL } from '~/sql/sql.ts';
import type { Subquery } from '~/subquery.ts';
import type { InferInsertModel } from '~/table.ts';
import { getTableName, Table, TableColumns } from '~/table.ts';
import { tracer } from '~/tracing.ts';
import { haveSameKeys, orderSelectedFields } from '~/utils.ts';
import type { AnyGoogleSqlColumn, GoogleSqlColumn } from '../columns/common.ts';
import { QueryBuilder } from './query-builder.ts';
import type { SelectedFieldsFlat, SelectedFieldsOrdered } from './select.types.ts';

export type GoogleSqlInsertMode = 'default' | 'or_ignore' | 'or_update';

export interface GoogleSqlInsertConfig<TTable extends GoogleSqlTable = GoogleSqlTable> {
	table: TTable;
	values: Record<string, Param | SQL>[] | GoogleSqlInsertSelectQueryBuilder<TTable> | SQL;
	insertMode?: GoogleSqlInsertMode;
	returningFields?: SelectedFieldsFlat;
	returning?: SelectedFieldsOrdered;
	withAction?: boolean;
	select?: boolean;
}

export type GoogleSqlInsertValue<
	TTable extends GoogleSqlTable<TableConfig>,
	OverrideT extends boolean = false,
	TModel extends Record<string, any> = InferInsertModel<TTable, { dbColumnNames: false; override: OverrideT }>,
> =
	& {
		[Key in keyof TModel]:
			| TModel[Key]
			| SQL
			| Placeholder;
	}
	& {};

export type GoogleSqlInsertSelectQueryBuilder<
	TTable extends GoogleSqlTable,
	TModel extends Record<string, any> = InferInsertModel<TTable>,
> = TypedQueryBuilder<
	{ [K in keyof TModel]: AnyGoogleSqlColumn | SQL | SQL.Aliased | TModel[K] }
>;

export class GoogleSqlInsertBuilder<
	TTable extends GoogleSqlTable,
	TQueryResult extends GoogleSqlQueryResultHKT,
	OverrideT extends boolean = false,
> {
	static readonly [entityKind]: string = 'GoogleSqlInsertBuilder';

	constructor(
		private table: TTable,
		private session: GoogleSqlSession,
		private dialect: GoogleSqlDialect,
		private insertMode?: GoogleSqlInsertMode,
	) {}

	values(value: GoogleSqlInsertValue<TTable, OverrideT>): GoogleSqlInsertBase<TTable, TQueryResult>;
	values(values: GoogleSqlInsertValue<TTable, OverrideT>[]): GoogleSqlInsertBase<TTable, TQueryResult>;
	values(
		values: GoogleSqlInsertValue<TTable, OverrideT> | GoogleSqlInsertValue<TTable, OverrideT>[],
	): GoogleSqlInsertBase<TTable, TQueryResult> {
		values = Array.isArray(values) ? values : [values];
		if (values.length === 0) {
			throw new Error('values() must be called with at least one value');
		}
		const mappedValues = values.map((entry) => {
			const result: Record<string, Param | SQL> = {};
			const cols = this.table[Table.Symbol.Columns];
			for (const colKey of Object.keys(entry)) {
				const colValue = entry[colKey as keyof typeof entry];
				result[colKey] = is(colValue, SQL) ? colValue : new Param(colValue, cols[colKey]);
			}
			return result;
		});

		return new GoogleSqlInsertBase(
			this.table,
			mappedValues,
			this.session,
			this.dialect,
			false,
			false,
			this.insertMode,
		) as any;
	}

	orIgnore(): this {
		this.insertMode = 'or_ignore';
		return this;
	}

	orUpdate(): this {
		this.insertMode = 'or_update';
		return this;
	}

	orError(): this {
		this.insertMode = 'default';
		return this;
	}

	select(
		selectQuery: (qb: QueryBuilder) => GoogleSqlInsertSelectQueryBuilder<TTable>,
	): GoogleSqlInsertBase<TTable, TQueryResult>;
	select(selectQuery: (qb: QueryBuilder) => SQL): GoogleSqlInsertBase<TTable, TQueryResult>;
	select(selectQuery: SQL): GoogleSqlInsertBase<TTable, TQueryResult>;
	select(selectQuery: GoogleSqlInsertSelectQueryBuilder<TTable>): GoogleSqlInsertBase<TTable, TQueryResult>;
	select(
		selectQuery:
			| SQL
			| GoogleSqlInsertSelectQueryBuilder<TTable>
			| ((qb: QueryBuilder) => GoogleSqlInsertSelectQueryBuilder<TTable> | SQL),
	): GoogleSqlInsertBase<TTable, TQueryResult> {
		const select = typeof selectQuery === 'function' ? selectQuery(new QueryBuilder()) : selectQuery;

		if (
			!is(select, SQL)
			&& !haveSameKeys(this.table[TableColumns], select._.selectedFields)
		) {
			throw new Error(
				'Insert select error: selected fields are not the same or are in a different order compared to the table definition',
			);
		}

		return new GoogleSqlInsertBase(this.table, select, this.session, this.dialect, true, false, this.insertMode);
	}
}

export type GoogleSqlInsertWithout<
	T extends AnyGoogleSqlInsert,
	TDynamic extends boolean,
	K extends keyof T & string,
> = TDynamic extends true ? T
	: Omit<
		GoogleSqlInsertBase<
			T['_']['table'],
			T['_']['queryResult'],
			T['_']['selectedFields'],
			T['_']['returning'],
			TDynamic,
			T['_']['excludedMethods'] | K
		>,
		T['_']['excludedMethods'] | K
	>;

export type GoogleSqlInsertReturning<
	T extends AnyGoogleSqlInsert,
	TDynamic extends boolean,
	TSelectedFields extends SelectedFieldsFlat,
> = GoogleSqlInsertBase<
	T['_']['table'],
	T['_']['queryResult'],
	TSelectedFields,
	SelectResultFields<TSelectedFields>,
	TDynamic,
	T['_']['excludedMethods']
>;

export type GoogleSqlInsertReturningAll<T extends AnyGoogleSqlInsert, TDynamic extends boolean> = GoogleSqlInsertBase<
	T['_']['table'],
	T['_']['queryResult'],
	T['_']['table']['_']['columns'],
	T['_']['table']['$inferSelect'],
	TDynamic,
	T['_']['excludedMethods']
>;

export type GoogleSqlInsertPrepare<T extends AnyGoogleSqlInsert> = GoogleSqlPreparedQuery<
	PreparedQueryConfig & {
		execute: T['_']['returning'] extends undefined ? GoogleSqlQueryResultKind<T['_']['queryResult'], never>
			: T['_']['returning'][];
	}
>;

export type GoogleSqlInsertDynamic<T extends AnyGoogleSqlInsert> = GoogleSqlInsert<
	T['_']['table'],
	T['_']['queryResult'],
	T['_']['returning']
>;

export type AnyGoogleSqlInsert = GoogleSqlInsertBase<any, any, any, any, any, any>;

export type GoogleSqlInsert<
	TTable extends GoogleSqlTable = GoogleSqlTable,
	TQueryResult extends GoogleSqlQueryResultHKT = GoogleSqlQueryResultHKT,
	TSelectedFields extends ColumnsSelection | undefined = ColumnsSelection | undefined,
	TReturning extends Record<string, unknown> | undefined = Record<string, unknown> | undefined,
> = GoogleSqlInsertBase<TTable, TQueryResult, TSelectedFields, TReturning, true, never>;

export interface GoogleSqlInsertBase<
	TTable extends GoogleSqlTable,
	TQueryResult extends GoogleSqlQueryResultHKT,
	TSelectedFields extends ColumnsSelection | undefined = undefined,
	TReturning extends Record<string, unknown> | undefined = undefined,
	TDynamic extends boolean = false,
	TExcludedMethods extends string = never,
> extends
	TypedQueryBuilder<
		TSelectedFields,
		TReturning extends undefined ? GoogleSqlQueryResultKind<TQueryResult, never> : TReturning[]
	>,
	QueryPromise<TReturning extends undefined ? GoogleSqlQueryResultKind<TQueryResult, never> : TReturning[]>,
	RunnableQuery<
		TReturning extends undefined ? GoogleSqlQueryResultKind<TQueryResult, never> : TReturning[],
		'googlesql'
	>,
	SQLWrapper
{
	readonly _: {
		readonly dialect: 'googlesql';
		readonly table: TTable;
		readonly queryResult: TQueryResult;
		readonly selectedFields: TSelectedFields;
		readonly returning: TReturning;
		readonly dynamic: TDynamic;
		readonly excludedMethods: TExcludedMethods;
		readonly result: TReturning extends undefined ? GoogleSqlQueryResultKind<TQueryResult, never> : TReturning[];
	};
}

export class GoogleSqlInsertBase<
	TTable extends GoogleSqlTable,
	TQueryResult extends GoogleSqlQueryResultHKT,
	TSelectedFields extends ColumnsSelection | undefined = undefined,
	TReturning extends Record<string, unknown> | undefined = undefined,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	TDynamic extends boolean = false,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	TExcludedMethods extends string = never,
> extends QueryPromise<TReturning extends undefined ? GoogleSqlQueryResultKind<TQueryResult, never> : TReturning[]>
	implements
		TypedQueryBuilder<
			TSelectedFields,
			TReturning extends undefined ? GoogleSqlQueryResultKind<TQueryResult, never> : TReturning[]
		>,
		RunnableQuery<
			TReturning extends undefined ? GoogleSqlQueryResultKind<TQueryResult, never> : TReturning[],
			'googlesql'
		>,
		SQLWrapper
{
	static override readonly [entityKind]: string = 'GoogleSqlInsert';

	private config: GoogleSqlInsertConfig<TTable>;

	constructor(
		table: TTable,
		values: GoogleSqlInsertConfig['values'],
		private session: GoogleSqlSession,
		private dialect: GoogleSqlDialect,
		select?: boolean,
		withAction?: boolean,
		insertMode?: GoogleSqlInsertMode,
	) {
		super();
		this.config = { table, values: values as any, select, withAction, insertMode };
	}

	/**
	 * Adds a `then return` clause to the query.
	 *
	 * Calling this method will return the specified fields of the inserted rows. If no fields are specified, all fields will be returned.
	 *
	 * See docs: {@link https://orm.drizzle.team/docs/insert#insert-returning}
	 *
	 * @example
	 * ```ts
	 * // Insert one row and return all fields
	 * const insertedCar: Car[] = await db.insert(cars)
	 *   .values({ brand: 'BMW' })
	 *   .returning();
	 *
	 * // Insert one row and return only the id
	 * const insertedCarId: { id: number }[] = await db.insert(cars)
	 *   .values({ brand: 'BMW' })
	 *   .returning({ id: cars.id });
	 * ```
	 */
	returning(): GoogleSqlInsertWithout<GoogleSqlInsertReturningAll<this, TDynamic>, TDynamic, 'returning'>;
	returning<TSelectedFields extends SelectedFieldsFlat>(
		fields: TSelectedFields,
	): GoogleSqlInsertWithout<GoogleSqlInsertReturning<this, TDynamic, TSelectedFields>, TDynamic, 'returning'>;
	returning(
		fields: SelectedFieldsFlat = this.config.table[Table.Symbol.Columns],
	): GoogleSqlInsertWithout<AnyGoogleSqlInsert, TDynamic, 'returning'> {
		this.config.returningFields = fields;
		this.config.returning = orderSelectedFields<GoogleSqlColumn>(fields);
		return this as any;
	}

	/**
	 * Adds `with action` to the `then return` clause.
	 *
	 * This adds a string column called `ACTION` to the result row set. Each value in this column
	 * represents the type of action that was applied during statement execution (INSERT, DELETE, UPDATE).
	 * The ACTION column is appended as the last output column.
	 *
	 * Must be used together with `.returning()`.
	 *
	 * @example
	 * ```ts
	 * const result = await db.insert(cars)
	 *   .values({ brand: 'BMW' })
	 *   .returning()
	 *   .withAction();
	 * ```
	 */
	withAction(): GoogleSqlInsertWithout<this, TDynamic, 'withAction'> {
		this.config.withAction = true;
		return this as any;
	}

	/** @internal */
	getSQL(): SQL {
		return this.dialect.buildInsertQuery(this.config);
	}

	toSQL(): Query {
		const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
		return rest;
	}

	/** @internal */
	_prepare(name?: string, generateName = false): GoogleSqlInsertPrepare<this> {
		return tracer.startActiveSpan('drizzle.prepareQuery', () => {
			const query = this.dialect.sqlToQuery(this.getSQL());
			return this.session.prepareQuery<
				PreparedQueryConfig & {
					execute: TReturning extends undefined ? GoogleSqlQueryResultKind<TQueryResult, never> : TReturning[];
				}
			>(
				query,
				this.config.returning,
				name ?? (generateName ? preparedStatementName(query.sql, query.params) : name),
				true,
			);
		});
	}

	prepare(name?: string): GoogleSqlInsertPrepare<this> {
		return this._prepare(name, true);
	}

	override execute: ReturnType<this['prepare']>['execute'] = (placeholderValues) => {
		return tracer.startActiveSpan('drizzle.operation', () => {
			return this._prepare().execute(placeholderValues);
		});
	};

	/** @internal */
	getSelectedFields(): this['_']['selectedFields'] {
		return (
			this.config.returningFields
				? new Proxy(
					this.config.returningFields,
					new SelectionProxyHandler({
						alias: getTableName(this.config.table),
						sqlAliasedBehavior: 'alias',
						sqlBehavior: 'error',
					}),
				)
				: undefined
		) as this['_']['selectedFields'];
	}

	$dynamic(): GoogleSqlInsertDynamic<this> {
		return this as any;
	}
}
