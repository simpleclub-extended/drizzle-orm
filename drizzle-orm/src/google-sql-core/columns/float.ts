import type { AnyGoogleSQLTable } from '~/google-sql-core/table.ts';
import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import { GoogleSQLColumn, GoogleSQLColumnWithArrayBuilder } from './common.ts';

export class GoogleSQLFloatBuilder extends GoogleSQLColumnWithArrayBuilder<
	{
		dataType: 'number double';
		data: number;
		driverParam: string | number;
	}
> {
	static override readonly [entityKind]: string = 'GoogleSQLFloatBuilder';

	constructor(name: string) {
		super(name, 'number double', 'GoogleSQLFloat');
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSQLTable<{ name: TTableName }>,
	) {
		return new GoogleSQLFloat(
			table,
			this.config,
		);
	}
}

export class GoogleSQLFloat<T extends ColumnBaseConfig<'number double'>> extends GoogleSQLColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSQLFloat';

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
export function float(name?: string) {
	return new GoogleSQLFloatBuilder(name ?? '');
}

// double precision is alias for float
export const doublePrecision = float;
