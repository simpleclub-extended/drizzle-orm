import type { AnyGoogleSQLTable, GoogleSQLTable } from '~/google-sql-core/table.ts';
import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import { type Equal, getColumnNameAndConfig } from '~/utils.ts';
import { GoogleSQLColumn, GoogleSQLColumnWithArrayBuilder } from './common.ts';

export class GoogleSQLDecimalBuilder extends GoogleSQLColumnWithArrayBuilder<
	{
		dataType: 'string numeric';
		data: string;
		driverParam: string;
	},
	{
		precision: number | undefined;
		scale: number | undefined;
	}
> {
	static override readonly [entityKind]: string = 'GoogleSQLDecimalBuilder';

	constructor(name: string, precision?: number, scale?: number) {
		super(name, 'string numeric', 'GoogleSQLDecimal');
		this.config.precision = precision;
		this.config.scale = scale;
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSQLTable<{ name: TTableName }>,
	) {
		return new GoogleSQLDecimal(
			table,
			this.config,
		);
	}
}

export class GoogleSQLDecimal<T extends ColumnBaseConfig<'string numeric'>> extends GoogleSQLColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSQLDecimal';

	readonly precision: number | undefined;
	readonly scale: number | undefined;

	constructor(table: GoogleSQLTable<any>, config: GoogleSQLDecimalBuilder['config']) {
		super(table, config);
		this.precision = config.precision;
		this.scale = config.scale;
	}

	override mapFromDriverValue(value: unknown): string {
		if (typeof value === 'string') return value;

		return String(value);
	}

	getSQLType(): string {
		if (this.precision !== undefined && this.scale !== undefined) {
			return `numeric(${this.precision},${this.scale})`;
		} else if (this.precision === undefined) {
			return 'numeric';
		} else {
			return `numeric(${this.precision})`;
		}
	}
}

export class GoogleSQLDecimalNumberBuilder extends GoogleSQLColumnWithArrayBuilder<
	{
		dataType: 'number';
		data: number;
		driverParam: string;
	},
	{
		precision: number | undefined;
		scale: number | undefined;
	}
> {
	static override readonly [entityKind]: string = 'GoogleSQLDecimalNumberBuilder';

	constructor(name: string, precision?: number, scale?: number) {
		super(name, 'number', 'GoogleSQLDecimalNumber');
		this.config.precision = precision;
		this.config.scale = scale;
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSQLTable<{ name: TTableName }>,
	) {
		return new GoogleSQLDecimalNumber(
			table,
			this.config,
		);
	}
}

export class GoogleSQLDecimalNumber<T extends ColumnBaseConfig<'number'>> extends GoogleSQLColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSQLDecimalNumber';

	readonly precision: number | undefined;
	readonly scale: number | undefined;

	constructor(
		table: GoogleSQLTable<any>,
		config: GoogleSQLDecimalNumberBuilder['config'],
	) {
		super(table, config);
		this.precision = config.precision;
		this.scale = config.scale;
	}

	override mapFromDriverValue(value: unknown): number {
		if (typeof value === 'number') return value;

		return Number(value);
	}

	override mapToDriverValue = String;

	getSQLType(): string {
		if (this.precision !== undefined && this.scale !== undefined) {
			return `numeric(${this.precision},${this.scale})`;
		} else if (this.precision === undefined) {
			return 'numeric';
		} else {
			return `numeric(${this.precision})`;
		}
	}
}

export class GoogleSQLDecimalBigIntBuilder extends GoogleSQLColumnWithArrayBuilder<
	{
		dataType: 'bigint int64';
		data: bigint;
		driverParam: string;
	},
	{
		precision: number | undefined;
		scale: number | undefined;
	}
> {
	static override readonly [entityKind]: string = 'GoogleSQLDecimalBigIntBuilder';

	constructor(name: string, precision?: number, scale?: number) {
		super(name, 'bigint int64', 'GoogleSQLDecimalBigInt');
		this.config.precision = precision;
		this.config.scale = scale;
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSQLTable<{ name: TTableName }>,
	) {
		return new GoogleSQLDecimalBigInt(
			table,
			this.config,
		);
	}
}

export class GoogleSQLDecimalBigInt<T extends ColumnBaseConfig<'bigint int64'>> extends GoogleSQLColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSQLDecimalBigInt';

	readonly precision: number | undefined;
	readonly scale: number | undefined;

	constructor(
		table: GoogleSQLTable<any>,
		config: GoogleSQLDecimalBigIntBuilder['config'],
	) {
		super(table, config);
		this.precision = config.precision;
		this.scale = config.scale;
	}

	override mapFromDriverValue = BigInt;

	override mapToDriverValue = String;

	getSQLType(): string {
		if (this.precision !== undefined && this.scale !== undefined) {
			return `numeric(${this.precision},${this.scale})`;
		} else if (this.precision === undefined) {
			return 'numeric';
		} else {
			return `numeric(${this.precision})`;
		}
	}
}

export type GoogleSQLDecimalConfig<
	T extends 'string' | 'number' | 'bigint' = 'string' | 'number' | 'bigint',
> =
	| { precision: number; scale?: number; mode?: T }
	| { precision?: number; scale: number; mode?: T }
	| { precision?: number; scale?: number; mode: T };

export function decimal<TMode extends 'string' | 'number' | 'bigint'>(
	config?: GoogleSQLDecimalConfig<TMode>,
): Equal<TMode, 'number'> extends true ? GoogleSQLDecimalNumberBuilder
	: Equal<TMode, 'bigint'> extends true ? GoogleSQLDecimalBigIntBuilder
	: GoogleSQLDecimalBuilder;
export function decimal<TMode extends 'string' | 'number' | 'bigint'>(
	name: string,
	config?: GoogleSQLDecimalConfig<TMode>,
): Equal<TMode, 'number'> extends true ? GoogleSQLDecimalNumberBuilder
	: Equal<TMode, 'bigint'> extends true ? GoogleSQLDecimalBigIntBuilder
	: GoogleSQLDecimalBuilder;
export function decimal(a?: string | GoogleSQLDecimalConfig, b?: GoogleSQLDecimalConfig) {
	const { name, config } = getColumnNameAndConfig<GoogleSQLDecimalConfig>(a, b);
	const mode = config?.mode;
	return mode === 'number'
		? new GoogleSQLDecimalNumberBuilder(name, config?.precision, config?.scale)
		: mode === 'bigint'
		? new GoogleSQLDecimalBigIntBuilder(name, config?.precision, config?.scale)
		: new GoogleSQLDecimalBuilder(name, config?.precision, config?.scale);
}

// numeric is alias for decimal
export const numeric = decimal;
