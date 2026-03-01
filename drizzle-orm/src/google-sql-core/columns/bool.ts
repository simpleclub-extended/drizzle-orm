import type { AnyGoogleSqlTable } from '~/google-sql-core/table.ts';
import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import { GoogleSqlColumn, GoogleSqlColumnWithArrayBuilder } from './common.ts';

export class GoogleSqlBooleanBuilder extends GoogleSqlColumnWithArrayBuilder<{
	dataType: 'boolean';
	data: boolean;
	driverParam: boolean;
}> {
	static override readonly [entityKind]: string = 'GoogleSqlBooleanBuilder';

	constructor(name: string) {
		super(name, 'boolean', 'GoogleSqlBoolean');
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSqlTable<{ name: TTableName }>,
	) {
		return new GoogleSqlBoolean(
			table,
			this.config,
		);
	}
}

export class GoogleSqlBoolean<T extends ColumnBaseConfig<'boolean'>> extends GoogleSqlColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSqlBoolean';

	getSQLType(): string {
		return 'bool';
	}
}

export function bool(name?: string) {
	return new GoogleSqlBooleanBuilder(name ?? '');
}

export const boolean = bool;
