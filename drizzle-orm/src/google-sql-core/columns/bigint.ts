import type { AnyGoogleSQLTable } from '~/google-sql-core/table.ts';
import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import { getColumnNameAndConfig } from '~/utils.ts';
import { CockroachColumn } from './common.ts';
import { CockroachIntColumnBaseBuilder } from './int.common.ts';

export class GoogleSQLBigInt53Builder extends GoogleSQLIntColumnBaseBuilder<{
	dataType: 'number int53';
	data: number;
	driverParam: number | string;
}> {
	static override readonly [entityKind]: string = 'GoogleSQLBigInt53Builder';

	constructor(name: string) {
		super(name, 'number int53', 'GoogleSQLBigInt53');
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSQLTable<{ name: TTableName }>,
	) {
		return new GoogleSQLBigInt53(
			table,
			this.config,
		);
	}
}

export class GoogleSQLBigInt53<T extends ColumnBaseConfig<'number int53'>> extends GoogleSQLColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSQLBigInt53';

	getSQLType(): string {
		return 'int64'; // Google SQL does not have an int8 data type.
	}

	override mapFromDriverValue(value: number | string): number {
		if (typeof value === 'number') {
			return value;
		}
		return Number(value);
	}
}

export class GoogleSQLBigInt64Builder extends GoogleSQLIntColumnBaseBuilder<{
	dataType: 'bigint int64';
	data: bigint;
	driverParam: string;
}> {
	static override readonly [entityKind]: string = 'GoogleSQLBigInt64Builder';

	constructor(name: string) {
		super(name, 'bigint int64', 'GoogleSQLBigInt64');
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSQLTable<{ name: TTableName }>,
	) {
		return new GoogleSQLBigInt64(
			table,
			this.config,
		);
	}
}

export class GoogleSQLBigInt64<T extends ColumnBaseConfig<'bigint int64'>> extends GoogleSQLColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSQLBigInt64';

	getSQLType(): string {
		return 'int64';
	}

	// eslint-disable-next-line unicorn/prefer-native-coercion-functions
	override mapFromDriverValue(value: string): bigint {
		return BigInt(value);
	}
}

export interface GoogleSQLBigIntConfig<T extends 'number' | 'bigint' = 'number' | 'bigint'> {
	mode: T;
}

export function bigint<TMode extends GoogleSQLBigIntConfig['mode']>(
	config: GoogleSQLBigIntConfig<TMode>,
): TMode extends 'number' ? GoogleSQLBigInt53Builder : GoogleSQLBigInt64Builder;
export function bigint<TMode extends GoogleSQLBigIntConfig['mode']>(
	name: string,
	config: GoogleSQLBigIntConfig<TMode>,
): TMode extends 'number' ? GoogleSQLBigInt53Builder : GoogleSQLBigInt64Builder;
export function bigint(a: string | GoogleSQLBigIntConfig, b?: GoogleSQLBigIntConfig) {
	const { name, config } = getColumnNameAndConfig<GoogleSQLBigIntConfig>(a, b);
	if (config.mode === 'number') {
		return new GoogleSQLBigInt53Builder(name);
	}
	return new GoogleSQLBigInt64Builder(name);
}
export function int8<TMode extends GoogleSQLBigIntConfig['mode']>(
	config: GoogleSQLBigIntConfig<TMode>,
): TMode extends 'number' ? GoogleSQLBigInt53Builder : GoogleSQLBigInt64Builder;
export function int8<TMode extends GoogleSQLBigIntConfig['mode']>(
	name: string,
	config: GoogleSQLBigIntConfig<TMode>,
): TMode extends 'number' ? GoogleSQLBigInt53Builder : GoogleSQLBigInt64Builder;
export function int8(a: string | GoogleSQLBigIntConfig, b?: GoogleSQLBigIntConfig) {
	const { name, config } = getColumnNameAndConfig<GoogleSQLBigIntConfig>(a, b);
	if (config.mode === 'number') {
		return new GoogleSQLBigInt53Builder(name);
	}
	return new GoogleSQLBigInt64Builder(name);
}
