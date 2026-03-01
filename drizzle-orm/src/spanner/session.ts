import { Database, type Transaction } from '@google-cloud/spanner';
import type * as V1 from '~/_relations.ts';
import type { GoogleSqlDialect } from '~/google-sql-core/dialect.ts';
import { GoogleSqlTransaction } from '~/google-sql-core/index.ts';
import type { SelectedFieldsOrdered } from '~/google-sql-core/query-builders/select.types.ts';
import type {
	GoogleSqlQueryResultHKT,
	GoogleSqlTransactionConfig,
	PreparedQueryConfig,
} from '~/google-sql-core/session.ts';
import { GoogleSqlPreparedQuery, GoogleSqlSession } from '~/google-sql-core/session.ts';
import { entityKind, is } from '~/entity.ts';
import { type Logger, NoopLogger } from '~/logger.ts';
import { fillPlaceholders, type Query, type SQL } from '~/sql/sql.ts';
import { tracer } from '~/tracing.ts';
import { type Assume, mapResultRow } from '~/utils.ts';

export type NodeSpannerClient = Database;

export class NodeSpannerPreparedQuery<T extends PreparedQueryConfig> extends GoogleSqlPreparedQuery<T> {
	static override readonly [entityKind]: string = 'NodeSpannerPreparedQuery';

	constructor(
		private client: NodeSpannerClient | Transaction,
		private queryString: string,
		private params: unknown[],
		private logger: Logger,
		private fields: SelectedFieldsOrdered | undefined,
		_name: string | undefined,
		private _isResponseInArrayMode: boolean,
		private customResultMapper?: (rows: unknown[][]) => T['execute'],
	) {
		super({ sql: queryString, params });
	}

	async execute(placeholderValues: Record<string, unknown> | undefined = {}): Promise<T['execute']> {
		return tracer.startActiveSpan('drizzle.execute', async () => {
			const params = fillPlaceholders(this.params, placeholderValues);

			this.logger.logQuery(this.queryString, params);

			const { fields, queryString, client, joinsNotNullableMap, customResultMapper } = this;

			if (!fields && !customResultMapper) {
				return tracer.startActiveSpan('drizzle.driver.execute', async (span) => {
					span?.setAttributes({
						'drizzle.query.text': queryString,
						'drizzle.query.params': JSON.stringify(params),
					});
					const [rows] = await client.run({ sql: queryString, params: this.buildSpannerParams(params) });
					return { rows, rowCount: rows.length };
				});
			}

			const result = await tracer.startActiveSpan('drizzle.driver.execute', async (span) => {
				span?.setAttributes({
					'drizzle.query.text': queryString,
					'drizzle.query.params': JSON.stringify(params),
				});
				const [rows] = await client.run({ sql: queryString, params: this.buildSpannerParams(params) });
				return rows;
			});

			return tracer.startActiveSpan('drizzle.mapResponse', () => {
				if (customResultMapper) {
					const arrayRows = result.map((row) => {
						const json = row.toJSON({wrapNumbers: true});
						return Object.values(json);
					});
					return customResultMapper(arrayRows);
				}

				if (this._isResponseInArrayMode) {
					const arrayRows = result.map((row) => {
						const json = row.toJSON({wrapNumbers: true});
						return Object.values(json);
					});
					return arrayRows.map((row) => mapResultRow<T['execute']>(fields!, row, joinsNotNullableMap));
				}

				return result.map((row) => {
					const json = row.toJSON({wrapNumbers: true});
					return mapResultRow<T['execute']>(fields!, Object.values(json), joinsNotNullableMap);
				});
			});
		});
	}

	all(placeholderValues: Record<string, unknown> | undefined = {}): Promise<T['all']> {
		return tracer.startActiveSpan('drizzle.execute', async () => {
			const params = fillPlaceholders(this.params, placeholderValues);
			this.logger.logQuery(this.queryString, params);
			return tracer.startActiveSpan('drizzle.driver.execute', async (span) => {
				span?.setAttributes({
					'drizzle.query.text': this.queryString,
					'drizzle.query.params': JSON.stringify(params),
				});
				const [rows] = await this.client.run({
					sql: this.queryString,
					params: this.buildSpannerParams(params),
				});
				return rows.map((row) => row.toJSON({wrapNumbers: true}));
			});
		});
	}

	/** @internal */
	isResponseInArrayMode(): boolean {
		return this._isResponseInArrayMode;
	}

	private buildSpannerParams(params: unknown[]): Record<string, unknown> {
		const result: Record<string, unknown> = {};
		for (let i = 0; i < params.length; i++) {
			result[`p${i + 1}`] = params[i];
		}
		return result;
	}
}

export interface NodeSpannerSessionOptions {
	logger?: Logger;
}

export class NodeSpannerSession<
	TFullSchema extends Record<string, unknown>,
	TSchema extends V1.TablesRelationalConfig,
> extends GoogleSqlSession<NodeSpannerQueryResultHKT, TFullSchema, TSchema> {
	static override readonly [entityKind]: string = 'NodeSpannerSession';

	private logger: Logger;

	constructor(
		private client: NodeSpannerClient | Transaction,
		dialect: GoogleSqlDialect,
		private schema: V1.RelationalSchemaConfig<TSchema> | undefined,
		private options: NodeSpannerSessionOptions = {},
	) {
		super(dialect);
		this.logger = options.logger ?? new NoopLogger();
	}

	prepareQuery<T extends PreparedQueryConfig = PreparedQueryConfig>(
		query: Query,
		fields: SelectedFieldsOrdered | undefined,
		name: string | undefined,
		isResponseInArrayMode: boolean,
		customResultMapper?: (rows: unknown[][]) => T['execute'],
	): GoogleSqlPreparedQuery<T> {
		return new NodeSpannerPreparedQuery(
			this.client,
			query.sql,
			query.params,
			this.logger,
			fields,
			name,
			isResponseInArrayMode,
			customResultMapper,
		);
	}

	override async transaction<T>(
		transaction: (tx: NodeSpannerTransaction<TFullSchema, TSchema>) => Promise<T>,
		_config?: GoogleSqlTransactionConfig | undefined,
	): Promise<T> {
		if (!is(this.client, Database)) {
			throw new Error('Transactions can only be started from a Database client, not from within an existing transaction.');
		}

		const db = this.client as Database;
		return db.runTransactionAsync(async (spannerTransaction) => {
			const session = new NodeSpannerSession<TFullSchema, TSchema>(
				spannerTransaction,
				this.dialect,
				this.schema,
				this.options,
			);
			const tx = new NodeSpannerTransaction<TFullSchema, TSchema>(this.dialect, session, this.schema);
			try {
				const result = await transaction(tx);
				await spannerTransaction.commit();
				return result;
			} catch (error) {
				await spannerTransaction.rollback();
				throw error;
			}
		});
	}

	override async count(sql: SQL): Promise<number> {
		const res = await this.execute<{ rows: [{ count: string }] }>(sql);
		return Number(
			res['rows'][0]['count'],
		);
	}
}

export class NodeSpannerTransaction<
	TFullSchema extends Record<string, unknown>,
	TSchema extends V1.TablesRelationalConfig,
> extends GoogleSqlTransaction<NodeSpannerQueryResultHKT, TFullSchema, TSchema> {
	static override readonly [entityKind]: string = 'NodeSpannerTransaction';

	override async transaction<T>(
		_transaction: (tx: NodeSpannerTransaction<TFullSchema, TSchema>) => Promise<T>,
	): Promise<T> {
		throw new Error('Spanner does not support nested transactions or savepoints.');
	}
}

export interface NodeSpannerQueryResultHKT extends GoogleSqlQueryResultHKT {
	type: { rows: Assume<this['row'], Record<string, unknown>>[]; rowCount: number };
}
