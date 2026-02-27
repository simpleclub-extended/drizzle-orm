import type { GoogleSQLDialect } from '~/google-sql-core/dialect.ts';
import type {
	GoogleSQLPreparedQuery,
	GoogleSQLQueryResultHKT,
	GoogleSQLQueryResultKind,
	GoogleSQLSession,
	PreparedQueryConfig,
} from '~/google-sql-core/session.ts';
import type { GoogleSQLTable } from '~/google-sql-core/table.ts';
import { entityKind } from '~/entity.ts';
import type { TypedQueryBuilder } from '~/query-builders/query-builder.ts';
import type { SelectResultFields } from '~/query-builders/select.types.ts';
import { preparedStatementName } from '~/query-name-generator.ts';
import { QueryPromise } from '~/query-promise.ts';
import type { RunnableQuery } from '~/runnable-query.ts';
import { SelectionProxyHandler } from '~/selection-proxy.ts';
import type { ColumnsSelection, Query, SQL, SQLWrapper } from '~/sql/sql.ts';
import type { Subquery } from '~/subquery.ts';
import { getTableName, Table } from '~/table.ts';
import { tracer } from '~/tracing.ts';
import { orderSelectedFields } from '~/utils.ts';
import type { GoogleSQLColumn } from '../columns/common.ts';
import type { SelectedFieldsFlat, SelectedFieldsOrdered } from './select.types.ts';

export type GoogleSQLDeleteWithout<
	T extends AnyGoogleSQLDeleteBase,
	TDynamic extends boolean,
	K extends keyof T & string,
> = TDynamic extends true ? T
	: Omit<
		GoogleSQLDeleteBase<
			T['_']['table'],
			T['_']['queryResult'],
			T['_']['selectedFields'],
			T['_']['returning'],
			TDynamic,
			T['_']['excludedMethods'] | K
		>,
		T['_']['excludedMethods'] | K
	>;

export type GoogleSQLDelete<
	TTable extends GoogleSQLTable = GoogleSQLTable,
	TQueryResult extends GoogleSQLQueryResultHKT = GoogleSQLQueryResultHKT,
	TSelectedFields extends ColumnsSelection | undefined = undefined,
	TReturning extends Record<string, unknown> | undefined = Record<string, unknown> | undefined,
> = GoogleSQLDeleteBase<TTable, TQueryResult, TSelectedFields, TReturning, true, never>;

export interface GoogleSQLDeleteConfig {
	where?: SQL | undefined;
	table: GoogleSQLTable;
	returningFields?: SelectedFieldsFlat;
	returning?: SelectedFieldsOrdered;
	withList?: Subquery[];
}

export type GoogleSQLDeleteReturningAll<
	T extends AnyGoogleSQLDeleteBase,
	TDynamic extends boolean,
> = GoogleSQLDeleteWithout<
	GoogleSQLDeleteBase<
		T['_']['table'],
		T['_']['queryResult'],
		T['_']['table']['_']['columns'],
		T['_']['table']['$inferSelect'],
		TDynamic,
		T['_']['excludedMethods']
	>,
	TDynamic,
	'returning'
>;

export type GoogleSQLDeleteReturning<
	T extends AnyGoogleSQLDeleteBase,
	TDynamic extends boolean,
	TSelectedFields extends SelectedFieldsFlat,
> = GoogleSQLDeleteWithout<
	GoogleSQLDeleteBase<
		T['_']['table'],
		T['_']['queryResult'],
		TSelectedFields,
		SelectResultFields<TSelectedFields>,
		TDynamic,
		T['_']['excludedMethods']
	>,
	TDynamic,
	'returning'
>;

export type GoogleSQLDeletePrepare<T extends AnyGoogleSQLDeleteBase> = GoogleSQLPreparedQuery<
	PreparedQueryConfig & {
		execute: T['_']['returning'] extends undefined ? GoogleSQLQueryResultKind<T['_']['queryResult'], never>
			: T['_']['returning'][];
	}
>;

export type GoogleSQLDeleteDynamic<T extends AnyGoogleSQLDeleteBase> = GoogleSQLDelete<
	T['_']['table'],
	T['_']['queryResult'],
	T['_']['selectedFields'],
	T['_']['returning']
>;

export type AnyGoogleSQLDeleteBase = GoogleSQLDeleteBase<any, any, any, any, any, any>;

export interface GoogleSQLDeleteBase<
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

export class GoogleSQLDeleteBase<
	TTable extends GoogleSQLTable,
	TQueryResult extends GoogleSQLQueryResultHKT,
	TSelectedFields extends ColumnsSelection | undefined = undefined,
	TReturning extends Record<string, unknown> | undefined = undefined,
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
	static override readonly [entityKind]: string = 'GoogleSQLDelete';

	private config: GoogleSQLDeleteConfig;

	constructor(
		table: TTable,
		private session: GoogleSQLSession,
		private dialect: GoogleSQLDialect,
		withList?: Subquery[],
	) {
		super();
		this.config = { table, withList };
	}

	/**
	 * Adds a `where` clause to the query.
	 *
	 * Calling this method will delete only those rows that fulfill a specified condition.
	 *
	 * See docs: {@link https://orm.drizzle.team/docs/delete}
	 *
	 * @param where the `where` clause.
	 *
	 * @example
	 * You can use conditional operators and `sql function` to filter the rows to be deleted.
	 *
	 * ```ts
	 * // Delete all cars with green color
	 * await db.delete(cars).where(eq(cars.color, 'green'));
	 * // or
	 * await db.delete(cars).where(sql`${cars.color} = 'green'`)
	 * ```
	 *
	 * You can logically combine conditional operators with `and()` and `or()` operators:
	 *
	 * ```ts
	 * // Delete all BMW cars with a green color
	 * await db.delete(cars).where(and(eq(cars.color, 'green'), eq(cars.brand, 'BMW')));
	 *
	 * // Delete all cars with the green or blue color
	 * await db.delete(cars).where(or(eq(cars.color, 'green'), eq(cars.color, 'blue')));
	 * ```
	 */
	where(where: SQL | undefined): GoogleSQLDeleteWithout<this, TDynamic, 'where'> {
		this.config.where = where;
		return this as any;
	}

	/**
	 * Adds a `THEN RETURN` clause to the query.
	 *
	 * Calling this method will return the specified fields of the deleted rows. If no fields are specified, all fields will be returned.
	 *
	 * See docs: {@link https://orm.drizzle.team/docs/delete#delete-with-return}
	 *
	 * @example
	 * ```ts
	 * // Delete all cars with the green color and return all fields
	 * const deletedCars: Car[] = await db.delete(cars)
	 *   .where(eq(cars.color, 'green'))
	 *   .returning();
	 *
	 * // Delete all cars with the green color and return only their id and brand fields
	 * const deletedCarsIdsAndBrands: { id: number, brand: string }[] = await db.delete(cars)
	 *   .where(eq(cars.color, 'green'))
	 *   .returning({ id: cars.id, brand: cars.brand });
	 * ```
	 */
	returning(): GoogleSQLDeleteReturningAll<this, TDynamic>;
	returning<TSelectedFields extends SelectedFieldsFlat>(
		fields: TSelectedFields,
	): GoogleSQLDeleteReturning<this, TDynamic, TSelectedFields>;
	returning(
		fields: SelectedFieldsFlat = this.config.table[Table.Symbol.Columns],
	): GoogleSQLDeleteReturning<this, TDynamic, any> | GoogleSQLDeleteReturningAll<this, TDynamic> {
		this.config.returningFields = fields;
		this.config.returning = orderSelectedFields<GoogleSQLColumn>(fields);
		return this as any;
	}

	/** @internal */
	getSQL(): SQL {
		return this.dialect.buildDeleteQuery(this.config);
	}

	toSQL(): Query {
		const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
		return rest;
	}

	/** @internal */
	_prepare(name?: string, generateName = false): GoogleSQLDeletePrepare<this> {
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

	prepare(name?: string): GoogleSQLDeletePrepare<this> {
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

	$dynamic(): GoogleSQLDeleteDynamic<this> {
		return this as any;
	}
}
