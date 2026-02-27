import type { AnyGoogleSQLTable } from '~/google-sql-core/table.ts';
import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import { type Equal, getColumnNameAndConfig } from '~/utils.ts';
import { GoogleSQLColumn } from './common.ts';
import { GoogleSQLDateColumnBaseBuilder } from './date.common.ts';

export class GoogleSQLDateBuilder extends GoogleSQLDateColumnBaseBuilder<{
	dataType: 'object date';
	data: Date;
	driverParam: string;
}> {
	static override readonly [entityKind]: string = 'GoogleSQLDateBuilder';

	constructor(name: string) {
		super(name, 'object date', 'GoogleSQLDate');
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSQLTable<{ name: TTableName }>,
	) {
		return new GoogleSQLDate(
			table,
			this.config,
		);
	}
}

export class GoogleSQLDate<T extends ColumnBaseConfig<'object date'>> extends GoogleSQLColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSQLDate';

	getSQLType(): string {
		return 'date';
	}

	override mapFromDriverValue(value: string): Date {
		return new Date(value);
	}

	override mapToDriverValue(value: Date | string): string {
		if (typeof value === 'string') return value;
		return value.toISOString();
	}
}

export class GoogleSQLDateStringBuilder extends GoogleSQLDateColumnBaseBuilder<{
	dataType: 'string date';
	data: string;
	driverParam: string;
}> {
	static override readonly [entityKind]: string = 'GoogleSQLDateStringBuilder';

	constructor(name: string) {
		super(name, 'string date', 'GoogleSQLDateString');
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSQLTable<{ name: TTableName }>,
	) {
		return new GoogleSQLDateString(
			table,
			this.config,
		);
	}
}

export class GoogleSQLDateString<T extends ColumnBaseConfig<'string date'>> extends GoogleSQLColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSQLDateString';

	getSQLType(): string {
		return 'date';
	}

	override mapToDriverValue(value: Date | string): string {
		if (typeof value === 'string') return value;
		return value.toISOString();
	}
}

export interface GoogleSQLDateConfig<T extends 'date' | 'string' = 'date' | 'string'> {
	mode: T;
}

export function date<TMode extends GoogleSQLDateConfig['mode'] & {}>(
	config?: GoogleSQLDateConfig<TMode>,
): Equal<TMode, 'date'> extends true ? GoogleSQLDateBuilder : GoogleSQLDateStringBuilder;
export function date<TMode extends GoogleSQLDateConfig['mode'] & {}>(
	name: string,
	config?: GoogleSQLDateConfig<TMode>,
): Equal<TMode, 'date'> extends true ? GoogleSQLDateBuilder
	: GoogleSQLDateStringBuilder;
export function date(a?: string | GoogleSQLDateConfig, b?: GoogleSQLDateConfig) {
	const { name, config } = getColumnNameAndConfig<GoogleSQLDateConfig>(a, b);
	if (config?.mode === 'date') {
		return new GoogleSQLDateBuilder(name);
	}
	return new GoogleSQLDateStringBuilder(name);
}
