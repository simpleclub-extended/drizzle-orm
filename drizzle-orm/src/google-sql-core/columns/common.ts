import type {
	ColumnBuilderBaseConfig,
	ColumnBuilderRuntimeConfig,
	ColumnType,
	HasGenerated,
} from '~/column-builder.ts';
import { ColumnBuilder } from '~/column-builder.ts';
import type { ColumnBaseConfig } from '~/column.ts';
import { Column } from '~/column.ts';
import { entityKind, is } from '~/entity.ts';
import type { Update } from '~/utils.ts';

import type { ForeignKey, UpdateDeleteAction } from '~/google-sql-core/foreign-keys.ts';
import { ForeignKeyBuilder } from '~/google-sql-core/foreign-keys.ts';
import type { AnyGoogleSQLTable, GoogleSQLTable } from '~/google-sql-core/table.ts';
import type { SQL } from '~/sql/sql.ts';
import { iife } from '~/tracing-utils.ts';
import { makeGoogleSQLArray, parseGoogleSQLArray } from '../utils/array.ts';

export type GoogleSQLColumns = Record<string, GoogleSQLColumn<any>>;

export interface ReferenceConfig {
	ref: () => GoogleSQLColumn;
	config: {
		name?: string;
		onUpdate?: UpdateDeleteAction;
		onDelete?: UpdateDeleteAction;
	};
}
export abstract class GoogleSQLColumnBuilder<
	T extends ColumnBuilderBaseConfig<ColumnType> = ColumnBuilderBaseConfig<ColumnType>,
	TRuntimeConfig extends object = object,
> extends ColumnBuilder<T, TRuntimeConfig> {
	private foreignKeyConfigs: ReferenceConfig[] = [];

	static override readonly [entityKind]: string = 'GoogleSQLColumnBuilder';

	references(
		ref: ReferenceConfig['ref'],
		config: ReferenceConfig['config'] = {},
	): this {
		this.foreignKeyConfigs.push({ ref, config });
		return this;
	}

	unique(
		name?: string,
	): this {
		this.config.isUnique = true;
		this.config.uniqueName = name;
		return this;
	}

	generatedAlwaysAs(as: SQL | (() => SQL)): HasGenerated<this, {
		type: 'always';
	}> {
		this.config.generated = {
			as,
			type: 'always',
			mode: 'stored',
		};
		return this as HasGenerated<this, {
			type: 'always';
		}>;
	}

	/** @internal */
	buildForeignKeys(column: GoogleSQLColumn, table: GoogleSQLTable): ForeignKey[] {
		return this.foreignKeyConfigs.map(({ ref, config }) => {
			return iife(
				(ref, config) => {
					const builder = new ForeignKeyBuilder(() => {
						const foreignColumn = ref();
						return { name: config.name, columns: [column], foreignColumns: [foreignColumn] };
					});
					if (config.onUpdate) {
						builder.onUpdate(config.onUpdate);
					}
					if (config.onDelete) {
						builder.onDelete(config.onDelete);
					}
					return builder.build(table);
				},
				ref,
				config,
			);
		});
	}

	/** @internal */
	abstract build(table: GoogleSQLTable): GoogleSQLColumn<any>;

	/** @internal */
	buildExtraConfigColumn<TTableName extends string>(
		table: AnyGoogleSQLTable<{ name: TTableName }>,
	): ExtraConfigColumn {
		return new ExtraConfigColumn(table, this.config);
	}
}

export abstract class GoogleSQLColumnWithArrayBuilder<
	T extends ColumnBuilderBaseConfig<ColumnType> = ColumnBuilderBaseConfig<ColumnType>,
	TRuntimeConfig extends object = object,
> extends GoogleSQLColumnBuilder<T, TRuntimeConfig> {
	static override readonly [entityKind]: string = 'GoogleSQLColumnWithArrayBuilder';
	array<TSize extends number | undefined = undefined>(size?: TSize): Omit<
		GoogleSQLArrayBuilder<
			& {
				name: string;
				dataType: 'array basecolumn';
				data: T['data'][];
				driverParam: T['driverParam'][] | string;
				baseBuilder: T;
			}
			& (T extends { notNull: true } ? { notNull: true } : {})
			& (T extends { hasDefault: true } ? { hasDefault: true } : {}),
			T
		>,
		'array'
	> {
		return new GoogleSQLArrayBuilder(
			this.config.name,
			this as GoogleSQLColumnWithArrayBuilder<any, any>,
			size as any,
		) as any; // size as any
	}
}

// To understand how to use `GoogleSQLColumn` and `AnyGoogleSQLColumn`, see `Column` and `AnyColumn` documentation.
export abstract class GoogleSQLColumn<
	T extends ColumnBaseConfig<ColumnType> = ColumnBaseConfig<ColumnType>,
	TRuntimeConfig extends object = {},
> extends Column<T, TRuntimeConfig> {
	static override readonly [entityKind]: string = 'GoogleSQLColumn';

	/** @internal */
	override readonly table: GoogleSQLTable;

	constructor(
		table: GoogleSQLTable,
		config: ColumnBuilderRuntimeConfig<T['data']> & TRuntimeConfig,
	) {
		super(table, config);
		this.table = table;
	}

	/** @internal */
	override shouldDisableInsert(): boolean {
		return (this.config.generatedIdentity !== undefined && this.config.generatedIdentity.type === 'always')
			|| (this.config.generated !== undefined && this.config.generated.type !== 'byDefault');
	}
}

export type IndexedExtraConfigType = { order?: 'asc' | 'desc' };

export class ExtraConfigColumn<
	T extends ColumnBaseConfig<ColumnType> = ColumnBaseConfig<ColumnType>,
> extends GoogleSQLColumn<T, IndexedExtraConfigType> {
	static override readonly [entityKind]: string = 'ExtraConfigColumn';

	override getSQLType(): string {
		return this.getSQLType();
	}

	indexConfig: IndexedExtraConfigType = {
		order: this.config.order ?? 'asc',
	};
	defaultConfig: IndexedExtraConfigType = {
		order: 'asc',
	};

	asc(): Omit<this, 'asc' | 'desc'> {
		this.indexConfig.order = 'asc';
		return this;
	}

	desc(): Omit<this, 'asc' | 'desc'> {
		this.indexConfig.order = 'desc';
		return this;
	}
}

export class IndexedColumn {
	static readonly [entityKind]: string = 'IndexedColumn';
	constructor(
		name: string | undefined,
		keyAsName: boolean,
		type: string,
		indexConfig: IndexedExtraConfigType,
	) {
		this.name = name;
		this.keyAsName = keyAsName;
		this.type = type;
		this.indexConfig = indexConfig;
	}

	name: string | undefined;
	keyAsName: boolean;
	type: string;
	indexConfig: IndexedExtraConfigType;
}

export type AnyGoogleSQLColumn<TPartial extends Partial<ColumnBaseConfig<ColumnType>> = {}> = GoogleSQLColumn<
	Required<Update<ColumnBaseConfig<ColumnType>, TPartial>>
>;

export type GoogleSQLArrayColumnBuilderBaseConfig = ColumnBuilderBaseConfig<'array basecolumn'> & {
	baseBuilder: ColumnBuilderBaseConfig<ColumnType>;
};

export class GoogleSQLArrayBuilder<
	T extends GoogleSQLArrayColumnBuilderBaseConfig,
	TBase extends ColumnBuilderBaseConfig<ColumnType> | GoogleSQLArrayColumnBuilderBaseConfig,
> extends GoogleSQLColumnWithArrayBuilder<
	T & {
		baseBuilder: TBase extends GoogleSQLArrayColumnBuilderBaseConfig ? GoogleSQLArrayBuilder<
				TBase,
				TBase extends { baseBuilder: infer TBaseBuilder extends ColumnBuilderBaseConfig<any> } ? TBaseBuilder
					: never
			>
			: GoogleSQLColumnWithArrayBuilder<TBase, {}>;
	},
	{
		baseBuilder: TBase extends GoogleSQLArrayColumnBuilderBaseConfig ? GoogleSQLArrayBuilder<
				TBase,
				TBase extends { baseBuilder: infer TBaseBuilder extends ColumnBuilderBaseConfig<any> } ? TBaseBuilder
					: never
			>
			: GoogleSQLColumnWithArrayBuilder<TBase, {}>;
		length: number | undefined;
	}
> {
	static override readonly [entityKind]: string = 'GoogleSQLArrayBuilder';

	constructor(
		name: string,
		baseBuilder: GoogleSQLArrayBuilder<T, TBase>['config']['baseBuilder'],
		length: number | undefined,
	) {
		super(name, 'array basecolumn', 'GoogleSQLArray');
		this.config.baseBuilder = baseBuilder;
		this.config.length = length;
	}

	/** @internal */
	override build(table: GoogleSQLTable) {
		const baseColumn: any = this.config.baseBuilder.build(table);
		return new GoogleSQLArray(
			table,
			this.config as any,
			baseColumn,
		);
	}
}

export class GoogleSQLArray<
	T extends ColumnBaseConfig<'array basecolumn'> & {
		length: number | undefined;
		baseBuilder: ColumnBuilderBaseConfig<ColumnType>;
	},
	TBase extends ColumnBuilderBaseConfig<ColumnType>,
> extends GoogleSQLColumn<T, {}> {
	static override readonly [entityKind]: string = 'GoogleSQLArray';

	constructor(
		table: GoogleSQLTable<any>,
		config: GoogleSQLArrayBuilder<T, TBase>['config'],
		readonly baseColumn: GoogleSQLColumn,
		readonly range?: [number | undefined, number | undefined],
	) {
		super(table, config);
	}

	getSQLType(): string {
		return `${this.baseColumn.getSQLType()}[${typeof this.length === 'number' ? this.length : ''}]`;
	}

	override mapFromDriverValue(value: unknown[] | string): T['data'] {
		if (typeof value === 'string') {
			value = parseGoogleSQLArray(value);
		}
		return value.map((v) => this.baseColumn.mapFromDriverValue(v));
	}

	// Needed for arrays of custom types
	mapFromJsonValue(value: unknown[] | string): T['data'] {
		if (typeof value === 'string') {
			// Thank you node-postgres for not parsing enum arrays
			value = parseGoogleSQLArray(value);
		}

		const base = this.baseColumn;

		return 'mapFromJsonValue' in base
			? value.map((v) => (<(value: unknown) => unknown> base.mapFromJsonValue)(v))
			: value.map((v) => base.mapFromDriverValue(v));
	}

	override mapToDriverValue(value: unknown[], isNestedArray = false): unknown[] | string {
		const a = value.map((v) =>
			v === null
				? null
				: is(this.baseColumn, GoogleSQLArray)
				? this.baseColumn.mapToDriverValue(v as unknown[], true)
				: this.baseColumn.mapToDriverValue(v)
		);
		if (isNestedArray) return a;
		return makeGoogleSQLArray(a);
	}
}
