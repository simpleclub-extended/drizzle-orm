import type { AnyGoogleSqlTable } from '~/google-sql-core/table.ts';
import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import { GoogleSqlColumn, GoogleSqlColumnWithArrayBuilder } from './common.ts';

export class GoogleSqlFloat64Builder extends GoogleSqlColumnWithArrayBuilder<
	{
		dataType: 'number double';
		data: number;
		driverParam: string | number;
	}
> {
	static override readonly [entityKind]: string = 'GoogleSqlFloat64Builder';

	constructor(name: string) {
		super(name, 'number double', 'GoogleSqlFloat64');
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSqlTable<{ name: TTableName }>,
	) {
		return new GoogleSqlFloat64(
			table,
			this.config,
		);
	}
}

export class GoogleSqlFloat64<T extends ColumnBaseConfig<'number double'>> extends GoogleSqlColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSqlFloat64';

	getSQLType(): string {
		return 'float64';
	}

	override mapFromDriverValue(value: string | number): number {
		if (typeof value === 'string') {
			return Number.parseFloat(value);
		}
		return value;
	}
}
export function float64(name?: string) {
	return new GoogleSqlFloat64Builder(name ?? '');
}

// double precision is alias for float
export const doublePrecision = float64;
