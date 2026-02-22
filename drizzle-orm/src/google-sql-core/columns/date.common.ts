import type { ColumnBuilderBaseConfig, ColumnType } from '~/column-builder.ts';
import { entityKind } from '~/entity.ts';
import { sql } from '~/sql/sql.ts';
import { GoogleSQLColumnWithArrayBuilder } from './common.ts';

export abstract class GoogleSQLDateColumnBaseBuilder<
	T extends ColumnBuilderBaseConfig<ColumnType>,
	TRuntimeConfig extends object = object,
> extends GoogleSQLColumnWithArrayBuilder<T, TRuntimeConfig> {
	static override readonly [entityKind]: string = 'GoogleSQLDateColumnBaseBuilder';

	defaultNow() {
		return this.default(sql`current_timestamp()`);
	}
}
