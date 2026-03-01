import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import type { AnyGoogleSqlTable } from '../table.ts';
import {GoogleSqlColumn, GoogleSqlColumnWithArrayBuilder} from './common.ts';

export class GoogleSqlInt64Builder extends GoogleSqlColumnWithArrayBuilder<{
	dataType: 'number';
	data: number;
	driverParam: number | string;
}> {
	static override readonly [entityKind]: string = 'GoogleSqlInt64Builder';

	constructor(name: string) {
		super(name, 'number', 'GoogleSqlInt64');
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSqlTable<{ name: TTableName }>,
	) {
		return new GoogleSqlInt64(
			table,
			this.config,
		);
	}
}

export class GoogleSqlInt64<T extends ColumnBaseConfig<'bigint int64'>> extends GoogleSqlColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSqlInt64';

	getSQLType(): string {
		return 'int64';
	}

	override mapFromDriverValue(value: number | string): BigInt {
		if (typeof value === 'string') {
			return Number.parseInt(value);
		}
		return value;
	}
}

export function int64(name?: string) {
	return new GoogleSqlInt64Builder(name ?? '');
}
