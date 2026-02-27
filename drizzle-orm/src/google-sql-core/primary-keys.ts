import { entityKind } from '~/entity.ts';
import type { AnyGoogleSQLColumn, GoogleSQLColumn } from './columns/index.ts';
import type { GoogleSQLTable } from './table.ts';

export type PrimaryKeyColumnSort = 'asc' | 'desc';

export interface PrimaryKeyColumnConfig {
	column: AnyGoogleSQLColumn;
	sort?: PrimaryKeyColumnSort;
}

export function primaryKey<
	TTableName extends string,
	TColumn extends AnyGoogleSQLColumn<{ tableName: TTableName }>,
	TColumns extends AnyGoogleSQLColumn<{ tableName: TTableName }>[],
>(config: {
	columns: [
		TColumn | { column: TColumn; sort?: PrimaryKeyColumnSort },
		...(TColumns[number] | { column: TColumns[number]; sort?: PrimaryKeyColumnSort })[],
	];
}): PrimaryKeyBuilder {
	return new PrimaryKeyBuilder(config.columns);
}

export class PrimaryKeyBuilder {
	static readonly [entityKind]: string = 'GoogleSQLPrimaryKeyBuilder';

	/** @internal */
	columns: PrimaryKeyColumnConfig[];

	constructor(
		columns: (GoogleSQLColumn | { column: GoogleSQLColumn; sort?: PrimaryKeyColumnSort })[],
	) {
		this.columns = columns.map((column) =>
			'column' in column && typeof column === 'object' && !('getSQL' in column)
				? { column: column.column, sort: column.sort }
				: { column: column as GoogleSQLColumn }
		);
	}

	/** @internal */
	build(table: GoogleSQLTable): PrimaryKey {
		return new PrimaryKey(table, this.columns);
	}
}

export class PrimaryKey {
	static readonly [entityKind]: string = 'GoogleSQLPrimaryKey';

	readonly columns: PrimaryKeyColumnConfig[];

	constructor(readonly table: GoogleSQLTable, columns: PrimaryKeyColumnConfig[]) {
		this.columns = columns;
	}
}
