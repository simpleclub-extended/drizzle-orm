import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import type { AnyGoogleSQLTable } from '../table.ts';
import { GoogleSQLColumn } from './common.ts';
import { GoogleSQLIntColumnBaseBuilder } from './int.common.ts';

export class GoogleSQLIntegerBuilder extends GoogleSQLIntColumnBaseBuilder<{
	dataType: 'number';
	data: number;
	driverParam: number | string;
}> {
	static override readonly [entityKind]: string = 'GoogleSQLIntegerBuilder';

	constructor(name: string) {
		super(name, 'number', 'GoogleSQLInteger');
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSQLTable<{ name: TTableName }>,
	) {
		return new GoogleSQLInteger(
			table,
			this.config,
		);
	}
}

export class GoogleSQLInteger<T extends ColumnBaseConfig<'number int32'>> extends GoogleSQLColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSQLInteger';

	getSQLType(): string {
		return 'int64';
	}

	override mapFromDriverValue(value: number | string): number {
		if (typeof value === 'string') {
			return Number.parseInt(value);
		}
		return value;
	}
}

export function integer(name?: string) {
	return new GoogleSQLIntegerBuilder(name ?? '');
}
