import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import { type Equal, getColumnNameAndConfig } from '~/utils.ts';
import type { AnyGoogleSqlTable, GoogleSqlTable } from '~/google-sql-core/table.ts';
import { GoogleSqlColumn, GoogleSqlColumnWithArrayBuilder } from './common.ts';

/** Spanner driver returns Float32 { value: number }. Extract raw string from driver value. */
function getFloat32DriverValue(value: unknown): string {
	if (typeof value === 'object' && value !== null && 'value' in value) {
		const v = (value as { value: string | number }).value;
		return typeof v === 'string' ? v : String(v);
	}
	if (typeof value === 'string') return value;
	if (typeof value === 'number') return String(value);
	throw new Error(`Cannot convert value ${value} to float32 string`);
}

export class GoogleSqlFloat32StringBuilder extends GoogleSqlColumnWithArrayBuilder<{
	dataType: 'string';
	data: string;
	driverParam: string;
}> {
	static override readonly [entityKind]: string = 'GoogleSqlFloat32StringBuilder';

	constructor(name: string) {
		super(name, 'string', 'GoogleSqlFloat32');
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSqlTable<{ name: TTableName }>,
	) {
		return new GoogleSqlFloat32String(table, this.config);
	}
}

export class GoogleSqlFloat32String<T extends ColumnBaseConfig<'string'>> extends GoogleSqlColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSqlFloat32String';

	constructor(table: GoogleSqlTable<any>, config: GoogleSqlFloat32StringBuilder['config']) {
		super(table, config);
	}

	getSQLType(): string {
		return 'float32';
	}

	override mapFromDriverValue(value: unknown): string {
		return getFloat32DriverValue(value);
	}

	override mapToDriverValue(value: string | number): string {
		if (typeof value === 'string') return value;
		return String(value);
	}
}

export class GoogleSqlFloat32Builder extends GoogleSqlColumnWithArrayBuilder<{
	dataType: 'number float';
	data: number;
	driverParam: string;
}> {
	static override readonly [entityKind]: string = 'GoogleSqlFloat32Builder';

	constructor(name: string) {
		super(name, 'number float', 'GoogleSqlFloat32');
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSqlTable<{ name: TTableName }>,
	) {
		return new GoogleSqlFloat32(table, this.config);
	}
}

export class GoogleSqlFloat32<T extends ColumnBaseConfig<'number float'>> extends GoogleSqlColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSqlFloat32';

	constructor(table: GoogleSqlTable<any>, config: GoogleSqlFloat32Builder['config']) {
		super(table, config);
	}

	getSQLType(): string {
		return 'float32';
	}

	override mapFromDriverValue(value: unknown): number {
		return Number(getFloat32DriverValue(value));
	}

	override mapToDriverValue(value: string | number): string {
		if (typeof value === 'string') return value;
		return String(value);
	}
}

export interface GoogleSqlFloat32Config<TMode extends 'string' | 'number' = 'string' | 'number'> {
	mode?: TMode;
}

export function float32<TMode extends GoogleSqlFloat32Config['mode'] & {}>(
	config?: GoogleSqlFloat32Config<TMode>,
): Equal<TMode, 'number'> extends true ? GoogleSqlFloat32Builder
	: GoogleSqlFloat32StringBuilder;
export function float32<TMode extends GoogleSqlFloat32Config['mode'] & {}>(
	name: string,
	config?: GoogleSqlFloat32Config<TMode>,
): Equal<TMode, 'number'> extends true ? GoogleSqlFloat32Builder
	: GoogleSqlFloat32StringBuilder;
export function float32(
	a?: string | GoogleSqlFloat32Config,
	b: GoogleSqlFloat32Config = {},
) {
	const { name, config } = getColumnNameAndConfig<GoogleSqlFloat32Config | undefined>(a, b);
	if (config?.mode === 'number') {
		return new GoogleSqlFloat32Builder(name);
	}
	// todo: Verify what the default mode should be.
	return new GoogleSqlFloat32StringBuilder(name);
}
