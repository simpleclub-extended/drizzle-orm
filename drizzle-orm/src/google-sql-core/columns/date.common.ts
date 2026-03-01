import type { ColumnBuilderBaseConfig, ColumnType } from '~/column-builder.ts';
import { entityKind } from '~/entity.ts';
import { sql } from '~/sql/sql.ts';
import { GoogleSqlColumnWithArrayBuilder } from './common.ts';

export abstract class GoogleSqlDateColumnBaseBuilder<
	T extends ColumnBuilderBaseConfig<ColumnType>,
	TRuntimeConfig extends object = object,
> extends GoogleSqlColumnWithArrayBuilder<T, TRuntimeConfig> {
	static override readonly [entityKind]: string = 'GoogleSqlDateColumnBaseBuilder';

	defaultNow() {
		return this.default(sql`current_timestamp()`);
	}
}
