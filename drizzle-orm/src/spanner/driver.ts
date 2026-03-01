import { Spanner, type Database } from '@google-cloud/spanner';
import * as V1 from '~/_relations.ts';
import { GoogleSqlDatabase } from '~/google-sql-core/db.ts';
import { GoogleSqlDialect } from '~/google-sql-core/dialect.ts';
import { entityKind } from '~/entity.ts';
import type { Logger } from '~/logger.ts';
import { DefaultLogger } from '~/logger.ts';
import type { DrizzleConfig } from '~/utils.ts';
import type { NodeSpannerClient, NodeSpannerQueryResultHKT } from './session.ts';
import { NodeSpannerSession } from './session.ts';

export interface SpannerDriverOptions {
	logger?: Logger;
}

export interface SpannerConnectionConfig {
	projectId?: string;
	instanceId: string;
	databaseId: string;
}

export class NodeSpannerDriver {
	static readonly [entityKind]: string = 'NodeSpannerDriver';

	constructor(
		private client: NodeSpannerClient,
		private dialect: GoogleSqlDialect,
		private options: SpannerDriverOptions = {},
	) {
	}

	createSession(
		schema: V1.RelationalSchemaConfig<V1.TablesRelationalConfig> | undefined,
	): NodeSpannerSession<Record<string, unknown>, V1.TablesRelationalConfig> {
		return new NodeSpannerSession(this.client, this.dialect, schema, { logger: this.options.logger });
	}
}

export class NodeSpannerDatabase<
	TSchema extends Record<string, unknown> = Record<string, never>,
> extends GoogleSqlDatabase<NodeSpannerQueryResultHKT, TSchema> {
	static override readonly [entityKind]: string = 'NodeSpannerDatabase';
}

function construct<
	TSchema extends Record<string, unknown> = Record<string, never>,
	TClient extends NodeSpannerClient = NodeSpannerClient,
>(
	client: TClient,
	config: DrizzleConfig<TSchema> = {},
): NodeSpannerDatabase<TSchema> & {
	$client: TClient;
} {
	const dialect = new GoogleSqlDialect({ casing: config.casing });
	let logger;
	if (config.logger === true) {
		logger = new DefaultLogger();
	} else if (config.logger !== false) {
		logger = config.logger;
	}

	let schema: V1.RelationalSchemaConfig<V1.TablesRelationalConfig> | undefined;
	if (config.schema) {
		const tablesConfig = V1.extractTablesRelationalConfig(
			config.schema,
			V1.createTableRelationsHelpers,
		);
		schema = {
			fullSchema: config.schema,
			schema: tablesConfig.tables,
			tableNamesMap: tablesConfig.tableNamesMap,
		};
	}

	const driver = new NodeSpannerDriver(client, dialect, { logger });
	const session = driver.createSession(schema);
	const db = new NodeSpannerDatabase(dialect, session, schema as any) as NodeSpannerDatabase<TSchema>;
	(<any> db).$client = client;

	return db as any;
}

export function drizzle<
	TSchema extends Record<string, unknown> = Record<string, never>,
	TClient extends NodeSpannerClient = Database,
>(
	...params:
		| [
			(
				& DrizzleConfig<TSchema>
				& ({
					connection: SpannerConnectionConfig;
				} | {
					client: TClient;
				})
			),
		]
): NodeSpannerDatabase<TSchema> & {
	$client: TClient;
} {
	const { connection, client, ...drizzleConfig } = params[0] as (
		& ({ connection?: SpannerConnectionConfig; client?: TClient })
		& DrizzleConfig<TSchema>
	);

	if (client) return construct(client, drizzleConfig);

	if (!connection) {
		throw new Error('Either `client` or `connection` must be provided to drizzle().');
	}

	const spanner = new Spanner({ projectId: connection.projectId });
	const instance = spanner.instance(connection.instanceId);
	const database = instance.database(connection.databaseId);

	return construct(database, drizzleConfig) as any;
}

export namespace drizzle {
	export function mock<TSchema extends Record<string, unknown> = Record<string, never>>(
		config?: DrizzleConfig<TSchema>,
	): NodeSpannerDatabase<TSchema> & {
		$client: '$client is not available on drizzle.mock()';
	} {
		return construct({} as any, config) as any;
	}
}
