import type { AnyGoogleSQLTable, GoogleSQLTable } from '~/google-sql-core/table.ts';
import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import { GoogleSQLColumn, GoogleSQLColumnBuilder } from './common.ts';

export class GoogleSQLJsonBuilder extends GoogleSQLColumnBuilder<{
	dataType: 'object json';
	data: unknown;
	driverParam: unknown;
}> {
	static override readonly [entityKind]: string = 'GoogleSQLJsonBuilder';

	constructor(name: string) {
		super(name, 'object json', 'GoogleSQLJson');
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSQLTable<{ name: TTableName }>,
	) {
		return new GoogleSQLJson(
			table,
			this.config,
		);
	}
}

export class GoogleSQLJson<T extends ColumnBaseConfig<'object json'>> extends GoogleSQLColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSQLJson';

	constructor(table: GoogleSQLTable<any>, config: GoogleSQLJsonBuilder['config']) {
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
	return new GoogleSQLJsonBuilder(name ?? '');
}
