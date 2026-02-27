import type { BuildColumns, BuildExtraConfigColumns, ColumnBuilderBase } from '~/column-builder.ts';
import { entityKind } from '~/entity.ts';
import {
	type InferTableColumnsModels,
	Table,
	type TableConfig as TableConfigBase,
	type UpdateTableConfig,
} from '~/table.ts';
import type { CheckBuilder } from './checks.ts';
import { type GoogleSQLColumnsBuilders, getGoogleSQLColumnBuilders } from './columns/all.ts';
import type {
	GoogleSQLColumn,
	GoogleSQLColumns,
	GoogleSQLColumnWithArrayBuilder,
	ExtraConfigColumn,
} from './columns/common.ts';
import type { ForeignKey, ForeignKeyBuilder } from './foreign-keys.ts';
import type { AnyIndexBuilder } from './indexes.ts';
import type { PrimaryKeyBuilder } from './primary-keys.ts';
import type { UniqueConstraintBuilder } from './unique-constraint.ts';

export type GoogleSQLTableExtraConfigValue =
	| AnyIndexBuilder
	| CheckBuilder
	| ForeignKeyBuilder
	| PrimaryKeyBuilder
	| UniqueConstraintBuilder;

export type GoogleSQLTableExtraConfig = Record<
	string,
	GoogleSQLTableExtraConfigValue
>;

export type TableConfig = TableConfigBase<GoogleSQLColumns>;

/** @internal */
export const InlineForeignKeys = Symbol.for('drizzle:GoogleSQLInlineForeignKeys');

export class GoogleSQLTable<T extends TableConfig = TableConfig> extends Table<T> {
	static override readonly [entityKind]: string = 'GoogleSQLTable';

	/** @internal */
	static override readonly Symbol = Object.assign({}, Table.Symbol, {
		InlineForeignKeys: InlineForeignKeys as typeof InlineForeignKeys,
	});

	/**@internal */
	[InlineForeignKeys]: ForeignKey[] = [];

	/** @internal */
	override [Table.Symbol.ExtraConfigBuilder]:
		| ((self: Record<string, GoogleSQLColumn>) => GoogleSQLTableExtraConfig)
		| undefined = undefined;

	/** @internal */
	override [Table.Symbol.ExtraConfigColumns]: Record<string, ExtraConfigColumn> = {};
}

export type AnyGoogleSQLTable<TPartial extends Partial<TableConfig> = {}> = GoogleSQLTable<
	UpdateTableConfig<TableConfig, TPartial>
>;

export type GoogleSQLTableWithColumns<T extends TableConfig> =
	& GoogleSQLTable<T>
	& T['columns']
	& InferTableColumnsModels<T['columns']>;

/** @internal */
export function googleSQLTableWithSchema<
	TTableName extends string,
	TSchemaName extends string | undefined,
	TColumnsMap extends Record<string, ColumnBuilderBase>,
>(
	name: TTableName,
	columns: TColumnsMap | ((columnTypes: GoogleSQLColumnsBuilders) => TColumnsMap),
	extraConfig:
		| ((
			self: BuildExtraConfigColumns<TTableName, TColumnsMap, 'google-sql'>,
		) => GoogleSQLTableExtraConfig | GoogleSQLTableExtraConfigValue[])
		| undefined,
	schema: TSchemaName,
	baseName = name,
): GoogleSQLTableWithColumns<{
	name: TTableName;
	schema: TSchemaName;
	columns: BuildColumns<TTableName, TColumnsMap, 'google-sql'>;
	dialect: 'google-sql';
}> {
	const rawTable = new GoogleSQLTable<{
		name: TTableName;
		schema: TSchemaName;
		columns: BuildColumns<TTableName, TColumnsMap, 'google-sql'>;
		dialect: 'google-sql';
	}>(name, schema, baseName);

	const parsedColumns: TColumnsMap = typeof columns === 'function' ? columns(getGoogleSQLColumnBuilders()) : columns;

	const builtColumns = Object.fromEntries(
		Object.entries(parsedColumns).map(([name, colBuilderBase]) => {
			const colBuilder = colBuilderBase as GoogleSQLColumnWithArrayBuilder;
			colBuilder.setName(name);
			const column = colBuilder.build(rawTable);
			rawTable[InlineForeignKeys].push(...colBuilder.buildForeignKeys(column, rawTable));
			return [name, column];
		}),
	) as unknown as BuildColumns<TTableName, TColumnsMap, 'google-sql'>;

	const builtColumnsForExtraConfig = Object.fromEntries(
		Object.entries(parsedColumns).map(([name, colBuilderBase]) => {
			const colBuilder = colBuilderBase as GoogleSQLColumnWithArrayBuilder;
			colBuilder.setName(name);
			const column = colBuilder.buildExtraConfigColumn(rawTable);
			return [name, column];
		}),
	) as unknown as BuildExtraConfigColumns<TTableName, TColumnsMap, 'google-sql'>;

	const table = Object.assign(rawTable, builtColumns);

	table[Table.Symbol.Columns] = builtColumns;
	table[Table.Symbol.ExtraConfigColumns] = builtColumnsForExtraConfig;

	if (extraConfig) {
		table[GoogleSQLTable.Symbol.ExtraConfigBuilder] = extraConfig as any;
	}

	return table as any;
}

export interface GoogleSQLTableFn<TSchema extends string | undefined = undefined> {
	<
		TTableName extends string,
		TColumnsMap extends Record<string, ColumnBuilderBase>,
	>(
		name: TTableName,
		columns: TColumnsMap,
		extraConfig?: (
			self: BuildExtraConfigColumns<TTableName, TColumnsMap, 'google-sql'>,
		) => GoogleSQLTableExtraConfigValue[],
	): GoogleSQLTableWithColumns<{
		name: TTableName;
		schema: TSchema;
		columns: BuildColumns<TTableName, TColumnsMap, 'google-sql'>;
		dialect: 'google-sql';
	}>;

	<
		TTableName extends string,
		TColumnsMap extends Record<string, ColumnBuilderBase>,
	>(
		name: TTableName,
		columns: (columnTypes: GoogleSQLColumnsBuilders) => TColumnsMap,
		extraConfig?: (
			self: BuildExtraConfigColumns<TTableName, TColumnsMap, 'google-sql'>,
		) => GoogleSQLTableExtraConfigValue[],
	): GoogleSQLTableWithColumns<{
		name: TTableName;
		schema: TSchema;
		columns: BuildColumns<TTableName, TColumnsMap, 'google-sql'>;
		dialect: 'google-sql';
	}>;
}

export const googleSQLTable: GoogleSQLTableFn = (name, columns, extraConfig) => {
	return googleSQLTableWithSchema(name, columns, extraConfig, undefined);
};

export function googleSQLTableCreator(customizeTableName: (name: string) => string): GoogleSQLTableFn {
	return (name, columns, extraConfig) => {
		return googleSQLTableWithSchema(customizeTableName(name) as typeof name, columns, extraConfig, undefined, name);
	};
}
