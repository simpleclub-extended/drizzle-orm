import type { AnyGoogleSqlTable, GoogleSqlTable } from '~/google-sql-core/table.ts';
import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import { GoogleSqlColumn, GoogleSqlColumnBuilder } from './common.ts';

export class GoogleSqlJsonBuilder extends GoogleSqlColumnBuilder<{
	dataType: 'object json';
	data: unknown;
	driverParam: unknown;
}> {
	static override readonly [entityKind]: string = 'GoogleSqlJsonBuilder';

	constructor(name: string) {
		super(name, 'object json', 'GoogleSqlJson');
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSqlTable<{ name: TTableName }>,
	) {
		return new GoogleSqlJson(
			table,
			this.config,
		);
	}
}

export class GoogleSqlJson<T extends ColumnBaseConfig<'object json'>> extends GoogleSqlColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSqlJson';

	constructor(table: GoogleSqlTable<any>, config: GoogleSqlJsonBuilder['config']) {
		super(table, config);
	}

	getSQLType(): string {
		return 'json';
	}

	override mapToDriverValue(value: T['data']): string {
		return JSON.stringify(value);
	}

	override mapFromDriverValue(value: T['data'] | string): T['data'] {
		if (typeof value === 'string') {
			try {
				return JSON.parse(value);
			} catch {
				return value as T['data'];
			}
		}
		return value;
	}
}

export function json(name?: string) {
	return new GoogleSqlJsonBuilder(name ?? '');
}
