import type { GoogleSQLDialect } from '~/google-sql-core/dialect.ts';
import type {
	GoogleSQLPreparedQuery,
	GoogleSQLQueryResultHKT,
	GoogleSQLQueryResultKind,
	GoogleSQLSession,
	PreparedQueryConfig,
} from '~/google-sql-core/session.ts';
import type { GoogleSQLTable, TableConfig } from '~/google-sql-core/table.ts';
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
import { haveSameKeys, type NeonAuthToken, orderSelectedFields } from '~/utils.ts';
import type { AnyGoogleSQLColumn, GoogleSQLColumn } from '../columns/common.ts';
import { QueryBuilder } from './query-builder.ts';
import type { SelectedFieldsFlat, SelectedFieldsOrdered } from './select.types.ts';

export type GoogleSQLInsertMode = 'default' | 'or_ignore' | 'or_update';

export interface GoogleSQLInsertConfig<TTable extends GoogleSQLTable = GoogleSQLTable> {
	table: TTable;
	values: Record<string, Param | SQL>[] | GoogleSQLInsertSelectQueryBuilder<TTable> | SQL;
	withList?: Subquery[];
	insertMode?: GoogleSQLInsertMode;
	returningFields?: SelectedFieldsFlat;
	returning?: SelectedFieldsOrdered;
	withAction?: boolean;
	select?: boolean;
}

export type GoogleSQLInsertValue<
	TTable extends GoogleSQLTable<TableConfig>,
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

export type GoogleSQLInsertSelectQueryBuilder<
	TTable extends GoogleSQLTable,
	TModel extends Record<string, any> = InferInsertModel<TTable>,
> = TypedQueryBuilder<
	{ [K in keyof TModel]: AnyGoogleSQLColumn | SQL | SQL.Aliased | TModel[K] }
>;

export class GoogleSQLInsertBuilder<
	TTable extends GoogleSQLTable,
	TQueryResult extends GoogleSQLQueryResultHKT,
	OverrideT extends boolean = false,
> {
	static readonly [entityKind]: string = 'GoogleSQLInsertBuilder';

	constructor(
		private table: TTable,
		private session: GoogleSQLSession,
		private dialect: GoogleSQLDialect,
		private withList?: Subquery[],
		private insertMode?: GoogleSQLInsertMode,
	) {}

	values(value: GoogleSQLInsertValue<TTable, OverrideT>): GoogleSQLInsertBase<TTable, TQueryResult>;
	values(values: GoogleSQLInsertValue<TTable, OverrideT>[]): GoogleSQLInsertBase<TTable, TQueryResult>;
	values(
		values: GoogleSQLInsertValue<TTable, OverrideT> | GoogleSQLInsertValue<TTable, OverrideT>[],
	): GoogleSQLInsertBase<TTable, TQueryResult> {
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

		return new GoogleSQLInsertBase(
			this.table,
			mappedValues,
			this.session,
			this.dialect,
			this.withList,
			false,
			false,
			this.insertMode,
		) as any;
	}

	select(
		selectQuery: (qb: QueryBuilder) => GoogleSQLInsertSelectQueryBuilder<TTable>,
	): GoogleSQLInsertBase<TTable, TQueryResult>;
	select(selectQuery: (qb: QueryBuilder) => SQL): GoogleSQLInsertBase<TTable, TQueryResult>;
	select(selectQuery: SQL): GoogleSQLInsertBase<TTable, TQueryResult>;
	select(selectQuery: GoogleSQLInsertSelectQueryBuilder<TTable>): GoogleSQLInsertBase<TTable, TQueryResult>;
	select(
		selectQuery:
			| SQL
			| GoogleSQLInsertSelectQueryBuilder<TTable>
			| ((qb: QueryBuilder) => GoogleSQLInsertSelectQueryBuilder<TTable> | SQL),
	): GoogleSQLInsertBase<TTable, TQueryResult> {
		const select = typeof selectQuery === 'function' ? selectQuery(new QueryBuilder()) : selectQuery;

		if (
			!is(select, SQL)
			&& !haveSameKeys(this.table[TableColumns], select._.selectedFields)
		) {
			throw new Error(
				'Insert select error: selected fields are not the same or are in a different order compared to the table definition',
			);
		}

		return new GoogleSQLInsertBase(this.table, select, this.session, this.dialect, this.withList, true, false, this.insertMode);
	}
}

export type GoogleSQLInsertWithout<
	T extends AnyGoogleSQLInsert,
	TDynamic extends boolean,
	K extends keyof T & string,
> = TDynamic extends true ? T
	: Omit<
		GoogleSQLInsertBase<
			T['_']['table'],
			T['_']['queryResult'],
			T['_']['selectedFields'],
			T['_']['returning'],
			TDynamic,
			T['_']['excludedMethods'] | K
		>,
		T['_']['excludedMethods'] | K
	>;

export type GoogleSQLInsertReturning<
	T extends AnyGoogleSQLInsert,
	TDynamic extends boolean,
	TSelectedFields extends SelectedFieldsFlat,
> = GoogleSQLInsertBase<
	T['_']['table'],
	T['_']['queryResult'],
	TSelectedFields,
	SelectResultFields<TSelectedFields>,
	TDynamic,
	T['_']['excludedMethods']
>;

export type GoogleSQLInsertReturningAll<T extends AnyGoogleSQLInsert, TDynamic extends boolean> = GoogleSQLInsertBase<
	T['_']['table'],
	T['_']['queryResult'],
	T['_']['table']['_']['columns'],
	T['_']['table']['$inferSelect'],
	TDynamic,
	T['_']['excludedMethods']
>;

export type GoogleSQLInsertPrepare<T extends AnyGoogleSQLInsert> = GoogleSQLPreparedQuery<
	PreparedQueryConfig & {
		execute: T['_']['returning'] extends undefined ? GoogleSQLQueryResultKind<T['_']['queryResult'], never>
			: T['_']['returning'][];
	}
>;

export type GoogleSQLInsertDynamic<T extends AnyGoogleSQLInsert> = GoogleSQLInsert<
	T['_']['table'],
	T['_']['queryResult'],
	T['_']['returning']
>;

export type AnyGoogleSQLInsert = GoogleSQLInsertBase<any, any, any, any, any, any>;

export type GoogleSQLInsert<
	TTable extends GoogleSQLTable = GoogleSQLTable,
	TQueryResult extends GoogleSQLQueryResultHKT = GoogleSQLQueryResultHKT,
	TSelectedFields extends ColumnsSelection | undefined = ColumnsSelection | undefined,
	TReturning extends Record<string, unknown> | undefined = Record<string, unknown> | undefined,
> = GoogleSQLInsertBase<TTable, TQueryResult, TSelectedFields, TReturning, true, never>;

export interface GoogleSQLInsertBase<
	TTable extends GoogleSQLTable,
	TQueryResult extends GoogleSQLQueryResultHKT,
	TSelectedFields extends ColumnsSelection | undefined = undefined,
	TReturning extends Record<string, unknown> | undefined = undefined,
	TDynamic extends boolean = false,
	TExcludedMethods extends string = never,
> extends
	TypedQueryBuilder<
		TSelectedFields,
		TReturning extends undefined ? GoogleSQLQueryResultKind<TQueryResult, never> : TReturning[]
	>,
	QueryPromise<TReturning extends undefined ? GoogleSQLQueryResultKind<TQueryResult, never> : TReturning[]>,
	RunnableQuery<
		TReturning extends undefined ? GoogleSQLQueryResultKind<TQueryResult, never> : TReturning[],
		'google-sql'
	>,
	SQLWrapper
{
	readonly _: {
		readonly dialect: 'google-sql';
		readonly table: TTable;
		readonly queryResult: TQueryResult;
		readonly selectedFields: TSelectedFields;
		readonly returning: TReturning;
		readonly dynamic: TDynamic;
		readonly excludedMethods: TExcludedMethods;
		readonly result: TReturning extends undefined ? GoogleSQLQueryResultKind<TQueryResult, never> : TReturning[];
	};
}

export class GoogleSQLInsertBase<
	TTable extends GoogleSQLTable,
	TQueryResult extends GoogleSQLQueryResultHKT,
	TSelectedFields extends ColumnsSelection | undefined = undefined,
	TReturning extends Record<string, unknown> | undefined = undefined,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	TDynamic extends boolean = false,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	TExcludedMethods extends string = never,
> extends QueryPromise<TReturning extends undefined ? GoogleSQLQueryResultKind<TQueryResult, never> : TReturning[]>
	implements
		TypedQueryBuilder<
			TSelectedFields,
			TReturning extends undefined ? GoogleSQLQueryResultKind<TQueryResult, never> : TReturning[]
		>,
		RunnableQuery<
			TReturning extends undefined ? GoogleSQLQueryResultKind<TQueryResult, never> : TReturning[],
			'google-sql'
		>,
		SQLWrapper
{
	static override readonly [entityKind]: string = 'GoogleSQLInsert';

	private config: GoogleSQLInsertConfig<TTable>;

	constructor(
		table: TTable,
		values: GoogleSQLInsertConfig['values'],
		private session: GoogleSQLSession,
		private dialect: GoogleSQLDialect,
		withList?: Subquery[],
		select?: boolean,
		withAction?: boolean,
		insertMode?: GoogleSQLInsertMode,
	) {
		super();
		this.config = { table, values: values as any, withList, select, withAction, insertMode };
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
	returning(): GoogleSQLInsertWithout<GoogleSQLInsertReturningAll<this, TDynamic>, TDynamic, 'returning'>;
	returning<TSelectedFields extends SelectedFieldsFlat>(
		fields: TSelectedFields,
	): GoogleSQLInsertWithout<GoogleSQLInsertReturning<this, TDynamic, TSelectedFields>, TDynamic, 'returning'>;
	returning(
		fields: SelectedFieldsFlat = this.config.table[Table.Symbol.Columns],
	): GoogleSQLInsertWithout<AnyGoogleSQLInsert, TDynamic, 'returning'> {
		this.config.returningFields = fields;
		this.config.returning = orderSelectedFields<GoogleSQLColumn>(fields);
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
	withAction(): GoogleSQLInsertWithout<this, TDynamic, 'withAction'> {
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
	_prepare(name?: string, generateName = false): GoogleSQLInsertPrepare<this> {
		return tracer.startActiveSpan('drizzle.prepareQuery', () => {
			const query = this.dialect.sqlToQuery(this.getSQL());
			return this.session.prepareQuery<
				PreparedQueryConfig & {
					execute: TReturning extends undefined ? GoogleSQLQueryResultKind<TQueryResult, never> : TReturning[];
				}
			>(
				query,
				this.config.returning,
				name ?? (generateName ? preparedStatementName(query.sql, query.params) : name),
				true,
			);
		});
	}

	prepare(name?: string): GoogleSQLInsertPrepare<this> {
		return this._prepare(name, true);
	}

	private authToken?: NeonAuthToken;
	/** @internal */
	setToken(token?: NeonAuthToken) {
		this.authToken = token;
		return this;
	}

	override execute: ReturnType<this['prepare']>['execute'] = (placeholderValues) => {
		return tracer.startActiveSpan('drizzle.operation', () => {
			return this._prepare().execute(placeholderValues, this.authToken);
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

	$dynamic(): GoogleSQLInsertDynamic<this> {
		return this as any;
	}
}
