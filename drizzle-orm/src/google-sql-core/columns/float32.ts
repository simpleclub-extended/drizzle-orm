import type { AnyGoogleSqlTable, GoogleSqlTable } from '~/google-sql-core/table.ts';
import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import { GoogleSqlColumn, GoogleSqlColumnWithArrayBuilder } from './common.ts';

export class GoogleSqlFloat32Builder extends GoogleSqlColumnWithArrayBuilder<
	{
		dataType: 'number float';
		data: number;
		driverParam: string | number;
	},
	{ length: number | undefined }
> {
	static override readonly [entityKind]: string = 'GoogleSqlFloat32Builder';

	constructor(name: string, length?: number) {
		super(name, 'number float', 'GoogleSqlFloat32');
		this.config.length = length;
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSqlTable<{ name: TTableName }>,
	) {
		return new GoogleSqlFloat32(
			table,
			this.config,
		);
	}
}

export class GoogleSqlFloat32<T extends ColumnBaseConfig<'number float'>> extends GoogleSqlColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSqlFloat32';

	constructor(table: GoogleSqlTable<any>, config: GoogleSqlFloat32Builder['config']) {
		super(table, config);
	}

	getSQLType(): string {
		return 'float32';
	}

	override mapFromDriverValue = (value: string | number): number => {
		if (typeof value === 'string') {
			return Number.parseFloat(value);
		}
		return value;
	};
}

export function float32(name?: string) {
	return new GoogleSqlFloat32Builder(name ?? '');
}
