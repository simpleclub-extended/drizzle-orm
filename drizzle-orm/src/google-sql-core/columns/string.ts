import type { AnyGoogleSqlTable } from '~/google-sql-core/table.ts';
import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import { type Equal, getColumnNameAndConfig, type Writable } from '~/utils.ts';
import { GoogleSqlColumn, GoogleSqlColumnWithArrayBuilder } from './common.ts';

export class GoogleSqlStringBuilder<TEnum extends [string, ...string[]]> extends GoogleSqlColumnWithArrayBuilder<
	{
		dataType: Equal<TEnum, [string, ...string[]]> extends true ? 'string' : 'string enum';
		data: TEnum[number];
		enumValues: TEnum;
		driverParam: string;
	},
	{ enumValues: TEnum | undefined; length: number | undefined }
> {
	static override readonly [entityKind]: string = 'GoogleSqlStringBuilder';

	constructor(name: string, config: GoogleSqlStringConfig<TEnum>) {
		super(name, config.enum?.length ? 'string enum' : 'string', 'GoogleSqlString');
		this.config.enumValues = config.enum;
		this.config.length = config.length;
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSqlTable<{ name: TTableName }>,
	) {
		return new GoogleSqlString(
			table,
			this.config,
		);
	}
}

export class GoogleSqlString<
	T extends ColumnBaseConfig<'string' | 'string enum'>,
> extends GoogleSqlColumn<T, { enumValues: [string, ...string[]] | undefined }> {
	static override readonly [entityKind]: string = 'GoogleSqlString';

	override readonly enumValues = this.config.enumValues;

	getSQLType(): string {
		return this.length === undefined ? `string(max)` : `string(${this.length})`;
	}
}

export interface GoogleSqlStringConfig<
	TEnum extends readonly string[] | string[] | undefined = readonly string[] | string[] | undefined,
> {
	enum?: TEnum;
	length?: number | undefined;
}

export interface GoogleSqlTextConfig<
	TEnum extends readonly string[] | string[] | undefined = readonly string[] | string[] | undefined,
> {
	enum?: TEnum;
}

export function string(): GoogleSqlStringBuilder<[string, ...string[]]>;
export function string<
	U extends string,
	T extends Readonly<[U, ...U[]]>,
>(
	config?: GoogleSqlStringConfig<T | Writable<T>>,
): GoogleSqlStringBuilder<Writable<T>>;
export function string<
	U extends string,
	T extends Readonly<[U, ...U[]]>,
>(
	name: string,
	config?: GoogleSqlStringConfig<T | Writable<T>>,
): GoogleSqlStringBuilder<Writable<T>>;
export function string(a?: string | GoogleSqlStringConfig, b: GoogleSqlStringConfig = {}): any {
	const { name, config } = getColumnNameAndConfig<GoogleSqlStringConfig>(a, b);
	return new GoogleSqlStringBuilder(name, config as any);
}

// text is alias for string but without ability to add length
export function text(): GoogleSqlStringBuilder<[string, ...string[]]>;
export function text<
	U extends string,
	T extends Readonly<[U, ...U[]]>,
>(
	config?: GoogleSqlTextConfig<T | Writable<T>>,
): GoogleSqlStringBuilder<Writable<T>>;
export function text<
	U extends string,
	T extends Readonly<[U, ...U[]]>,
>(
	name: string,
	config?: GoogleSqlTextConfig<T | Writable<T>>,
): GoogleSqlStringBuilder<Writable<T>>;
export function text(a?: string | GoogleSqlStringConfig, b: GoogleSqlStringConfig = {}): any {
	const { name, config } = getColumnNameAndConfig<GoogleSqlStringConfig>(a, b);
	return new GoogleSqlStringBuilder(name, config as any);
}
