import type { GoogleSqlDialect } from '~/google-sql-core/dialect.ts';
import type {
	GoogleSqlPreparedQuery,
	GoogleSqlQueryResultHKT,
	GoogleSqlQueryResultKind,
	GoogleSqlSession,
	PreparedQueryConfig,
} from '~/google-sql-core/session.ts';
import type { GoogleSqlTable } from '~/google-sql-core/table.ts';
import type { GetColumnData } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import type { TypedQueryBuilder } from '~/query-builders/query-builder.ts';
import type {
	GetSelectTableSelection,
	JoinNullability,
} from '~/query-builders/select.types.ts';
import { preparedStatementName } from '~/query-name-generator.ts';
import { QueryPromise } from '~/query-promise.ts';
import type { RunnableQuery } from '~/runnable-query.ts';
import { SelectionProxyHandler } from '~/selection-proxy.ts';
import type { ColumnsSelection, Placeholder, Query, SQL, SQLWrapper } from '~/sql/sql.ts';
import type { Subquery } from '~/subquery.ts';
import { getTableName, type InferInsertModel, Table } from '~/table.ts';
import {
	getTableLikeName,
	mapUpdateSet,
	orderSelectedFields,
	type UpdateSet,
} from '~/utils.ts';
import type { GoogleSqlColumn } from '../columns/common.ts';
import type {
	SelectedFields,
	SelectedFieldsOrdered,
} from './select.types.ts';

export interface GoogleSqlUpdateConfig {
	where?: SQL | undefined;
	set: UpdateSet;
	table: GoogleSqlTable;
	returningFields?: SelectedFields;
	returning?: SelectedFieldsOrdered;
	withAction?: boolean;
}

export type GoogleSqlUpdateSetSource<TTable extends GoogleSqlTable> =
	& {
		[Key in keyof InferInsertModel<TTable>]?:
			| GetColumnData<TTable['_']['columns'][Key]>
			| SQL
			| GoogleSqlColumn
			| Placeholder
			| undefined;
	}
	& {};

export class GoogleSqlUpdateBuilder<TTable extends GoogleSqlTable, TQueryResult extends GoogleSqlQueryResultHKT> {
	static readonly [entityKind]: string = 'GoogleSqlUpdateBuilder';

	declare readonly _: {
		readonly table: TTable;
	};

	constructor(
		private table: TTable,
		private session: GoogleSqlSession,
		private dialect: GoogleSqlDialect,
	) {}

	set(values: GoogleSqlUpdateSetSource<TTable>): GoogleSqlUpdateBase<TTable, TQueryResult> {
		return new GoogleSqlUpdateBase<TTable, TQueryResult>(
			this.table,
			mapUpdateSet(this.table, values),
			this.session,
			this.dialect,
		);
	}
}

export type GoogleSqlUpdateWithout<
	T extends AnyGoogleSqlUpdate,
	TDynamic extends boolean,
	K extends keyof T & string,
> = TDynamic extends true ? T : Omit<
	GoogleSqlUpdateBase<
		T['_']['table'],
		T['_']['queryResult'],
		T['_']['selectedFields'],
		T['_']['returning'],
		T['_']['nullabilityMap'],
		TDynamic,
		T['_']['excludedMethods'] | K
	>,
	T['_']['excludedMethods'] | K
>;

export type GoogleSqlUpdateReturningAll<T extends AnyGoogleSqlUpdate, TDynamic extends boolean> =
	GoogleSqlUpdateWithout<
		GoogleSqlUpdateBase<
			T['_']['table'],
			T['_']['queryResult'],
			T['_']['table']['_']['columns'],
			GetSelectTableSelection<T['_']['table']>,
			T['_']['nullabilityMap'],
			TDynamic,
			T['_']['excludedMethods']
		>,
		TDynamic,
		'returning'
	>;

export type GoogleSqlUpdateReturning<
	T extends AnyGoogleSqlUpdate,
	TDynamic extends boolean,
	TSelectedFields extends SelectedFields,
> = GoogleSqlUpdateWithout<
	GoogleSqlUpdateBase<
		T['_']['table'],
		T['_']['queryResult'],
		TSelectedFields,
		TSelectedFields,
		T['_']['nullabilityMap'],
		TDynamic,
		T['_']['excludedMethods']
	>,
	TDynamic,
	'returning'
>;

export type GoogleSqlUpdatePrepare<T extends AnyGoogleSqlUpdate> = GoogleSqlPreparedQuery<
	PreparedQueryConfig & {
		execute: T['_']['returning'] extends undefined ? GoogleSqlQueryResultKind<T['_']['queryResult'], never>
			: T['_']['returning'][];
	}
>;

export type GoogleSqlUpdateDynamic<T extends AnyGoogleSqlUpdate> = GoogleSqlUpdate<
	T['_']['table'],
	T['_']['queryResult'],
	T['_']['returning']
>;

export type GoogleSqlUpdate<
	TTable extends GoogleSqlTable = GoogleSqlTable,
	TQueryResult extends GoogleSqlQueryResultHKT = GoogleSqlQueryResultHKT,
	TSelectedFields extends ColumnsSelection | undefined = undefined,
	TReturning extends Record<string, unknown> | undefined = Record<string, unknown> | undefined,
	TNullabilityMap extends Record<string, JoinNullability> = Record<TTable['_']['name'], 'not-null'>,
> = GoogleSqlUpdateBase<
	TTable,
	TQueryResult,
	TSelectedFields,
	TReturning,
	TNullabilityMap,
	true,
	never
>;

export type AnyGoogleSqlUpdate = GoogleSqlUpdateBase<any, any, any, any, any, any, any>;

export interface GoogleSqlUpdateBase<
	TTable extends GoogleSqlTable,
	TQueryResult extends GoogleSqlQueryResultHKT,
	TSelectedFields extends ColumnsSelection | undefined = undefined,
	TReturning extends Record<string, unknown> | undefined = undefined,
	TNullabilityMap extends Record<string, JoinNullability> = Record<TTable['_']['name'], 'not-null'>,
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
		readonly nullabilityMap: TNullabilityMap;
		readonly queryResult: TQueryResult;
		readonly selectedFields: TSelectedFields;
		readonly returning: TReturning;
		readonly dynamic: TDynamic;
		readonly excludedMethods: TExcludedMethods;
		readonly result: TReturning extends undefined ? GoogleSqlQueryResultKind<TQueryResult, never> : TReturning[];
	};
}

export class GoogleSqlUpdateBase<
	TTable extends GoogleSqlTable,
	TQueryResult extends GoogleSqlQueryResultHKT,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	TSelectedFields extends ColumnsSelection | undefined = undefined,
	TReturning extends Record<string, unknown> | undefined = undefined,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	TNullabilityMap extends Record<string, JoinNullability> = Record<TTable['_']['name'], 'not-null'>,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	TDynamic extends boolean = false,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	TExcludedMethods extends string = never,
> extends QueryPromise<TReturning extends undefined ? GoogleSqlQueryResultKind<TQueryResult, never> : TReturning[]>
	implements
		RunnableQuery<
			TReturning extends undefined ? GoogleSqlQueryResultKind<TQueryResult, never> : TReturning[],
			'googlesql'
		>,
		SQLWrapper
{
	static override readonly [entityKind]: string = 'GoogleSqlUpdate';

	private config: GoogleSqlUpdateConfig;
	private tableName: string | undefined;

	constructor(
		table: TTable,
		set: UpdateSet,
		private session: GoogleSqlSession,
		private dialect: GoogleSqlDialect,
		withAction?: boolean,
	) {
		super();
		this.config = { set, table, withAction };
		this.tableName = getTableLikeName(table);
	}

	/**
	 * Adds a 'where' clause to the query.
	 *
	 * Calling this method will update only those rows that fulfill a specified condition.
	 *
	 * See docs: {@link https://orm.drizzle.team/docs/update}
	 *
	 * @param where the 'where' clause.
	 *
	 * @example
	 * You can use conditional operators and `sql function` to filter the rows to be updated.
	 *
	 * ```ts
	 * // Update all cars with green color
	 * await db.update(cars).set({ color: 'red' })
	 *   .where(eq(cars.color, 'green'));
	 * // or
	 * await db.update(cars).set({ color: 'red' })
	 *   .where(sql`${cars.color} = 'green'`)
	 * ```
	 *
	 * You can logically combine conditional operators with `and()` and `or()` operators:
	 *
	 * ```ts
	 * // Update all BMW cars with a green color
	 * await db.update(cars).set({ color: 'red' })
	 *   .where(and(eq(cars.color, 'green'), eq(cars.brand, 'BMW')));
	 *
	 * // Update all cars with the green or blue color
	 * await db.update(cars).set({ color: 'red' })
	 *   .where(or(eq(cars.color, 'green'), eq(cars.color, 'blue')));
	 * ```
	 */
	where(where: SQL | undefined): GoogleSqlUpdateWithout<this, TDynamic, 'where'> {
		this.config.where = where;
		return this as any;
	}

	/**
	 * Adds a `returning` clause to the query.
	 *
	 * Calling this method will return the specified fields of the updated rows. If no fields are specified, all fields will be returned.
	 *
	 * See docs: {@link https://orm.drizzle.team/docs/update#update-with-returning}
	 *
	 * @example
	 * ```ts
	 * // Update all cars with the green color and return all fields
	 * const updatedCars: Car[] = await db.update(cars)
	 *   .set({ color: 'red' })
	 *   .where(eq(cars.color, 'green'))
	 *   .returning();
	 *
	 * // Update all cars with the green color and return only their id and brand fields
	 * const updatedCarsIdsAndBrands: { id: number, brand: string }[] = await db.update(cars)
	 *   .set({ color: 'red' })
	 *   .where(eq(cars.color, 'green'))
	 *   .returning({ id: cars.id, brand: cars.brand });
	 * ```
	 */
	returning(): GoogleSqlUpdateReturningAll<this, TDynamic>;
	returning<TSelectedFields extends SelectedFields>(
		fields: TSelectedFields,
	): GoogleSqlUpdateReturning<this, TDynamic, TSelectedFields>;
	returning(
		fields?: SelectedFields,
	): GoogleSqlUpdateWithout<AnyGoogleSqlUpdate, TDynamic, 'returning'> {
		if (!fields) {
			fields = Object.assign({}, this.config.table[Table.Symbol.Columns]);
		}

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
	 * const result = await db.delete(cars)
	 *   .returning()
	 *   .withAction();
	 * ```
	 */
	withAction(): GoogleSqlUpdateWithout<this, TDynamic, 'withAction'> {
		this.config.withAction = true;
		return this as any;
	}

	/** @internal */
	getSQL(): SQL {
		return this.dialect.buildUpdateQuery(this.config);
	}

	toSQL(): Query {
		const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
		return rest;
	}

	/** @internal */
	_prepare(name?: string, generateName = false): GoogleSqlUpdatePrepare<this> {
		const query = this.dialect.sqlToQuery(this.getSQL());
		const preparedQuery = this.session.prepareQuery<
			PreparedQueryConfig & { execute: TReturning[] }
		>(
			query,
			this.config.returning,
			name ?? (generateName ? preparedStatementName(query.sql, query.params) : name),
			true,
		);
		return preparedQuery;
	}

	prepare(name?: string): GoogleSqlUpdatePrepare<this> {
		return this._prepare(name, true);
	}

	override execute: ReturnType<this['prepare']>['execute'] = (placeholderValues) => {
		return this._prepare().execute(placeholderValues);
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

	$dynamic(): GoogleSqlUpdateDynamic<this> {
		return this as any;
	}
}
