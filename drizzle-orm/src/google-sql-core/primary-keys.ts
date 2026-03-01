import { entityKind } from '~/entity.ts';
import type { AnyGoogleSqlColumn, GoogleSqlColumn } from './columns/index.ts';
import type { GoogleSqlTable } from './table.ts';

export type PrimaryKeyColumnSort = 'asc' | 'desc';

export interface PrimaryKeyColumnConfig {
	column: AnyGoogleSqlColumn;
	sort?: PrimaryKeyColumnSort;
}

export function primaryKey<
	TTableName extends string,
	TColumn extends AnyGoogleSqlColumn<{ tableName: TTableName }>,
	TColumns extends AnyGoogleSqlColumn<{ tableName: TTableName }>[],
>(config: {
	columns: [
		TColumn | { column: TColumn; sort?: PrimaryKeyColumnSort },
		...(TColumns[number] | { column: TColumns[number]; sort?: PrimaryKeyColumnSort })[],
	];
}): PrimaryKeyBuilder {
	return new PrimaryKeyBuilder(config.columns);
}

export class PrimaryKeyBuilder {
	static readonly [entityKind]: string = 'GoogleSqlPrimaryKeyBuilder';

	/** @internal */
	columns: PrimaryKeyColumnConfig[];

	constructor(
		columns: (GoogleSqlColumn | { column: GoogleSqlColumn; sort?: PrimaryKeyColumnSort })[],
	) {
		this.columns = columns.map((column) =>
			'column' in column && typeof column === 'object' && !('getSQL' in column)
				? { column: column.column, sort: column.sort }
				: { column: column as GoogleSqlColumn }
		);
	}

	/** @internal */
	build(table: GoogleSqlTable): PrimaryKey {
		return new PrimaryKey(table, this.columns);
	}
}

export class PrimaryKey {
	static readonly [entityKind]: string = 'GoogleSqlPrimaryKey';

	readonly columns: PrimaryKeyColumnConfig[];

	constructor(readonly table: GoogleSqlTable, columns: PrimaryKeyColumnConfig[]) {
		this.columns = columns;
	}
}
