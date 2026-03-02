import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import { type Equal, getColumnNameAndConfig } from '~/utils.ts';
import type { AnyGoogleSqlTable, GoogleSqlTable } from '~/google-sql-core/table.ts';
import { GoogleSqlColumn, GoogleSqlColumnWithArrayBuilder } from './common.ts';

/** Spanner driver returns Numeric { value: string }. Extract raw string from driver value. */
function getNumericDriverValue(value: unknown): string {
	if (typeof value === 'object' && value !== null && 'value' in value) {
		const v = (value as { value: string | number }).value;
		return typeof v === 'string' ? v : String(v);
	}
	if (typeof value === 'string') return value;
	if (typeof value === 'number') return String(value);
	throw new Error(`Cannot convert value ${value} to numeric string`);
}

export class GoogleSqlNumericStringBuilder extends GoogleSqlColumnWithArrayBuilder<{
	dataType: 'string numeric';
	data: string;
	driverParam: string;
}> {
	static override readonly [entityKind]: string = 'GoogleSqlNumericStringBuilder';

	constructor(name: string) {
		super(name, 'string numeric', 'GoogleSqlNumeric');
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSqlTable<{ name: TTableName }>,
	) {
		return new GoogleSqlNumericString(table, this.config);
	}
}

export class GoogleSqlNumericString<T extends ColumnBaseConfig<'string numeric'>> extends GoogleSqlColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSqlNumericString';

	constructor(table: GoogleSqlTable<any>, config: GoogleSqlNumericStringBuilder['config']) {
		super(table, config);
	}

	getSQLType(): string {
		return 'numeric';
	}

	override mapFromDriverValue(value: unknown): string {
		return getNumericDriverValue(value);
	}

	override mapToDriverValue(value: string | number): string {
		if (typeof value === 'string') return value;
		return String(value);
	}
}

export class GoogleSqlNumericBuilder extends GoogleSqlColumnWithArrayBuilder<{
	dataType: 'number';
	data: number;
	driverParam: string;
}> {
	static override readonly [entityKind]: string = 'GoogleSqlNumericBuilder';

	constructor(name: string) {
		super(name, 'number', 'GoogleSqlNumeric');
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSqlTable<{ name: TTableName }>,
	) {
		return new GoogleSqlNumeric(table, this.config);
	}
}

export class GoogleSqlNumeric<T extends ColumnBaseConfig<'number'>> extends GoogleSqlColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSqlNumeric';

	constructor(table: GoogleSqlTable<any>, config: GoogleSqlNumericBuilder['config']) {
		super(table, config);
	}

	getSQLType(): string {
		return 'numeric';
	}

	override mapFromDriverValue(value: unknown): number {
		return Number(getNumericDriverValue(value));
	}

	override mapToDriverValue(value: string | number): string {
		if (typeof value === 'string') return value;
		return String(value);
	}
}

export interface GoogleSqlNumericConfig<TMode extends 'string' | 'number' = 'string' | 'number'> {
	mode?: TMode;
}

export function numeric<TMode extends GoogleSqlNumericConfig['mode'] & {}>(
	config?: GoogleSqlNumericConfig<TMode>,
): Equal<TMode, 'number'> extends true ? GoogleSqlNumericBuilder
	: GoogleSqlNumericStringBuilder;
export function numeric<TMode extends GoogleSqlNumericConfig['mode'] & {}>(
	name: string,
	config?: GoogleSqlNumericConfig<TMode>,
): Equal<TMode, 'number'> extends true ? GoogleSqlNumericBuilder
	: GoogleSqlNumericStringBuilder;
export function numeric(
	a?: string | GoogleSqlNumericConfig,
	b: GoogleSqlNumericConfig = {},
) {
	const { name, config } = getColumnNameAndConfig<GoogleSqlNumericConfig | undefined>(a, b);
	if (config?.mode === 'number') {
		return new GoogleSqlNumericBuilder(name);
	}
	// todo: Verify what the default mode should be.
	return new GoogleSqlNumericStringBuilder(name);
}
