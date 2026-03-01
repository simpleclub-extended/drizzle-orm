import type { AnyGoogleSqlTable } from '~/google-sql-core/table.ts';
import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import { sql } from '~/sql/sql.ts';
import { GoogleSqlColumn, GoogleSqlColumnWithArrayBuilder } from './common.ts';

export class GoogleSqlUUIDBuilder extends GoogleSqlColumnWithArrayBuilder<{
	dataType: 'string uuid';
	data: string;
	driverParam: string;
}> {
	static override readonly [entityKind]: string = 'GoogleSqlUUIDBuilder';

	constructor(name: string) {
		super(name, 'string uuid', 'GoogleSqlUUID');
	}

	/**
	 * Adds `default new_uuid()` to the column definition.
	 */
	defaultRandom(): ReturnType<this['default']> {
		return this.default(sql`new_uuid()`) as ReturnType<this['default']>;
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyGoogleSqlTable<{ name: TTableName }>,
	) {
		return new GoogleSqlUUID(
			table,
			this.config,
		);
	}
}

export class GoogleSqlUUID<T extends ColumnBaseConfig<'string uuid'>> extends GoogleSqlColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSqlUUID';

	getSQLType(): string {
		return 'uuid';
	}
}

export function uuid(name?: string) {
	return new GoogleSqlUUIDBuilder(name ?? '');
}
