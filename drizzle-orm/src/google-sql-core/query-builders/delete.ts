import type { GoogleSqlDialect } from '~/google-sql-core/dialect.ts';
import type {
	GoogleSqlPreparedQuery,
	GoogleSqlQueryResultHKT,
	GoogleSqlQueryResultKind,
	GoogleSqlSession,
	PreparedQueryConfig,
} from '~/google-sql-core/session.ts';
import type { GoogleSqlTable } from '~/google-sql-core/table.ts';
import { entityKind } from '~/entity.ts';
import type { TypedQueryBuilder } from '~/query-builders/query-builder.ts';
import type { SelectResultFields } from '~/query-builders/select.types.ts';
import { preparedStatementName } from '~/query-name-generator.ts';
import { QueryPromise } from '~/query-promise.ts';
import type { RunnableQuery } from '~/runnable-query.ts';
import { SelectionProxyHandler } from '~/selection-proxy.ts';
import type { ColumnsSelection, Query, SQL, SQLWrapper } from '~/sql/sql.ts';
import { getTableName, Table } from '~/table.ts';
import { tracer } from '~/tracing.ts';
import { orderSelectedFields } from '~/utils.ts';
import type { GoogleSqlColumn } from '../columns/common.ts';
import type { SelectedFieldsFlat, SelectedFieldsOrdered } from './select.types.ts';
import {GoogleSqlInsertWithout} from "./insert";

export type GoogleSqlDeleteWithout<
	T extends AnyGoogleSqlDeleteBase,
	TDynamic extends boolean,
	K extends keyof T & string,
> = TDynamic extends true ? T
	: Omit<
		GoogleSqlDeleteBase<
			T['_']['table'],
			T['_']['queryResult'],
			T['_']['selectedFields'],
			T['_']['returning'],
			TDynamic,
			T['_']['excludedMethods'] | K
		>,
		T['_']['excludedMethods'] | K
	>;

export type GoogleSqlDelete<
	TTable extends GoogleSqlTable = GoogleSqlTable,
	TQueryResult extends GoogleSqlQueryResultHKT = GoogleSqlQueryResultHKT,
	TSelectedFields extends ColumnsSelection | undefined = undefined,
	TReturning extends Record<string, unknown> | undefined = Record<string, unknown> | undefined,
> = GoogleSqlDeleteBase<TTable, TQueryResult, TSelectedFields, TReturning, true, never>;

export interface GoogleSqlDeleteConfig {
	where?: SQL | undefined;
	table: GoogleSqlTable;
	returningFields?: SelectedFieldsFlat;
	returning?: SelectedFieldsOrdered;
	withAction?: boolean;
}

export type GoogleSqlDeleteReturningAll<
	T extends AnyGoogleSqlDeleteBase,
	TDynamic extends boolean,
> = GoogleSqlDeleteWithout<
	GoogleSqlDeleteBase<
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

export type GoogleSqlDeleteReturning<
	T extends AnyGoogleSqlDeleteBase,
	TDynamic extends boolean,
	TSelectedFields extends SelectedFieldsFlat,
> = GoogleSqlDeleteWithout<
	GoogleSqlDeleteBase<
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

export type GoogleSqlDeletePrepare<T extends AnyGoogleSqlDeleteBase> = GoogleSqlPreparedQuery<
	PreparedQueryConfig & {
		execute: T['_']['returning'] extends undefined ? GoogleSqlQueryResultKind<T['_']['queryResult'], never>
			: T['_']['returning'][];
	}
>;

export type GoogleSqlDeleteDynamic<T extends AnyGoogleSqlDeleteBase> = GoogleSqlDelete<
	T['_']['table'],
	T['_']['queryResult'],
	T['_']['selectedFields'],
	T['_']['returning']
>;

export type AnyGoogleSqlDeleteBase = GoogleSqlDeleteBase<any, any, any, any, any, any>;

export interface GoogleSqlDeleteBase<
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

export class GoogleSqlDeleteBase<
	TTable extends GoogleSqlTable,
	TQueryResult extends GoogleSqlQueryResultHKT,
	TSelectedFields extends ColumnsSelection | undefined = undefined,
	TReturning extends Record<string, unknown> | undefined = undefined,
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
	static override readonly [entityKind]: string = 'GoogleSqlDelete';

	private config: GoogleSqlDeleteConfig;

	constructor(
		table: TTable,
		private session: GoogleSqlSession,
		private dialect: GoogleSqlDialect,
		withAction?: boolean,
	) {
		super();
		this.config = { table, withAction };
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
	where(where: SQL | undefined): GoogleSqlDeleteWithout<this, TDynamic, 'where'> {
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
	returning(): GoogleSqlDeleteReturningAll<this, TDynamic>;
	returning<TSelectedFields extends SelectedFieldsFlat>(
		fields: TSelectedFields,
	): GoogleSqlDeleteReturning<this, TDynamic, TSelectedFields>;
	returning(
		fields: SelectedFieldsFlat = this.config.table[Table.Symbol.Columns],
	): GoogleSqlDeleteReturning<this, TDynamic, any> | GoogleSqlDeleteReturningAll<this, TDynamic> {
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
	withAction(): GoogleSqlDeleteWithout<this, TDynamic, 'withAction'> {
		this.config.withAction = true;
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
	_prepare(name?: string, generateName = false): GoogleSqlDeletePrepare<this> {
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

	prepare(name?: string): GoogleSqlDeletePrepare<this> {
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

	$dynamic(): GoogleSqlDeleteDynamic<this> {
		return this as any;
	}
}
