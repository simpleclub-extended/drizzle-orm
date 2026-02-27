import type { AnyGoogleSQLTable, GoogleSQLTable } from '~/google-sql-core/table.ts';
import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import { GoogleSQLColumn, GoogleSQLColumnWithArrayBuilder } from './common.ts';

export class GoogleSQLRealBuilder extends GoogleSQLColumnWithArrayBuilder<
	{
		dataType: 'number float';
		data: number;
		driverParam: string | number;
	},
	{ length: number | undefined }
> {
	static override readonly [entityKind]: string = 'GoogleSQLRealBuilder';

	constructor(name: string, length?: number) {
		super(name, 'number float', 'GoogleSQLReal');
		this.config.length = length;
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSQLTable<{ name: TTableName }>,
	) {
		return new GoogleSQLReal(
			table,
			this.config,
		);
	}
}

export class GoogleSQLReal<T extends ColumnBaseConfig<'number float'>> extends GoogleSQLColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSQLReal';

	constructor(table: GoogleSQLTable<any>, config: GoogleSQLRealBuilder['config']) {
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

export function real(name?: string) {
	return new GoogleSQLRealBuilder(name ?? '');
}
