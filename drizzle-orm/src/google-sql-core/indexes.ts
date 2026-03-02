import { entityKind, is } from '~/entity.ts';
import { SQL } from '~/sql/sql.ts';
import { ExtraConfigColumn } from './columns/index.ts';
import type { GoogleSqlColumn } from './columns/index.ts';
import { IndexedColumn } from './columns/index.ts';
import type { GoogleSqlTable } from './table.ts';

interface IndexConfig {
	name?: string;

	columns: Partial<IndexedColumn | SQL>[];

	/**
	 * If true, the index will be created as `create unique index` instead of `create index`.
	 */
	unique: boolean;

	/**
	 * If true, the index will be created as `create unique null_filtered index` or `create null_filtered index`.
	 */
	nullFiltered: boolean;

	/**
	 * Columns to include in the STORING clause.
	 */
	storing?: GoogleSqlColumn[];

	/**
	 * Only include rows where the specified columns are NOT NULL.
	 * In Spanner, only `column_name IS NOT NULL` predicates are supported.
	 */
	whereIsNotNull?: GoogleSqlColumn[];

	/**
	 * Table name for the INTERLEAVE IN clause.
	 */
	interleaveIn?: string;
}

export type IndexColumn = GoogleSqlColumn;

export class IndexBuilderOn {
	static readonly [entityKind]: string = 'GoogleSqlIndexBuilderOn';

	constructor(private unique: boolean, private name?: string) {}

	on(
		...columns: [
			Partial<ExtraConfigColumn> | SQL | GoogleSqlColumn,
			...Partial<ExtraConfigColumn | SQL | GoogleSqlColumn>[],
		]
	): IndexBuilder {
		return new IndexBuilder(
			columns.map((it) => {
				if (is(it, SQL)) {
					return it;
				}

				if (is(it, ExtraConfigColumn)) {
					const clonedIndexedColumn = new IndexedColumn(
						it.name,
						!!it.keyAsName,
						it.columnType!,
						it.indexConfig!,
					);
					it.indexConfig = JSON.parse(JSON.stringify(it.defaultConfig));
					return clonedIndexedColumn;
				}

				it = it as GoogleSqlColumn;
				return new IndexedColumn(
					it.name,
					!!it.keyAsName,
					it.columnType!,
					{},
				);
			}),
			this.unique,
			false,
			this.name,
		);
	}
}

export interface AnyIndexBuilder {
	build(table: GoogleSqlTable): Index;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IndexBuilder extends AnyIndexBuilder {}

export class IndexBuilder implements AnyIndexBuilder {
	static readonly [entityKind]: string = 'GoogleSqlIndexBuilder';

	/** @internal */
	config: IndexConfig;

	constructor(
		columns: Partial<IndexedColumn | SQL>[],
		unique: boolean,
		nullFiltered: boolean,
		name?: string,
	) {
		this.config = {
			name,
			columns,
			unique,
			nullFiltered,
		};
	}

	/**
	 * Mark the index as NULL_FILTERED.
	 */
	nullFiltered(): this {
		this.config.nullFiltered = true;
		return this;
	}

	/**
	 * Specify columns for the STORING clause.
	 */
	storing(...columns: [GoogleSqlColumn, ...GoogleSqlColumn[]]): this {
		this.config.storing = columns;
		return this;
	}

	/**
	 * Specify which columns need to be NOT NULL for the row to be included in the index.
	 * In Spanner, only `column_name IS NOT NULL` predicates are supported.
	 */
	whereIsNotNull(columns: GoogleSqlColumn[]): this {
		this.config.whereIsNotNull = columns;
		return this;
	}

	/**
	 * Specify the INTERLEAVE IN table for the index.
	 */
	interleaveIn(tableName: string): this {
		this.config.interleaveIn = tableName;
		return this;
	}

	/** @internal */
	build(table: GoogleSqlTable): Index {
		return new Index(this.config, table);
	}
}

export class Index {
	static readonly [entityKind]: string = 'GoogleSqlIndex';

	readonly config: IndexConfig & { table: GoogleSqlTable };
	readonly isNameExplicit: boolean;

	constructor(config: IndexConfig, table: GoogleSqlTable) {
		this.config = { ...config, table };
		this.isNameExplicit = !!config.name;
	}
}

export type GetColumnsTableName<TColumns> = TColumns extends GoogleSqlColumn ? TColumns['_']['name']
	: TColumns extends GoogleSqlColumn[] ? TColumns[number]['_']['name']
	: never;

export function index(name?: string): IndexBuilderOn {
	return new IndexBuilderOn(false, name);
}

export function uniqueIndex(name?: string): IndexBuilderOn {
	return new IndexBuilderOn(true, name);
}
