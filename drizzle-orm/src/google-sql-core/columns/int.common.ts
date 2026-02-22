import type { ColumnBuilderBaseConfig, ColumnType, GeneratedIdentityConfig, IsIdentity } from '~/column-builder.ts';
import { entityKind } from '~/entity.ts';
import { GoogleSQLColumnWithArrayBuilder } from './common.ts';

export abstract class GoogleSQLIntColumnBaseBuilder<
	T extends ColumnBuilderBaseConfig<ColumnType>,
> extends GoogleSQLColumnWithArrayBuilder<
	T,
	{}
> {
	static override readonly [entityKind]: string = 'GoogleSQLIntColumnBaseBuilder';
}
