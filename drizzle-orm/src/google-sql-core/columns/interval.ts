import type { AnyGoogleSQLTable } from '~/google-sql-core/table.ts';
import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import { getColumnNameAndConfig } from '~/utils.ts';
import { GoogleSQLColumn, GoogleSQLColumnWithArrayBuilder } from './common.ts';
import type { Precision } from './timestamp.ts';

export class GoogleSQLIntervalBuilder extends GoogleSQLColumnWithArrayBuilder<{
	dataType: 'string interval';
	data: string;
	driverParam: string;
}, object> {
	static override readonly [entityKind]: string = 'GoogleSQLIntervalBuilder';

	constructor(name: string) {
		super(name, 'string interval', 'GoogleSQLInterval');
	}

	override build<TTableName extends string>(
		table: AnyGoogleSQLTable<{ name: TTableName }>,
	) {
		return new GoogleSQLInterval(table, this.config);
	}
}

export class GoogleSQLInterval<T extends ColumnBaseConfig<'string interval'>>
	extends GoogleSQLColumn<T>
{
	static override readonly [entityKind]: string = 'GoogleSQLInterval';

	getSQLType(): string {
		return 'interval';
	}
}

export function interval(name?: string): GoogleSQLIntervalBuilder {
	return new GoogleSQLIntervalBuilder(name ?? '');
}

