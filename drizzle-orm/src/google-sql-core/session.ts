import type * as V1 from '~/_relations.ts';
import { entityKind } from '~/entity.ts';
import { TransactionRollbackError } from '~/errors.ts';
import type { PreparedQuery } from '~/session.ts';
import { type Query, type SQL, sql } from '~/sql/index.ts';
import { tracer } from '~/tracing.ts';
import { GoogleSqlDatabase } from './db.ts';
import type { GoogleSqlDialect } from './dialect.ts';
import type { SelectedFieldsOrdered } from './query-builders/select.types.ts';

export interface PreparedQueryConfig {
	execute: unknown;
	all: unknown;
	values: unknown;
}



export abstract class GoogleSqlPreparedQuery<T extends PreparedQueryConfig> implements PreparedQuery {
	constructor(protected query: Query) {}

	getQuery(): Query {
		return this.query;
	}

	mapResult(response: unknown, _isFromBatch?: boolean): unknown {
		return response;
	}

	static readonly [entityKind]: string = 'GoogleSqlPreparedQuery';

	/** @internal */
	joinsNotNullableMap?: Record<string, boolean>;

	abstract execute(placeholderValues?: Record<string, unknown>): Promise<T['execute']>;
	/** @internal */
	abstract execute(placeholderValues?: Record<string, unknown>): Promise<T['execute']>;
	/** @internal */
	abstract execute(placeholderValues?: Record<string, unknown>): Promise<T['execute']>;

	/** @internal */
	abstract all(placeholderValues?: Record<string, unknown>): Promise<T['all']>;

	/** @internal */
	abstract isResponseInArrayMode(): boolean;
}

// todo: Implement Spanner transaction config.
export interface GoogleSqlTransactionConfig {
}

export abstract class GoogleSqlSession<
	TQueryResult extends GoogleSqlQueryResultHKT = GoogleSqlQueryResultHKT,
	TFullSchema extends Record<string, unknown> = Record<string, never>,
	TSchema extends V1.TablesRelationalConfig = Record<string, never>,
> {
	static readonly [entityKind]: string = 'GoogleSqlSession';

	constructor(protected dialect: GoogleSqlDialect) {}

	abstract prepareQuery<T extends PreparedQueryConfig = PreparedQueryConfig>(
		query: Query,
		fields: SelectedFieldsOrdered | undefined,
		name: string | undefined,
		isResponseInArrayMode: boolean,
		customResultMapper?: (rows: unknown[][], mapColumnValue?: (value: unknown) => unknown) => T['execute'],
	): GoogleSqlPreparedQuery<T>;

	execute<T>(query: SQL): Promise<T>;
	/** @internal */
	execute<T>(query: SQL): Promise<T>;
	/** @internal */
	execute<T>(query: SQL): Promise<T> {
		return tracer.startActiveSpan('drizzle.operation', () => {
			const prepared = tracer.startActiveSpan('drizzle.prepareQuery', () => {
				return this.prepareQuery<PreparedQueryConfig & { execute: T }>(
					this.dialect.sqlToQuery(query),
					undefined,
					undefined,
					false,
				);
			});

			return prepared.setToken(token).execute(undefined, token);
		});
	}

	all<T = unknown>(query: SQL): Promise<T[]> {
		return this.prepareQuery<PreparedQueryConfig & { all: T[] }>(
			this.dialect.sqlToQuery(query),
			undefined,
			undefined,
			false,
		).all();
	}

	async count(sql: SQL): Promise<number>;
	/** @internal */
	async count(sql: SQL): Promise<number>;
	/** @internal */
	async count(sql: SQL): Promise<number> {
		const res = await this.execute<[{ count: string }]>(sql, token);

		return Number(
			res[0]['count'],
		);
	}

	abstract transaction<T>(
		transaction: (tx: GoogleSqlTransaction<TQueryResult, TFullSchema, TSchema>) => Promise<T>,
		config?: GoogleSqlTransactionConfig,
	): Promise<T>;
}

export abstract class GoogleSqlTransaction<
	TQueryResult extends GoogleSqlQueryResultHKT,
	TFullSchema extends Record<string, unknown> = Record<string, never>,
	TSchema extends V1.TablesRelationalConfig = Record<string, never>,
> extends GoogleSqlDatabase<TQueryResult, TFullSchema, TSchema> {
	static override readonly [entityKind]: string = 'GoogleSqlTransaction';

	constructor(
		dialect: GoogleSqlDialect,
		session: GoogleSqlSession<any, any, any>,
		protected schema: {
			fullSchema: Record<string, unknown>;
			schema: TSchema;
			tableNamesMap: Record<string, string>;
		} | undefined,
		protected readonly nestedIndex = 0,
	) {
		super(dialect, session, schema);
	}

	rollback(): never {
		throw new TransactionRollbackError();
	}

	abstract override transaction<T>(
		transaction: (tx: GoogleSqlTransaction<TQueryResult, TFullSchema, TSchema>) => Promise<T>,
	): Promise<T>;
}

export interface GoogleSqlQueryResultHKT {
	readonly $brand: 'GoogleSqlQueryResultHKT';
	readonly row: unknown;
	readonly type: unknown;
}

export type GoogleSqlQueryResultKind<TKind extends GoogleSqlQueryResultHKT, TRow> = (TKind & {
	readonly row: TRow;
})['type'];
