import { TableAliasProxyHandler } from '~/alias.ts';
import type { BuildAliasTable } from './query-builders/select.types.ts';
import type { GoogleSQLTable } from './table.ts';
import type { GoogleSQLViewBase } from './view-base.ts';

export function alias<TTable extends GoogleSQLTable | GoogleSQLViewBase, TAlias extends string>(
	table: TTable,
	alias: TAlias,
): BuildAliasTable<TTable, TAlias> {
	return new Proxy(table, new TableAliasProxyHandler(alias, false)) as any;
}