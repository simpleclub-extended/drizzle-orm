import type { AnyGoogleSQLTable } from '~/google-sql-core/table.ts';
import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import { sql } from '~/sql/sql.ts';
import { GoogleSQLColumn, GoogleSQLColumnWithArrayBuilder } from './common.ts';

export class GoogleSQLUUIDBuilder extends GoogleSQLColumnWithArrayBuilder<{
	dataType: 'string uuid';
	data: string;
	driverParam: string;
}> {
	static override readonly [entityKind]: string = 'GoogleSQLUUIDBuilder';

	constructor(name: string) {
		super(name, 'string uuid', 'GoogleSQLUUID');
	}

	/**
	 * Adds `default new_uuid()` to the column definition.
	 */
	defaultRandom(): ReturnType<this['default']> {
		return this.default(sql`new_uuid()`) as ReturnType<this['default']>;
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSQLTable<{ name: TTableName }>,
	) {
		return new GoogleSQLUUID(
			table,
			this.config,
		);
	}
}

export class GoogleSQLUUID<T extends ColumnBaseConfig<'string uuid'>> extends GoogleSQLColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSQLUUID';

	getSQLType(): string {
		return 'uuid';
	}
}

export function uuid(name?: string) {
	return new GoogleSQLUUIDBuilder(name ?? '');
}
