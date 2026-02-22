import type { AnyGoogleSQLTable } from '~/google-sql-core/table.ts';
import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import { type Equal, getColumnNameAndConfig, type Writable } from '~/utils.ts';
import { GoogleSQLColumn, GoogleSQLColumnWithArrayBuilder } from './common.ts';

export class GoogleSQLStringBuilder<TEnum extends [string, ...string[]]> extends GoogleSQLColumnWithArrayBuilder<
	{
		dataType: Equal<TEnum, [string, ...string[]]> extends true ? 'string' : 'string enum';
		data: TEnum[number];
		enumValues: TEnum;
		driverParam: string;
	},
	{ enumValues: TEnum | undefined; length: number | undefined }
> {
	static override readonly [entityKind]: string = 'GoogleSQLStringBuilder';

	constructor(name: string, config: GoogleSQLStringConfig<TEnum>) {
		super(name, config.enum?.length ? 'string enum' : 'string', 'GoogleSQLString');
		this.config.enumValues = config.enum;
		this.config.length = config.length;
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSQLTable<{ name: TTableName }>,
	) {
		return new GoogleSQLString(
			table,
			this.config,
		);
	}
}

export class GoogleSQLString<
	T extends ColumnBaseConfig<'string' | 'string enum'>,
> extends GoogleSQLColumn<T, { enumValues: [string, ...string[]] | undefined }> {
	static override readonly [entityKind]: string = 'GoogleSQLString';

	override readonly enumValues = this.config.enumValues;

	getSQLType(): string {
		return this.length === undefined ? `string(max)` : `string(${this.length})`;
	}
}

export interface GoogleSQLStringConfig<
	TEnum extends readonly string[] | string[] | undefined = readonly string[] | string[] | undefined,
> {
	enum?: TEnum;
	length?: number | undefined;
}

export interface GoogleSQLTextConfig<
	TEnum extends readonly string[] | string[] | undefined = readonly string[] | string[] | undefined,
> {
	enum?: TEnum;
}

export function string(): GoogleSQLStringBuilder<[string, ...string[]]>;
export function string<
	U extends string,
	T extends Readonly<[U, ...U[]]>,
>(
	config?: GoogleSQLStringConfig<T | Writable<T>>,
): GoogleSQLStringBuilder<Writable<T>>;
export function string<
	U extends string,
	T extends Readonly<[U, ...U[]]>,
>(
	name: string,
	config?: GoogleSQLStringConfig<T | Writable<T>>,
): GoogleSQLStringBuilder<Writable<T>>;
export function string(a?: string | GoogleSQLStringConfig, b: GoogleSQLStringConfig = {}): any {
	const { name, config } = getColumnNameAndConfig<GoogleSQLStringConfig>(a, b);
	return new GoogleSQLStringBuilder(name, config as any);
}

// text is alias for string but without ability to add length
export function text(): GoogleSQLStringBuilder<[string, ...string[]]>;
export function text<
	U extends string,
	T extends Readonly<[U, ...U[]]>,
>(
	config?: GoogleSQLTextConfig<T | Writable<T>>,
): GoogleSQLStringBuilder<Writable<T>>;
export function text<
	U extends string,
	T extends Readonly<[U, ...U[]]>,
>(
	name: string,
	config?: GoogleSQLTextConfig<T | Writable<T>>,
): GoogleSQLStringBuilder<Writable<T>>;
export function text(a?: string | GoogleSQLStringConfig, b: GoogleSQLStringConfig = {}): any {
	const { name, config } = getColumnNameAndConfig<GoogleSQLStringConfig>(a, b);
	return new GoogleSQLStringBuilder(name, config as any);
}
