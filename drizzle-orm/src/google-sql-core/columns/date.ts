import type { AnyGoogleSqlTable } from '~/google-sql-core/table.ts';
import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import { type Equal, getColumnNameAndConfig } from '~/utils.ts';
import { GoogleSqlColumn } from './common.ts';
import { GoogleSqlDateColumnBaseBuilder } from './date.common.ts';

export class GoogleSqlDateBuilder extends GoogleSqlDateColumnBaseBuilder<{
	dataType: 'object date';
	data: Date;
	driverParam: string;
}> {
	static override readonly [entityKind]: string = 'GoogleSqlDateBuilder';

	constructor(name: string) {
		super(name, 'object date', 'GoogleSqlDate');
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSqlTable<{ name: TTableName }>,
	) {
		return new GoogleSqlDate(
			table,
			this.config,
		);
	}
}

export class GoogleSqlDate<T extends ColumnBaseConfig<'object date'>> extends GoogleSqlColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSqlDate';

	getSQLType(): string {
		return 'date';
	}

	override mapFromDriverValue(value: unknown): Date {
		return new Date(value);
	}

	override mapToDriverValue(value: Date | string): string {
		if (typeof value === 'string') return value;
		return value.toISOString();
	}
}

export class GoogleSqlDateStringBuilder extends GoogleSqlDateColumnBaseBuilder<{
	dataType: 'string date';
	data: string;
	driverParam: string;
}> {
	static override readonly [entityKind]: string = 'GoogleSqlDateStringBuilder';

	constructor(name: string) {
		super(name, 'string date', 'GoogleSqlDateString');
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSqlTable<{ name: TTableName }>,
	) {
		return new GoogleSqlDateString(
			table,
			this.config,
		);
	}
}

export class GoogleSqlDateString<T extends ColumnBaseConfig<'string date'>> extends GoogleSqlColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSqlDateString';

	getSQLType(): string {
		return 'date';
	}

	override mapToDriverValue(value: Date | string): string {
		if (typeof value === 'string') return value;
		return value.toISOString();
	}
}

export interface GoogleSqlDateConfig<T extends 'date' | 'string' = 'date' | 'string'> {
	mode: T;
}

export function date<TMode extends GoogleSqlDateConfig['mode'] & {}>(
	config?: GoogleSqlDateConfig<TMode>,
): Equal<TMode, 'date'> extends true ? GoogleSqlDateBuilder : GoogleSqlDateStringBuilder;
export function date<TMode extends GoogleSqlDateConfig['mode'] & {}>(
	name: string,
	config?: GoogleSqlDateConfig<TMode>,
): Equal<TMode, 'date'> extends true ? GoogleSqlDateBuilder
	: GoogleSqlDateStringBuilder;
export function date(a?: string | GoogleSqlDateConfig, b?: GoogleSqlDateConfig) {
	const { name, config } = getColumnNameAndConfig<GoogleSqlDateConfig>(a, b);
	if (config?.mode === 'date') {
		return new GoogleSqlDateBuilder(name);
	}
	return new GoogleSqlDateStringBuilder(name);
}
