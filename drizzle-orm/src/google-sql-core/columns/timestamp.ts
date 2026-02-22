import type { AnyGoogleSQLTable, GoogleSQLTable } from '~/google-sql-core/table.ts';
import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import { type Equal, getColumnNameAndConfig } from '~/utils.ts';
import { GoogleSQLColumn } from './common.ts';
import { GoogleSQLDateColumnBaseBuilder } from './date.common.ts';

export class GoogleSQLTimestampBuilder extends GoogleSQLDateColumnBaseBuilder<
	{
		dataType: 'object date';
		data: Date;
		driverParam: string;
	},
	{ withTimezone: boolean; precision: number | undefined }
> {
	static override readonly [entityKind]: string = 'GoogleSQLTimestampBuilder';

	constructor(name: string, withTimezone: boolean, precision: number | undefined) {
		super(name, 'object date', 'GoogleSQLTimestamp');
		this.config.withTimezone = withTimezone;
		this.config.precision = precision;
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSQLTable<{ name: TTableName }>,
	) {
		return new GoogleSQLTimestamp(
			table,
			this.config,
		);
	}
}

export class GoogleSQLTimestamp<T extends ColumnBaseConfig<'object date'>> extends GoogleSQLColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSQLTimestamp';

	readonly withTimezone: boolean;
	readonly precision: number | undefined;

	constructor(table: GoogleSQLTable<any>, config: GoogleSQLTimestampBuilder['config']) {
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

export class GoogleSQLTimestampStringBuilder extends GoogleSQLDateColumnBaseBuilder<
	{
		dataType: 'string timestamp';
		data: string;
		driverParam: string;
	},
	{ withTimezone: boolean; precision: number | undefined }
> {
	static override readonly [entityKind]: string = 'GoogleSQLTimestampStringBuilder';

	constructor(name: string, withTimezone: boolean, precision: number | undefined) {
		super(name, 'string timestamp', 'GoogleSQLTimestampString');
		this.config.withTimezone = withTimezone;
		this.config.precision = precision;
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSQLTable<{ name: TTableName }>,
	) {
		return new GoogleSQLTimestampString(
			table,
			this.config,
		);
	}
}

export class GoogleSQLTimestampString<T extends ColumnBaseConfig<'string timestamp'>> extends GoogleSQLColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSQLTimestampString';

	readonly withTimezone: boolean;
	readonly precision: number | undefined;

	constructor(
		table: GoogleSQLTable<any>,
		config: GoogleSQLTimestampStringBuilder['config'],
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

export interface GoogleSQLTimestampConfig<TMode extends 'date' | 'string' = 'date' | 'string'> {
	mode?: TMode;
	precision?: Precision;
	withTimezone?: boolean;
}

export function timestamp<TMode extends GoogleSQLTimestampConfig['mode'] & {}>(
	config?: GoogleSQLTimestampConfig<TMode>,
): Equal<TMode, 'string'> extends true ? GoogleSQLTimestampStringBuilder
	: GoogleSQLTimestampBuilder;
export function timestamp<TMode extends GoogleSQLTimestampConfig['mode'] & {}>(
	name: string,
	config?: GoogleSQLTimestampConfig<TMode>,
): Equal<TMode, 'string'> extends true ? GoogleSQLTimestampStringBuilder
	: GoogleSQLTimestampBuilder;
export function timestamp(a?: string | GoogleSQLTimestampConfig, b: GoogleSQLTimestampConfig = {}) {
	const { name, config } = getColumnNameAndConfig<GoogleSQLTimestampConfig | undefined>(a, b);
	if (config?.mode === 'string') {
		return new GoogleSQLTimestampStringBuilder(name, config.withTimezone ?? false, config.precision);
	}
	return new GoogleSQLTimestampBuilder(name, config?.withTimezone ?? false, config?.precision);
}
