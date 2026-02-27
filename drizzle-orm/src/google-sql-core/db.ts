import type * as V1 from '~/_relations.ts';
import type { GoogleSQLDialect } from '~/google-sql-core/dialect.ts';
import {
	GoogleSQLDeleteBase,
	GoogleSQLInsertBuilder,
	GoogleSQLSelectBuilder,
	GoogleSQLUpdateBuilder,
	QueryBuilder,
} from '~/google-sql-core/query-builders/index.ts';
import type {
	GoogleSQLQueryResultHKT,
	GoogleSQLQueryResultKind,
	GoogleSQLSession,
	GoogleSQLTransaction,
	GoogleSQLTransactionConfig,
	PreparedQueryConfig,
} from '~/google-sql-core/session.ts';
import type { GoogleSQLTable } from '~/google-sql-core/table.ts';
import { entityKind } from '~/entity.ts';
import type { TypedQueryBuilder } from '~/query-builders/query-builder.ts';
import { SelectionProxyHandler } from '~/selection-proxy.ts';
import { type ColumnsSelection, type SQL, sql, type SQLWrapper } from '~/sql/sql.ts';
import { WithSubquery } from '~/subquery.ts';
import type { DrizzleTypeError } from '~/utils.ts';
import { GoogleSQLCountBuilder } from './query-builders/count.ts';
import { RelationalQueryBuilder } from './query-builders/query.ts';
import { GoogleSQLRaw } from './query-builders/raw.ts';
import type { SelectedFields } from './query-builders/select.types.ts';
import type { WithBuilder } from './subquery.ts';
import type { GoogleSQLViewBase } from './view-base.ts';

export class GoogleSQLDatabase<
	TQueryResult extends GoogleSQLQueryResultHKT,
	TFullSchema extends Record<string, unknown> = Record<string, never>,
	TSchema extends V1.TablesRelationalConfig = V1.ExtractTablesWithRelations<TFullSchema>,
> {
	static readonly [entityKind]: string = 'GoogleSQLDatabase';

	declare readonly _: {
		readonly schema: TSchema | undefined;
		readonly fullSchema: TFullSchema;
		readonly tableNamesMap: Record<string, string>;
		readonly session: GoogleSQLSession<TQueryResult, TFullSchema, TSchema>;
	};

	_query: TFullSchema extends Record<string, never>
		? DrizzleTypeError<'Seems like the schema generic is missing - did you forget to add it to your DB type?'>
		: {
			[K in keyof TSchema]: RelationalQueryBuilder<TSchema, TSchema[K]>;
		};

	constructor(
		/** @internal */
		readonly dialect: GoogleSQLDialect,
		/** @internal */
		readonly session: GoogleSQLSession<any, any, any>,
		schema: V1.RelationalSchemaConfig<TSchema> | undefined,
	) {
		this._ = schema
			? {
				schema: schema.schema,
				fullSchema: schema.fullSchema as TFullSchema,
				tableNamesMap: schema.tableNamesMap,
				session,
			}
			: {
				schema: undefined,
				fullSchema: {} as TFullSchema,
				tableNamesMap: {},
				session,
			};
		this._query = {} as typeof this['_query'];
		if (this._.schema) {
			for (const [tableName, columns] of Object.entries(this._.schema)) {
				(this._query as GoogleSQLDatabase<TQueryResult, Record<string, any>>['_query'])[tableName] =
					new RelationalQueryBuilder(
						schema!.fullSchema,
						this._.schema,
						this._.tableNamesMap,
						schema!.fullSchema[tableName] as GoogleSQLTable,
						columns,
						dialect,
						session,
					);
			}
		}
	}

	/**
	 * Creates a subquery that defines a temporary named result set as a CTE.
	 *
	 * It is useful for breaking down complex queries into simpler parts and for reusing the result set in subsequent parts of the query.
	 *
	 * See docs: {@link https://orm.drizzle.team/docs/select#with-clause}
	 *
	 * @param alias The alias for the subquery.
	 *
	 * Failure to provide an alias will result in a DrizzleTypeError, preventing the subquery from being referenced in other queries.
	 *
	 * @example
	 *
	 * ```ts
	 * // Create a subquery with alias 'sq' and use it in the select query
	 * const sq = db.$with('sq').as(db.select().from(users).where(eq(users.id, 42)));
	 *
	 * const result = await db.with(sq).select().from(sq);
	 * ```
	 *
	 * To select arbitrary SQL values as fields in a CTE and reference them in other CTEs or in the main query, you need to add aliases to them:
	 *
	 * ```ts
	 * // Select an arbitrary SQL value as a field in a CTE and reference it in the main query
	 * const sq = db.$with('sq').as(db.select({
	 *   name: sql<string>`upper(${users.name})`.as('name'),
	 * })
	 * .from(users));
	 *
	 * const result = await db.with(sq).select({ name: sq.name }).from(sq);
	 * ```
	 */
	$with: WithBuilder = (alias: string, selection?: ColumnsSelection) => {
		const self = this;
		const as = (
			qb:
				| TypedQueryBuilder<ColumnsSelection | undefined>
				| SQL
				| ((qb: QueryBuilder) => TypedQueryBuilder<ColumnsSelection | undefined> | SQL),
		) => {
			if (typeof qb === 'function') {
				qb = qb(new QueryBuilder(self.dialect));
			}

			return new Proxy(
				new WithSubquery(
					qb.getSQL(),
					selection ?? ('getSelectedFields' in qb ? qb.getSelectedFields() ?? {} : {}) as SelectedFields,
					alias,
					true,
				),
				new SelectionProxyHandler({ alias, sqlAliasedBehavior: 'alias', sqlBehavior: 'error' }),
			);
		};
		return { as };
	};

	$count(
		source: GoogleSQLTable | GoogleSQLViewBase | SQL | SQLWrapper,
		filters?: SQL<unknown>,
	) {
		return new GoogleSQLCountBuilder({ source, filters, session: this.session });
	}

	/**
	 * Incorporates a previously defined CTE (using `$with`) into the main query.
	 *
	 * This method allows the main query to reference a temporary named result set.
	 *
	 * See docs: {@link https://orm.drizzle.team/docs/select#with-clause}
	 *
	 * @param queries The CTEs to incorporate into the main query.
	 *
	 * @example
	 *
	 * ```ts
	 * // Define a subquery 'sq' as a CTE using $with
	 * const sq = db.$with('sq').as(db.select().from(users).where(eq(users.id, 42)));
	 *
	 * // Incorporate the CTE 'sq' into the main query and select from it
	 * const result = await db.with(sq).select().from(sq);
	 * ```
	 */
	with(...queries: WithSubquery[]) {
		const self = this;

		/**
		 * Creates a select query.
		 *
		 * Calling this method with no arguments will select all columns from the table. Pass a selection object to specify the columns you want to select.
		 *
		 * Use `.from()` method to specify which table to select from.
		 *
		 * See docs: {@link https://orm.drizzle.team/docs/select}
		 *
		 * @param fields The selection object.
		 *
		 * @example
		 *
		 * ```ts
		 * // Select all columns and all rows from the 'cars' table
		 * const allCars: Car[] = await db.select().from(cars);
		 *
		 * // Select specific columns and all rows from the 'cars' table
		 * const carsIdsAndBrands: { id: number; brand: string }[] = await db.select({
		 *   id: cars.id,
		 *   brand: cars.brand
		 * })
		 *   .from(cars);
		 * ```
		 *
		 * Like in SQL, you can use arbitrary expressions as selection fields, not just table columns:
		 *
		 * ```ts
		 * // Select specific columns along with expression and all rows from the 'cars' table
		 * const carsIdsAndLowerNames: { id: number; lowerBrand: string }[] = await db.select({
		 *   id: cars.id,
		 *   lowerBrand: sql<string>`lower(${cars.brand})`,
		 * })
		 *   .from(cars);
		 * ```
		 */
		function select(): GoogleSQLSelectBuilder<undefined>;
		function select<TSelection extends SelectedFields>(fields: TSelection): GoogleSQLSelectBuilder<TSelection>;
		function select<TSelection extends SelectedFields>(
			fields?: TSelection,
		): GoogleSQLSelectBuilder<TSelection | undefined> {
			return new GoogleSQLSelectBuilder({
				fields: fields ?? undefined,
				session: self.session,
				dialect: self.dialect,
				withList: queries,
			});
		}

		/**
		 * Adds `distinct` expression to the select query.
		 *
		 * Calling this method will return only unique values. When multiple columns are selected, it returns rows with unique combinations of values in these columns.
		 *
		 * Use `.from()` method to specify which table to select from.
		 *
		 * See docs: {@link https://orm.drizzle.team/docs/select#distinct}
		 *
		 * @param fields The selection object.
		 *
		 * @example
		 * ```ts
		 * // Select all unique rows from the 'cars' table
		 * await db.selectDistinct()
		 *   .from(cars)
		 *   .orderBy(cars.id, cars.brand, cars.color);
		 *
		 * // Select all unique brands from the 'cars' table
		 * await db.selectDistinct({ brand: cars.brand })
		 *   .from(cars)
		 *   .orderBy(cars.brand);
		 * ```
		 */
		function selectDistinct(): GoogleSQLSelectBuilder<undefined>;
		function selectDistinct<TSelection extends SelectedFields>(
			fields: TSelection,
		): GoogleSQLSelectBuilder<TSelection>;
		function selectDistinct<TSelection extends SelectedFields>(
			fields?: TSelection,
		): GoogleSQLSelectBuilder<TSelection | undefined> {
			return new GoogleSQLSelectBuilder({
				fields: fields ?? undefined,
				session: self.session,
				dialect: self.dialect,
				withList: queries,
				distinct: true,
			});
		}

		// todo: Verify if Spanner doesn't support select distinct on.

		/**
		 * Creates an update query.
		 *
		 * Calling this method without `.where()` clause will update all rows in a table. The `.where()` clause specifies which rows should be updated.
		 *
		 * Use `.set()` method to specify which values to update.
		 *
		 * See docs: {@link https://orm.drizzle.team/docs/update}
		 *
		 * @param table The table to update.
		 *
		 * @example
		 *
		 * ```ts
		 * // Update all rows in the 'cars' table
		 * await db.update(cars).set({ color: 'red' });
		 *
		 * // Update rows with filters and conditions
		 * await db.update(cars).set({ color: 'red' }).where(eq(cars.brand, 'BMW'));
		 *
		 * // Update with returning clause
		 * const updatedCar: Car[] = await db.update(cars)
		 *   .set({ color: 'red' })
		 *   .where(eq(cars.id, 1))
		 *   .returning();
		 * ```
		 */
		function update<TTable extends GoogleSQLTable>(table: TTable): GoogleSQLUpdateBuilder<TTable, TQueryResult> {
			return new GoogleSQLUpdateBuilder(table, self.session, self.dialect, queries);
		}

		/**
		 * Creates an insert query.
		 *
		 * Calling this method will create new rows in a table. Use `.values()` method to specify which values to insert.
		 *
		 * See docs: {@link https://orm.drizzle.team/docs/insert}
		 *
		 * @param table The table to insert into.
		 *
		 * @example
		 *
		 * ```ts
		 * // Insert one row
		 * await db.insert(cars).values({ brand: 'BMW' });
		 *
		 * // Insert multiple rows
		 * await db.insert(cars).values([{ brand: 'BMW' }, { brand: 'Porsche' }]);
		 *
		 * // Insert with returning clause
		 * const insertedCar: Car[] = await db.insert(cars)
		 *   .values({ brand: 'BMW' })
		 *   .returning();
		 * ```
		 */
		function insert<TTable extends GoogleSQLTable>(table: TTable): GoogleSQLInsertBuilder<TTable, TQueryResult> {
			return new GoogleSQLInsertBuilder(table, self.session, self.dialect, queries);
		}

		/**
		 * Creates a delete query.
		 *
		 * Calling this method without `.where()` clause will delete all rows in a table. The `.where()` clause specifies which rows should be deleted.
		 *
		 * See docs: {@link https://orm.drizzle.team/docs/delete}
		 *
		 * @param table The table to delete from.
		 *
		 * @example
		 *
		 * ```ts
		 * // Delete all rows in the 'cars' table
		 * await db.delete(cars);
		 *
		 * // Delete rows with filters and conditions
		 * await db.delete(cars).where(eq(cars.color, 'green'));
		 *
		 * // Delete with returning clause
		 * const deletedCar: Car[] = await db.delete(cars)
		 *   .where(eq(cars.id, 1))
		 *   .returning();
		 * ```
		 */
		function delete_<TTable extends GoogleSQLTable>(table: TTable): GoogleSQLDeleteBase<TTable, TQueryResult> {
			return new GoogleSQLDeleteBase(table, self.session, self.dialect, queries);
		}

		return { select, selectDistinct, update, insert, delete: delete_ };
	}
	/**
	 * Creates a select query.
	 *
	 * Calling this method with no arguments will select all columns from the table. Pass a selection object to specify the columns you want to select.
	 *
	 * Use `.from()` method to specify which table to select from.
	 *
	 * See docs: {@link https://orm.drizzle.team/docs/select}
	 *
	 * @param fields The selection object.
	 *
	 * @example
	 *
	 * ```ts
	 * // Select all columns and all rows from the 'cars' table
	 * const allCars: Car[] = await db.select().from(cars);
	 *
	 * // Select specific columns and all rows from the 'cars' table
	 * const carsIdsAndBrands: { id: number; brand: string }[] = await db.select({
	 *   id: cars.id,
	 *   brand: cars.brand
	 * })
	 *   .from(cars);
	 * ```
	 *
	 * Like in SQL, you can use arbitrary expressions as selection fields, not just table columns:
	 *
	 * ```ts
	 * // Select specific columns along with expression and all rows from the 'cars' table
	 * const carsIdsAndLowerNames: { id: number; lowerBrand: string }[] = await db.select({
	 *   id: cars.id,
	 *   lowerBrand: sql<string>`lower(${cars.brand})`,
	 * })
	 *   .from(cars);
	 * ```
	 */
	select(): GoogleSQLSelectBuilder<undefined>;
	select<TSelection extends SelectedFields>(fields: TSelection): GoogleSQLSelectBuilder<TSelection>;
	select<TSelection extends SelectedFields>(fields?: TSelection): GoogleSQLSelectBuilder<TSelection | undefined> {
		return new GoogleSQLSelectBuilder({
			fields: fields ?? undefined,
			session: this.session,
			dialect: this.dialect,
		});
	}

	/**
	 * Adds `distinct` expression to the select query.
	 *
	 * Calling this method will return only unique values. When multiple columns are selected, it returns rows with unique combinations of values in these columns.
	 *
	 * Use `.from()` method to specify which table to select from.
	 *
	 * See docs: {@link https://orm.drizzle.team/docs/select#distinct}
	 *
	 * @param fields The selection object.
	 *
	 * @example
	 * ```ts
	 * // Select all unique rows from the 'cars' table
	 * await db.selectDistinct()
	 *   .from(cars)
	 *   .orderBy(cars.id, cars.brand, cars.color);
	 *
	 * // Select all unique brands from the 'cars' table
	 * await db.selectDistinct({ brand: cars.brand })
	 *   .from(cars)
	 *   .orderBy(cars.brand);
	 * ```
	 */
	selectDistinct(): GoogleSQLSelectBuilder<undefined>;
	selectDistinct<TSelection extends SelectedFields>(fields: TSelection): GoogleSQLSelectBuilder<TSelection>;
	selectDistinct<TSelection extends SelectedFields>(
		fields?: TSelection,
	): GoogleSQLSelectBuilder<TSelection | undefined> {
		return new GoogleSQLSelectBuilder({
			fields: fields ?? undefined,
			session: this.session,
			dialect: this.dialect,
			distinct: true,
		});
	}

	// todo: Verify if Spanner doesn't support select distinct on.

	/**
	 * Creates an update query.
	 *
	 * Calling this method without `.where()` clause will update all rows in a table. The `.where()` clause specifies which rows should be updated.
	 *
	 * Use `.set()` method to specify which values to update.
	 *
	 * See docs: {@link https://orm.drizzle.team/docs/update}
	 *
	 * @param table The table to update.
	 *
	 * @example
	 *
	 * ```ts
	 * // Update all rows in the 'cars' table
	 * await db.update(cars).set({ color: 'red' });
	 *
	 * // Update rows with filters and conditions
	 * await db.update(cars).set({ color: 'red' }).where(eq(cars.brand, 'BMW'));
	 *
	 * // Update with returning clause
	 * const updatedCar: Car[] = await db.update(cars)
	 *   .set({ color: 'red' })
	 *   .where(eq(cars.id, 1))
	 *   .returning();
	 * ```
	 */
	update<TTable extends GoogleSQLTable>(table: TTable): GoogleSQLUpdateBuilder<TTable, TQueryResult> {
		return new GoogleSQLUpdateBuilder(table, this.session, this.dialect)
	}

	/**
	 * Creates an insert query.
	 *
	 * Calling this method will create new rows in a table. Use `.values()` method to specify which values to insert.
	 *
	 * See docs: {@link https://orm.drizzle.team/docs/insert}
	 *
	 * @param table The table to insert into.
	 *
	 * @example
	 *
	 * ```ts
	 * // Insert one row
	 * await db.insert(cars).values({ brand: 'BMW' });
	 *
	 * // Insert multiple rows
	 * await db.insert(cars).values([{ brand: 'BMW' }, { brand: 'Porsche' }]);
	 *
	 * // Insert with returning clause
	 * const insertedCar: Car[] = await db.insert(cars)
	 *   .values({ brand: 'BMW' })
	 *   .returning();
	 * ```
	 */
	insert<TTable extends GoogleSQLTable>(table: TTable): GoogleSQLInsertBuilder<TTable, TQueryResult> {
		return new GoogleSQLInsertBuilder(table, this.session, this.dialect);
	}

	/**
	 * Creates a delete query.
	 *
	 * Calling this method without `.where()` clause will delete all rows in a table. The `.where()` clause specifies which rows should be deleted.
	 *
	 * See docs: {@link https://orm.drizzle.team/docs/delete}
	 *
	 * @param table The table to delete from.
	 *
	 * @example
	 *
	 * ```ts
	 * // Delete all rows in the 'cars' table
	 * await db.delete(cars);
	 *
	 * // Delete rows with filters and conditions
	 * await db.delete(cars).where(eq(cars.color, 'green'));
	 *
	 * // Delete with returning clause
	 * const deletedCar: Car[] = await db.delete(cars)
	 *   .where(eq(cars.id, 1))
	 *   .returning();
	 * ```
	 */
	delete<TTable extends GoogleSQLTable>(table: TTable): GoogleSQLDeleteBase<TTable, TQueryResult> {
		return new GoogleSQLDeleteBase(table, this.session, this.dialect);
	}

	// todo: Verify if Spanner doesn't support materialised views.

	// todo: Verify if we don't need auth token for Spanner.

	execute<TRow extends Record<string, unknown> = Record<string, unknown>>(
		query: SQLWrapper | string,
	): GoogleSQLRaw<GoogleSQLQueryResultKind<TQueryResult, TRow>> {
		const sequel = typeof query === 'string' ? sql.raw(query) : query.getSQL();
		const builtQuery = this.dialect.sqlToQuery(sequel);
		const prepared = this.session.prepareQuery<
			PreparedQueryConfig & { execute: GoogleSQLQueryResultKind<TQueryResult, TRow> }
		>(
			builtQuery,
			undefined,
			undefined,
			false,
		);
		return new GoogleSQLRaw(
			() => prepared.execute(undefined),
			sequel,
			builtQuery,
			(result) => prepared.mapResult(result, true),
		);
	}

	transaction<T>(
		transaction: (tx: GoogleSQLTransaction<TQueryResult, TFullSchema, TSchema>) => Promise<T>,
		config?: GoogleSQLTransactionConfig,
	): Promise<T> {
		return this.session.transaction(transaction, config);
	}
}

export type GoogleSQLWithReplicas<Q> = Q & { $primary: Q };

export const withReplicas = <
	HKT extends GoogleSQLQueryResultHKT,
	TFullSchema extends Record<string, unknown>,
	TSchema extends V1.TablesRelationalConfig,
	Q extends GoogleSQLDatabase<
		HKT,
		TFullSchema,
		TSchema extends Record<string, unknown> ? V1.ExtractTablesWithRelations<TFullSchema> : TSchema
	>,
>(
	primary: Q,
	replicas: [Q, ...Q[]],
	getReplica: (replicas: Q[]) => Q = () => replicas[Math.floor(Math.random() * replicas.length)]!,
): GoogleSQLWithReplicas<Q> => {
	const select: Q['select'] = (...args: []) => getReplica(replicas).select(...args);
	const selectDistinct: Q['selectDistinct'] = (...args: []) => getReplica(replicas).selectDistinct(...args);
	const $count: Q['$count'] = (...args: [any]) => getReplica(replicas).$count(...args);
	const _with: Q['with'] = (...args: any) => getReplica(replicas).with(...args);
	const $with: Q['$with'] = (arg: any) => getReplica(replicas).$with(arg) as any;

	const update: Q['update'] = (...args: [any]) => primary.update(...args);
	const insert: Q['insert'] = (...args: [any]) => primary.insert(...args);
	const $delete: Q['delete'] = (...args: [any]) => primary.delete(...args);
	const execute: Q['execute'] = (...args: [any]) => primary.execute(...args);
	const transaction: Q['transaction'] = (...args: [any]) => primary.transaction(...args);
	return {
		...primary,
		update,
		insert,
		delete: $delete,
		execute,
		transaction,
		$primary: primary,
		$replicas: replicas,
		select,
		selectDistinct,
		$count,
		$with,
		with: _with,
		get _query() {
			return getReplica(replicas)._query;
		},
	};
};
