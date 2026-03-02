import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import { type Equal, getColumnNameAndConfig } from '~/utils.ts';
import type { AnyGoogleSqlTable, GoogleSqlTable } from '~/google-sql-core/table.ts';
import { GoogleSqlColumn, GoogleSqlColumnWithArrayBuilder } from './common.ts';

/** Spanner driver returns Float { value: string }. Extract raw string from driver value. */
function getFloat64DriverValue(value: unknown): string {
	if (typeof value === 'object' && value !== null && 'value' in value) {
		const v = (value as { value: string | number }).value;
		return typeof v === 'string' ? v : String(v);
	}
	if (typeof value === 'string') return value;
	if (typeof value === 'number') return String(value);
	throw new Error(`Cannot convert value ${value} to float64 string`);
}

export class GoogleSqlFloat64StringBuilder extends GoogleSqlColumnWithArrayBuilder<{
	dataType: 'string';
	data: string;
	driverParam: string;
}> {
	static override readonly [entityKind]: string = 'GoogleSqlFloat64StringBuilder';

	constructor(name: string) {
		super(name, 'string', 'GoogleSqlFloat64');
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSqlTable<{ name: TTableName }>,
	) {
		return new GoogleSqlFloat64String(table, this.config);
	}
}

export class GoogleSqlFloat64String<T extends ColumnBaseConfig<'string'>> extends GoogleSqlColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSqlFloat64String';

	constructor(table: GoogleSqlTable<any>, config: GoogleSqlFloat64StringBuilder['config']) {
		super(table, config);
	}

	getSQLType(): string {
		return 'float64';
	}

	override mapFromDriverValue(value: unknown): string {
		return getFloat64DriverValue(value);
	}

	override mapToDriverValue(value: string | number): string {
		if (typeof value === 'string') return value;
		return String(value);
	}
}

export class GoogleSqlFloat64Builder extends GoogleSqlColumnWithArrayBuilder<{
	dataType: 'number double';
	data: number;
	driverParam: string;
}> {
	static override readonly [entityKind]: string = 'GoogleSqlFloat64Builder';

	constructor(name: string) {
		super(name, 'number double', 'GoogleSqlFloat64');
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSqlTable<{ name: TTableName }>,
	) {
		return new GoogleSqlFloat64(table, this.config);
	}
}

export class GoogleSqlFloat64<T extends ColumnBaseConfig<'number double'>> extends GoogleSqlColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSqlFloat64';

	constructor(table: GoogleSqlTable<any>, config: GoogleSqlFloat64Builder['config']) {
		super(table, config);
	}

	getSQLType(): string {
		return 'float64';
	}

	override mapFromDriverValue(value: unknown): number {
		return Number(getFloat64DriverValue(value));
	}

	override mapToDriverValue(value: string | number): string {
		if (typeof value === 'string') return value;
		return String(value);
	}
}

export interface GoogleSqlFloat64Config<TMode extends 'string' | 'number' = 'string' | 'number'> {
	mode?: TMode;
}

export function float64<TMode extends GoogleSqlFloat64Config['mode'] & {}>(
	config?: GoogleSqlFloat64Config<TMode>,
): Equal<TMode, 'number'> extends true ? GoogleSqlFloat64Builder
	: GoogleSqlFloat64StringBuilder;
export function float64<TMode extends GoogleSqlFloat64Config['mode'] & {}>(
	name: string,
	config?: GoogleSqlFloat64Config<TMode>,
): Equal<TMode, 'number'> extends true ? GoogleSqlFloat64Builder
	: GoogleSqlFloat64StringBuilder;
export function float64(
	a?: string | GoogleSqlFloat64Config,
	b: GoogleSqlFloat64Config = {},
) {
	const { name, config } = getColumnNameAndConfig<GoogleSqlFloat64Config | undefined>(a, b);
	if (config?.mode === 'number') {
		return new GoogleSqlFloat64Builder(name);
	}
	// todo: Verify what the default mode should be.
	return new GoogleSqlFloat64StringBuilder(name);
}

// double precision is alias for float64
export const doublePrecision = float64;
