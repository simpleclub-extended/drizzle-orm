import type { AnyGoogleSQLTable } from '~/google-sql-core/table.ts';
import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import { GoogleSQLColumn, GoogleSQLColumnWithArrayBuilder } from './common.ts';

export class GoogleSQLBooleanBuilder extends GoogleSQLColumnWithArrayBuilder<{
	dataType: 'boolean';
	data: boolean;
	driverParam: boolean;
}> {
	static override readonly [entityKind]: string = 'GoogleSQLBooleanBuilder';

	constructor(name: string) {
		super(name, 'boolean', 'GoogleSQLBoolean');
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSQLTable<{ name: TTableName }>,
	) {
		return new GoogleSQLBoolean(
			table,
			this.config,
		);
	}
}

export class GoogleSQLBoolean<T extends ColumnBaseConfig<'boolean'>> extends GoogleSQLColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSQLBoolean';

	getSQLType(): string {
		return 'bool';
	}
}

export function bool(name?: string) {
	return new GoogleSQLBooleanBuilder(name ?? '');
}

export const boolean = bool;
