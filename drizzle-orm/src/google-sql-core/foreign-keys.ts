import { entityKind } from '~/entity.ts';
import type { AnyGoogleSqlColumn, GoogleSqlColumn } from './columns/index.ts';
import type { GoogleSqlTable } from './table.ts';

export type UpdateDeleteAction = 'cascade' | 'no action';

export type Reference = () => {
	readonly name?: string;
	readonly columns: GoogleSqlColumn[];
	readonly foreignTable: GoogleSqlTable;
	readonly foreignColumns: GoogleSqlColumn[];
};
// todo: Add support for unenforced foreign keys

export class ForeignKeyBuilder {
	static readonly [entityKind]: string = 'GoogleSqlForeignKeyBuilder';

	/** @internal */
	reference: Reference;

	/** @internal */
	_onDelete: UpdateDeleteAction | undefined = 'no action';

	constructor(
		config: () => {
			name?: string;
			columns: GoogleSqlColumn[];
			foreignColumns: GoogleSqlColumn[];
		},
		actions?: {
			onDelete?: UpdateDeleteAction;
		} | undefined,
	) {
		this.reference = () => {
			const { name, columns, foreignColumns } = config();
			return { name, columns, foreignTable: foreignColumns[0]!.table as GoogleSqlTable, foreignColumns };
		};
		if (actions) {
			this._onDelete = actions.onDelete;
		}
	}

	onDelete(action: UpdateDeleteAction): this {
		this._onDelete = action === undefined ? 'no action' : action;
		return this;
	}

	/** @internal */
	build(table: GoogleSqlTable): ForeignKey {
		return new ForeignKey(table, this);
	}
}

export type AnyForeignKeyBuilder = ForeignKeyBuilder;

export class ForeignKey {
	static readonly [entityKind]: string = 'GoogleSqlForeignKey';

	readonly reference: Reference;
	readonly onDelete: UpdateDeleteAction | undefined;
	readonly name?: string;

	constructor(readonly table: GoogleSqlTable, builder: ForeignKeyBuilder) {
		this.reference = builder.reference;
		this.onDelete = builder._onDelete;
	}

	getName(): string | undefined {
		const { name } = this.reference();

		return name;
	}

	isNameExplicit() {
		return !!this.reference().name;
	}
}

type ColumnsWithTable<
	TTableName extends string,
	TColumns extends GoogleSqlColumn[],
> = { [Key in keyof TColumns]: AnyGoogleSqlColumn<{ tableName: TTableName }> };

export function foreignKey<
	TTableName extends string,
	TForeignTableName extends string,
	TColumns extends [
		AnyGoogleSqlColumn<{ tableName: TTableName }>,
		...AnyGoogleSqlColumn<{ tableName: TTableName }>[],
	],
>(
	config: {
		name?: string;
		columns: TColumns;
		foreignColumns: ColumnsWithTable<TForeignTableName, TColumns>;
	},
): ForeignKeyBuilder {
	function mappedConfig() {
		const { name, columns, foreignColumns } = config;
		return {
			name,
			columns,
			foreignColumns,
		};
	}

	return new ForeignKeyBuilder(mappedConfig);
}
