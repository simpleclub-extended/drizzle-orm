import type { IsIdentity } from '~/column-builder.ts';
import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import { type Equal, getColumnNameAndConfig } from '~/utils.ts';
import type { AnyGoogleSqlTable, GoogleSqlTable } from '../table.ts';
import { GoogleSqlColumn, GoogleSqlColumnWithArrayBuilder } from './common.ts';
import type { GoogleSqlSequenceOptions } from '../sequence.ts';

/** Spanner driver returns Int { value: string }. Extract raw string from driver value. */
function getInt64DriverValue(value: unknown): string {
	if (typeof value === 'object' && value !== null && 'value' in value) {
		const v = (value as { value: string | number }).value;
		return typeof v === 'string' ? v : String(v);
	}
	if (typeof value === 'string') return value;
	if (typeof value === 'number') return String(value);
	throw new Error(`Cannot convert value ${value} to int64 string`);
}

function parseToSafeInteger(s: string): number {
	const num = Number(s);
	if (Number.isNaN(num) || num < Number.MIN_SAFE_INTEGER || num > Number.MAX_SAFE_INTEGER) {
		throw new Error(`Integer ${s} is out of bounds.`);
	}
	return num;
}

export class GoogleSqlInt64StringBuilder extends GoogleSqlColumnWithArrayBuilder<{
	dataType: 'string int64';
	data: string;
	driverParam: string;
}> {
	static override readonly [entityKind]: string = 'GoogleSqlInt64StringBuilder';

	constructor(name: string) {
		super(name, 'string int64', 'GoogleSqlInt64');
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSqlTable<{ name: TTableName }>,
	) {
		return new GoogleSqlInt64String(table, this.config);
	}

	generatedByDefaultAsIdentity(
		sequence?: GoogleSqlSequenceOptions,
	): IsIdentity<this, 'byDefault'> {
		this.config.generatedIdentity = sequence
			? {
				type: 'byDefault',
				sequenceOptions: sequence,
			}
			: {
				type: 'byDefault',
			};

		this.config.hasDefault = true;
		this.config.notNull = true;

		return this as IsIdentity<this, 'byDefault'>;
	}
}

export class GoogleSqlInt64String<T extends ColumnBaseConfig<'string int64'>> extends GoogleSqlColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSqlInt64String';

	getSQLType(): string {
		return 'int64';
	}

	override mapFromDriverValue(value: unknown): string {
		return getInt64DriverValue(value);
	}

	override mapToDriverValue(value: string | number | bigint): string {
		if (typeof value === 'string') return value;
		if (typeof value === 'bigint') return String(value);
		return String(value);
	}
}

export class GoogleSqlInt64NumberBuilder extends GoogleSqlColumnWithArrayBuilder<{
	dataType: 'number';
	data: number;
	driverParam: string;
}> {
	static override readonly [entityKind]: string = 'GoogleSqlInt64NumberBuilder';

	constructor(name: string) {
		super(name, 'number', 'GoogleSqlInt64');
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSqlTable<{ name: TTableName }>,
	) {
		return new GoogleSqlInt64Number(table, this.config);
	}

	generatedByDefaultAsIdentity(
		sequence?: GoogleSqlSequenceOptions,
	): IsIdentity<this, 'byDefault'> {
		this.config.generatedIdentity = sequence
			? {
				type: 'byDefault',
				sequenceOptions: sequence,
			}
			: {
				type: 'byDefault',
			};

		this.config.hasDefault = true;
		this.config.notNull = true;

		return this as IsIdentity<this, 'byDefault'>;
	}
}

export class GoogleSqlInt64Number<T extends ColumnBaseConfig<'number'>> extends GoogleSqlColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSqlInt64Number';

	getSQLType(): string {
		return 'int64';
	}

	override mapFromDriverValue(value: unknown): number {
		return parseToSafeInteger(getInt64DriverValue(value));
	}

	override mapToDriverValue(value: string | number | bigint): string {
		if (typeof value === 'string') return value;
		if (typeof value === 'bigint') return String(value);
		return String(value);
	}
}

export class GoogleSqlInt64Builder extends GoogleSqlColumnWithArrayBuilder<{
	dataType: 'bigint int64';
	data: bigint;
	driverParam: string;
}> {
	static override readonly [entityKind]: string = 'GoogleSqlInt64Builder';

	constructor(name: string) {
		super(name, 'bigint int64', 'GoogleSqlInt64');
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSqlTable<{ name: TTableName }>,
	) {
		return new GoogleSqlInt64(table, this.config);
	}

	generatedByDefaultAsIdentity(
		sequence?: GoogleSqlSequenceOptions,
	): IsIdentity<this, 'byDefault'> {
		this.config.generatedIdentity = sequence
			? {
				type: 'byDefault',
				sequenceOptions: sequence,
			}
			: {
				type: 'byDefault',
			};

		this.config.hasDefault = true;
		this.config.notNull = true;

		return this as IsIdentity<this, 'byDefault'>;
	}
}

export class GoogleSqlInt64<T extends ColumnBaseConfig<'bigint int64'>> extends GoogleSqlColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSqlInt64';

	getSQLType(): string {
		return 'int64';
	}

	override mapFromDriverValue(value: unknown): bigint {
		return BigInt(getInt64DriverValue(value));
	}

	override mapToDriverValue(value: string | number | bigint): string {
		if (typeof value === 'string') return value;
		if (typeof value === 'bigint') return String(value);
		return String(value);
	}
}

export interface GoogleSqlInt64Config<TMode extends 'string' | 'number' | 'bigint' = 'string' | 'number' | 'bigint'> {
	mode?: TMode;
}

export function int64<TMode extends GoogleSqlInt64Config['mode'] & {}>(
	config?: GoogleSqlInt64Config<TMode>,
): Equal<TMode, 'string'> extends true ? GoogleSqlInt64StringBuilder
	: Equal<TMode, 'number'> extends true ? GoogleSqlInt64NumberBuilder
	: GoogleSqlInt64Builder;
export function int64<TMode extends GoogleSqlInt64Config['mode'] & {}>(
	name: string,
	config?: GoogleSqlInt64Config<TMode>,
): Equal<TMode, 'string'> extends true ? GoogleSqlInt64StringBuilder
	: Equal<TMode, 'number'> extends true ? GoogleSqlInt64NumberBuilder
	: GoogleSqlInt64Builder;
export function int64(
	a?: string | GoogleSqlInt64Config,
	b: GoogleSqlInt64Config = {},
) {
	const { name, config } = getColumnNameAndConfig<GoogleSqlInt64Config | undefined>(a, b);
	if (config?.mode === 'string') {
		return new GoogleSqlInt64StringBuilder(name);
	}
	if (config?.mode === 'number') {
		return new GoogleSqlInt64NumberBuilder(name);
	}
	// todo: Verify what the default mode should be.
	return new GoogleSqlInt64Builder(name);
}
