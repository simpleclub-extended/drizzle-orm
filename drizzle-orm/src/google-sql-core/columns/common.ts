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
import type { AnyGoogleSqlTable, GoogleSqlTable } from '~/google-sql-core/table.ts';
import type { SQL } from '~/sql/sql.ts';
import { iife } from '~/tracing-utils.ts';
import { makeGoogleSqlArray, parseGoogleSqlArray } from '../utils/array.ts';

export type GoogleSqlColumns = Record<string, GoogleSqlColumn<any>>;

export interface ReferenceConfig {
	ref: () => GoogleSqlColumn;
	config: {
		name?: string;
		onUpdate?: UpdateDeleteAction;
		onDelete?: UpdateDeleteAction;
	};
}
export abstract class GoogleSqlColumnBuilder<
	T extends ColumnBuilderBaseConfig<ColumnType> = ColumnBuilderBaseConfig<ColumnType>,
	TRuntimeConfig extends object = object,
> extends ColumnBuilder<T, TRuntimeConfig> {
	private foreignKeyConfigs: ReferenceConfig[] = [];

	static override readonly [entityKind]: string = 'GoogleSqlColumnBuilder';

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
	buildForeignKeys(column: GoogleSqlColumn, table: GoogleSqlTable): ForeignKey[] {
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
	abstract build(table: GoogleSqlTable): GoogleSqlColumn<any>;

	/** @internal */
	buildExtraConfigColumn<TTableName extends string>(
		table: AnyGoogleSqlTable<{ name: TTableName }>,
	): ExtraConfigColumn {
		return new ExtraConfigColumn(table, this.config);
	}
}

export abstract class GoogleSqlColumnWithArrayBuilder<
	T extends ColumnBuilderBaseConfig<ColumnType> = ColumnBuilderBaseConfig<ColumnType>,
	TRuntimeConfig extends object = object,
> extends GoogleSqlColumnBuilder<T, TRuntimeConfig> {
	static override readonly [entityKind]: string = 'GoogleSqlColumnWithArrayBuilder';
	array<TSize extends number | undefined = undefined>(size?: TSize): Omit<
		GoogleSqlArrayBuilder<
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
		return new GoogleSqlArrayBuilder(
			this.config.name,
			this as GoogleSqlColumnWithArrayBuilder<any, any>,
			size as any,
		) as any; // size as any
	}
}

// To understand how to use `GoogleSqlColumn` and `AnyGoogleSqlColumn`, see `Column` and `AnyColumn` documentation.
export abstract class GoogleSqlColumn<
	T extends ColumnBaseConfig<ColumnType> = ColumnBaseConfig<ColumnType>,
	TRuntimeConfig extends object = {},
> extends Column<T, TRuntimeConfig> {
	static override readonly [entityKind]: string = 'GoogleSqlColumn';

	/** @internal */
	override readonly table: GoogleSqlTable;

	constructor(
		table: GoogleSqlTable,
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
> extends GoogleSqlColumn<T, IndexedExtraConfigType> {
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

export type AnyGoogleSqlColumn<TPartial extends Partial<ColumnBaseConfig<ColumnType>> = {}> = GoogleSqlColumn<
	Required<Update<ColumnBaseConfig<ColumnType>, TPartial>>
>;

export type GoogleSqlArrayColumnBuilderBaseConfig = ColumnBuilderBaseConfig<'array basecolumn'> & {
	baseBuilder: ColumnBuilderBaseConfig<ColumnType>;
};

export class GoogleSqlArrayBuilder<
	T extends GoogleSqlArrayColumnBuilderBaseConfig,
	TBase extends ColumnBuilderBaseConfig<ColumnType> | GoogleSqlArrayColumnBuilderBaseConfig,
> extends GoogleSqlColumnWithArrayBuilder<
	T & {
		baseBuilder: TBase extends GoogleSqlArrayColumnBuilderBaseConfig ? GoogleSqlArrayBuilder<
				TBase,
				TBase extends { baseBuilder: infer TBaseBuilder extends ColumnBuilderBaseConfig<any> } ? TBaseBuilder
					: never
			>
			: GoogleSqlColumnWithArrayBuilder<TBase, {}>;
	},
	{
		baseBuilder: TBase extends GoogleSqlArrayColumnBuilderBaseConfig ? GoogleSqlArrayBuilder<
				TBase,
				TBase extends { baseBuilder: infer TBaseBuilder extends ColumnBuilderBaseConfig<any> } ? TBaseBuilder
					: never
			>
			: GoogleSqlColumnWithArrayBuilder<TBase, {}>;
		length: number | undefined;
	}
> {
	static override readonly [entityKind]: string = 'GoogleSqlArrayBuilder';

	constructor(
		name: string,
		baseBuilder: GoogleSqlArrayBuilder<T, TBase>['config']['baseBuilder'],
		length: number | undefined,
	) {
		super(name, 'array basecolumn', 'GoogleSqlArray');
		this.config.baseBuilder = baseBuilder;
		this.config.length = length;
	}

	/** @internal */
	override build(table: GoogleSqlTable) {
		const baseColumn: any = this.config.baseBuilder.build(table);
		return new GoogleSqlArray(
			table,
			this.config as any,
			baseColumn,
		);
	}
}

export class GoogleSqlArray<
	T extends ColumnBaseConfig<'array basecolumn'> & {
		length: number | undefined;
		baseBuilder: ColumnBuilderBaseConfig<ColumnType>;
	},
	TBase extends ColumnBuilderBaseConfig<ColumnType>,
> extends GoogleSqlColumn<T, {}> {
	static override readonly [entityKind]: string = 'GoogleSqlArray';

	constructor(
		table: GoogleSqlTable<any>,
		config: GoogleSqlArrayBuilder<T, TBase>['config'],
		readonly baseColumn: GoogleSqlColumn,
		readonly range?: [number | undefined, number | undefined],
	) {
		super(table, config);
	}

	getSQLType(): string {
		return `${this.baseColumn.getSQLType()}[${typeof this.length === 'number' ? this.length : ''}]`;
	}

	override mapFromDriverValue(value: unknown[] | string): T['data'] {
		if (typeof value === 'string') {
			value = parseGoogleSqlArray(value);
		}
		return value.map((v) => this.baseColumn.mapFromDriverValue(v));
	}

	// Needed for arrays of custom types
	mapFromJsonValue(value: unknown[] | string): T['data'] {
		if (typeof value === 'string') {
			// Thank you node-postgres for not parsing enum arrays
			value = parseGoogleSqlArray(value);
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
				: is(this.baseColumn, GoogleSqlArray)
				? this.baseColumn.mapToDriverValue(v as unknown[], true)
				: this.baseColumn.mapToDriverValue(v)
		);
		if (isNestedArray) return a;
		return makeGoogleSqlArray(a);
	}
}
