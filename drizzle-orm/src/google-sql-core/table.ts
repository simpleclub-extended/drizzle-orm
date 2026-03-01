import type { BuildColumns, BuildExtraConfigColumns, ColumnBuilderBase } from '~/column-builder.ts';
import { entityKind } from '~/entity.ts';
import {
	type InferTableColumnsModels,
	Table,
	type TableConfig as TableConfigBase,
	type UpdateTableConfig,
} from '~/table.ts';
import type { CheckBuilder } from './checks.ts';
import { type GoogleSqlColumnsBuilders, getGoogleSqlColumnBuilders } from './columns/all.ts';
import type {
	GoogleSqlColumn,
	GoogleSqlColumns,
	GoogleSqlColumnWithArrayBuilder,
	ExtraConfigColumn,
} from './columns/common.ts';
import type { ForeignKey, ForeignKeyBuilder } from './foreign-keys.ts';
import type { AnyIndexBuilder } from './indexes.ts';
import type { PrimaryKeyBuilder } from './primary-keys.ts';

export type GoogleSqlTableExtraConfigValue =
	| AnyIndexBuilder
	| CheckBuilder
	| ForeignKeyBuilder
	| PrimaryKeyBuilder;

export type GoogleSqlTableExtraConfig = Record<
	string,
	GoogleSqlTableExtraConfigValue
>;

export type TableConfig = TableConfigBase<GoogleSqlColumns>;

/** @internal */
export const InlineForeignKeys = Symbol.for('drizzle:GoogleSqlInlineForeignKeys');

export class GoogleSqlTable<T extends TableConfig = TableConfig> extends Table<T> {
	static override readonly [entityKind]: string = 'GoogleSqlTable';

	/** @internal */
	static override readonly Symbol = Object.assign({}, Table.Symbol, {
		InlineForeignKeys: InlineForeignKeys as typeof InlineForeignKeys,
	});

	/**@internal */
	[InlineForeignKeys]: ForeignKey[] = [];

	/** @internal */
	override [Table.Symbol.ExtraConfigBuilder]:
		| ((self: Record<string, GoogleSqlColumn>) => GoogleSqlTableExtraConfig)
		| undefined = undefined;

	/** @internal */
	override [Table.Symbol.ExtraConfigColumns]: Record<string, ExtraConfigColumn> = {};
}

export type AnyGoogleSqlTable<TPartial extends Partial<TableConfig> = {}> = GoogleSqlTable<
	UpdateTableConfig<TableConfig, TPartial>
>;

export type GoogleSqlTableWithColumns<T extends TableConfig> =
	& GoogleSqlTable<T>
	& T['columns']
	& InferTableColumnsModels<T['columns']>;

/** @internal */
export function googleSqlTableWithSchema<
	TTableName extends string,
	TSchemaName extends string | undefined,
	TColumnsMap extends Record<string, ColumnBuilderBase>,
>(
	name: TTableName,
	columns: TColumnsMap | ((columnTypes: GoogleSqlColumnsBuilders) => TColumnsMap),
	extraConfig:
		| ((
			self: BuildExtraConfigColumns<TTableName, TColumnsMap, 'googlesql'>,
		) => GoogleSqlTableExtraConfig | GoogleSqlTableExtraConfigValue[])
		| undefined,
	schema: TSchemaName,
	baseName = name,
): GoogleSqlTableWithColumns<{
	name: TTableName;
	schema: TSchemaName;
	columns: BuildColumns<TTableName, TColumnsMap, 'googlesql'>;
	dialect: 'googlesql';
}> {
	const rawTable = new GoogleSqlTable<{
		name: TTableName;
		schema: TSchemaName;
		columns: BuildColumns<TTableName, TColumnsMap, 'googlesql'>;
		dialect: 'googlesql';
	}>(name, schema, baseName);

	const parsedColumns: TColumnsMap = typeof columns === 'function' ? columns(getGoogleSqlColumnBuilders()) : columns;

	const builtColumns = Object.fromEntries(
		Object.entries(parsedColumns).map(([name, colBuilderBase]) => {
			const colBuilder = colBuilderBase as GoogleSqlColumnWithArrayBuilder;
			colBuilder.setName(name);
			const column = colBuilder.build(rawTable);
			rawTable[InlineForeignKeys].push(...colBuilder.buildForeignKeys(column, rawTable));
			return [name, column];
		}),
	) as unknown as BuildColumns<TTableName, TColumnsMap, 'googlesql'>;

	const builtColumnsForExtraConfig = Object.fromEntries(
		Object.entries(parsedColumns).map(([name, colBuilderBase]) => {
			const colBuilder = colBuilderBase as GoogleSqlColumnWithArrayBuilder;
			colBuilder.setName(name);
			const column = colBuilder.buildExtraConfigColumn(rawTable);
			return [name, column];
		}),
	) as unknown as BuildExtraConfigColumns<TTableName, TColumnsMap, 'googlesql'>;

	const table = Object.assign(rawTable, builtColumns);

	table[Table.Symbol.Columns] = builtColumns;
	table[Table.Symbol.ExtraConfigColumns] = builtColumnsForExtraConfig;

	if (extraConfig) {
		table[GoogleSqlTable.Symbol.ExtraConfigBuilder] = extraConfig as any;
	}

	return table as any;
}

export interface GoogleSqlTableFn<TSchema extends string | undefined = undefined> {
	<
		TTableName extends string,
		TColumnsMap extends Record<string, ColumnBuilderBase>,
	>(
		name: TTableName,
		columns: TColumnsMap,
		extraConfig?: (
			self: BuildExtraConfigColumns<TTableName, TColumnsMap, 'googlesql'>,
		) => GoogleSqlTableExtraConfigValue[],
	): GoogleSqlTableWithColumns<{
		name: TTableName;
		schema: TSchema;
		columns: BuildColumns<TTableName, TColumnsMap, 'googlesql'>;
		dialect: 'googlesql';
	}>;

	<
		TTableName extends string,
		TColumnsMap extends Record<string, ColumnBuilderBase>,
	>(
		name: TTableName,
		columns: (columnTypes: GoogleSqlColumnsBuilders) => TColumnsMap,
		extraConfig?: (
			self: BuildExtraConfigColumns<TTableName, TColumnsMap, 'googlesql'>,
		) => GoogleSqlTableExtraConfigValue[],
	): GoogleSqlTableWithColumns<{
		name: TTableName;
		schema: TSchema;
		columns: BuildColumns<TTableName, TColumnsMap, 'googlesql'>;
		dialect: 'googlesql';
	}>;
}

export const googleSqlTable: GoogleSqlTableFn = (name, columns, extraConfig) => {
	return googleSqlTableWithSchema(name, columns, extraConfig, undefined);
};

export function googleSqlTableCreator(customizeTableName: (name: string) => string): GoogleSqlTableFn {
	return (name, columns, extraConfig) => {
		return googleSqlTableWithSchema(customizeTableName(name) as typeof name, columns, extraConfig, undefined, name);
	};
}
