import type { AnyGoogleSqlTable, GoogleSqlTable } from '~/google-sql-core/table.ts';
import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import { type Equal, getColumnNameAndConfig } from '~/utils.ts';
import { GoogleSqlColumn } from './common.ts';
import { GoogleSqlDateColumnBaseBuilder } from './date.common.ts';

export class GoogleSqlTimestampBuilder extends GoogleSqlDateColumnBaseBuilder<
	{
		dataType: 'object date';
		data: Date;
		driverParam: string;
	},
	{ withTimezone: boolean; precision: number | undefined }
> {
	static override readonly [entityKind]: string = 'GoogleSqlTimestampBuilder';

	constructor(name: string, withTimezone: boolean, precision: number | undefined) {
		super(name, 'object date', 'GoogleSqlTimestamp');
		this.config.withTimezone = withTimezone;
		this.config.precision = precision;
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSqlTable<{ name: TTableName }>,
	) {
		return new GoogleSqlTimestamp(
			table,
			this.config,
		);
	}
}

export class GoogleSqlTimestamp<T extends ColumnBaseConfig<'object date'>> extends GoogleSqlColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSqlTimestamp';

	readonly withTimezone: boolean;
	readonly precision: number | undefined;

	constructor(table: GoogleSqlTable<any>, config: GoogleSqlTimestampBuilder['config']) {
		super(table, config);
		this.withTimezone = config.withTimezone;
		this.precision = config.precision;
	}

	getSQLType(): string {
		return `timestamp`;
	}

	override mapFromDriverValue = (value: string): Date | null => {
		return new Date(value);
	};

	override mapToDriverValue = (value: Date | string): string => {
		if (typeof value === 'string') return value;
		return value.toISOString();
	};
}

export class GoogleSqlTimestampStringBuilder extends GoogleSqlDateColumnBaseBuilder<
	{
		dataType: 'string timestamp';
		data: string;
		driverParam: string;
	},
	{ withTimezone: boolean; precision: number | undefined }
> {
	static override readonly [entityKind]: string = 'GoogleSqlTimestampStringBuilder';

	constructor(name: string, withTimezone: boolean, precision: number | undefined) {
		super(name, 'string timestamp', 'GoogleSqlTimestampString');
		this.config.withTimezone = withTimezone;
		this.config.precision = precision;
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSqlTable<{ name: TTableName }>,
	) {
		return new GoogleSqlTimestampString(
			table,
			this.config,
		);
	}
}

export class GoogleSqlTimestampString<T extends ColumnBaseConfig<'string timestamp'>> extends GoogleSqlColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSqlTimestampString';

	readonly withTimezone: boolean;
	readonly precision: number | undefined;

	constructor(
		table: GoogleSqlTable<any>,
		config: GoogleSqlTimestampStringBuilder['config'],
	) {
		super(table, config);
		this.withTimezone = config.withTimezone;
		this.precision = config.precision;
	}

	getSQLType(): string {
		return `timestamp`;
	}

	override mapToDriverValue = (value: Date | string): string => {
		if (typeof value === 'string') return value;
		return value.toISOString();
	};
}

export type Precision = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface GoogleSqlTimestampConfig<TMode extends 'date' | 'string' = 'date' | 'string'> {
	mode?: TMode;
	precision?: Precision;
	withTimezone?: boolean;
}

export function timestamp<TMode extends GoogleSqlTimestampConfig['mode'] & {}>(
	config?: GoogleSqlTimestampConfig<TMode>,
): Equal<TMode, 'string'> extends true ? GoogleSqlTimestampStringBuilder
	: GoogleSqlTimestampBuilder;
export function timestamp<TMode extends GoogleSqlTimestampConfig['mode'] & {}>(
	name: string,
	config?: GoogleSqlTimestampConfig<TMode>,
): Equal<TMode, 'string'> extends true ? GoogleSqlTimestampStringBuilder
	: GoogleSqlTimestampBuilder;
export function timestamp(a?: string | GoogleSqlTimestampConfig, b: GoogleSqlTimestampConfig = {}) {
	const { name, config } = getColumnNameAndConfig<GoogleSqlTimestampConfig | undefined>(a, b);
	if (config?.mode === 'string') {
		return new GoogleSqlTimestampStringBuilder(name, config.withTimezone ?? false, config.precision);
	}
	return new GoogleSqlTimestampBuilder(name, config?.withTimezone ?? false, config?.precision);
}
