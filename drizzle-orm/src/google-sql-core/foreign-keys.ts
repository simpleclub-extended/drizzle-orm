import { entityKind } from '~/entity.ts';
import type { AnyGoogleSQLColumn, GoogleSQLColumn } from './columns/index.ts';
import type { GoogleSQLTable } from './table.ts';

export type UpdateDeleteAction = 'cascade' | 'no action';

export type Reference = () => {
	readonly name?: string;
	readonly columns: GoogleSQLColumn[];
	readonly foreignTable: GoogleSQLTable;
	readonly foreignColumns: GoogleSQLColumn[];
};

export class ForeignKeyBuilder {
	static readonly [entityKind]: string = 'GoogleSQLForeignKeyBuilder';

	/** @internal */
	reference: Reference;

	/** @internal */
	_onUpdate: UpdateDeleteAction | undefined = 'no action';

	/** @internal */
	_onDelete: UpdateDeleteAction | undefined = 'no action';

	constructor(
		config: () => {
			name?: string;
			columns: GoogleSQLColumn[];
			foreignColumns: GoogleSQLColumn[];
		},
		actions?: {
			onUpdate?: UpdateDeleteAction;
			onDelete?: UpdateDeleteAction;
		} | undefined,
	) {
		this.reference = () => {
			const { name, columns, foreignColumns } = config();
			return { name, columns, foreignTable: foreignColumns[0]!.table as GoogleSQLTable, foreignColumns };
		};
		if (actions) {
			this._onUpdate = actions.onUpdate;
			this._onDelete = actions.onDelete;
		}
	}

	onUpdate(action: UpdateDeleteAction): this {
		this._onUpdate = action === undefined ? 'no action' : action;
		return this;
	}

	onDelete(action: UpdateDeleteAction): this {
		this._onDelete = action === undefined ? 'no action' : action;
		return this;
	}

	/** @internal */
	build(table: GoogleSQLTable): ForeignKey {
		return new ForeignKey(table, this);
	}
}

export type AnyForeignKeyBuilder = ForeignKeyBuilder;

export class ForeignKey {
	static readonly [entityKind]: string = 'GoogleSQLForeignKey';

	readonly reference: Reference;
	readonly onUpdate: UpdateDeleteAction | undefined;
	readonly onDelete: UpdateDeleteAction | undefined;
	readonly name?: string;

	constructor(readonly table: GoogleSQLTable, builder: ForeignKeyBuilder) {
		this.reference = builder.reference;
		this.onUpdate = builder._onUpdate;
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
	TColumns extends GoogleSQLColumn[],
> = { [Key in keyof TColumns]: AnyGoogleSQLColumn<{ tableName: TTableName }> };

export function foreignKey<
	TTableName extends string,
	TForeignTableName extends string,
	TColumns extends [
		AnyGoogleSQLColumn<{ tableName: TTableName }>,
		...AnyGoogleSQLColumn<{ tableName: TTableName }>[],
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
