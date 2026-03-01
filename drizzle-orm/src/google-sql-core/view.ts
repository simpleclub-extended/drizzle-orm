import type { BuildColumns, ColumnBuilderBase } from '~/column-builder.ts';
import { entityKind, is } from '~/entity.ts';
import type { TypedQueryBuilder } from '~/query-builders/query-builder.ts';
import type { AddAliasToSelection } from '~/query-builders/select.types.ts';
import { SelectionProxyHandler } from '~/selection-proxy.ts';
import type { ColumnsSelection, SQL } from '~/sql/sql.ts';
import { getTableColumns } from '~/utils.ts';
import type { GoogleSqlColumn } from './columns/common.ts';
import { QueryBuilder } from './query-builders/query-builder.ts';
import { googleSqlTable } from './table.ts';
import { GoogleSqlViewBase } from './view-base.ts';

export class DefaultViewBuilderCore<TConfig extends { name: string; columns?: unknown }> {
	static readonly [entityKind]: string = 'GoogleSqlDefaultViewBuilderCore';

	declare readonly _: {
		readonly name: TConfig['name'];
		readonly columns: TConfig['columns'];
	};

	constructor(
		protected name: TConfig['name'],
		protected schema: string | undefined,
	) {}
}

export class ViewBuilder<TName extends string = string> extends DefaultViewBuilderCore<{ name: TName }> {
	static override readonly [entityKind]: string = 'GoogleSqlViewBuilder';

	as<TSelectedFields extends ColumnsSelection>(
		qb: TypedQueryBuilder<TSelectedFields> | ((qb: QueryBuilder) => TypedQueryBuilder<TSelectedFields>),
	): GoogleSqlViewWithSelection<TName, false, AddAliasToSelection<TSelectedFields, TName, 'googlesql'>> {
		if (typeof qb === 'function') {
			qb = qb(new QueryBuilder());
		}
		const selectionProxy = new SelectionProxyHandler<TSelectedFields>({
			alias: this.name,
			sqlBehavior: 'error',
			sqlAliasedBehavior: 'alias',
			replaceOriginalName: true,
		});
		const aliasedSelection = new Proxy(qb.getSelectedFields(), selectionProxy);
		return new Proxy(
			new GoogleSqlView({
				config: {
					name: this.name,
					schema: this.schema,
					selectedFields: aliasedSelection,
					query: qb.getSQL().inlineParams(),
				},
			}),
			selectionProxy as any,
		) as GoogleSqlViewWithSelection<TName, false, AddAliasToSelection<TSelectedFields, TName, 'googlesql'>>;
	}
}

export class ManualViewBuilder<
	TName extends string = string,
	TColumns extends Record<string, ColumnBuilderBase> = Record<string, ColumnBuilderBase>,
> extends DefaultViewBuilderCore<{ name: TName; columns: TColumns }> {
	static override readonly [entityKind]: string = 'GoogleSqlManualViewBuilder';

	private columns: Record<string, GoogleSqlColumn>;

	constructor(
		name: TName,
		columns: TColumns,
		schema: string | undefined,
	) {
		super(name, schema);
		this.columns = getTableColumns(googleSqlTable(name, columns));
	}

	existing(): GoogleSqlViewWithSelection<TName, true, BuildColumns<TName, TColumns, 'googlesql'>> {
		return new Proxy(
			new GoogleSqlView({
				config: {
					name: this.name,
					schema: this.schema,
					selectedFields: this.columns,
					query: undefined,
				},
			}),
			new SelectionProxyHandler({
				alias: this.name,
				sqlBehavior: 'error',
				sqlAliasedBehavior: 'alias',
				replaceOriginalName: true,
			}),
		) as GoogleSqlViewWithSelection<TName, true, BuildColumns<TName, TColumns, 'googlesql'>>;
	}

	as(query: SQL): GoogleSqlViewWithSelection<TName, false, BuildColumns<TName, TColumns, 'googlesql'>> {
		return new Proxy(
			new GoogleSqlView({
				config: {
					name: this.name,
					schema: this.schema,
					selectedFields: this.columns,
					query: query.inlineParams(),
				},
			}),
			new SelectionProxyHandler({
				alias: this.name,
				sqlBehavior: 'error',
				sqlAliasedBehavior: 'alias',
				replaceOriginalName: true,
			}),
		) as GoogleSqlViewWithSelection<TName, false, BuildColumns<TName, TColumns, 'googlesql'>>;
	}
}

export class GoogleSqlView<
	TName extends string = string,
	TExisting extends boolean = boolean,
	TSelectedFields extends ColumnsSelection = ColumnsSelection,
> extends GoogleSqlViewBase<TName, TExisting, TSelectedFields> {
	static override readonly [entityKind]: string = 'GoogleSqlView';

	constructor({ config }: {
		config: {
			name: TName;
			schema: string | undefined;
			selectedFields: ColumnsSelection;
			query: SQL | undefined;
		};
	}) {
		super(config);
	}
}

export type GoogleSqlViewWithSelection<
	TName extends string = string,
	TExisting extends boolean = boolean,
	TSelectedFields extends ColumnsSelection = ColumnsSelection,
> = GoogleSqlView<TName, TExisting, TSelectedFields> & TSelectedFields;

/** @internal */
export function googleSqlViewWithSchema(
	name: string,
	selection: Record<string, ColumnBuilderBase> | undefined,
	schema: string | undefined,
): ViewBuilder | ManualViewBuilder {
	if (selection) {
		return new ManualViewBuilder(name, selection, schema);
	}
	return new ViewBuilder(name, schema);
}

export function googleSqlView<TName extends string>(name: TName): ViewBuilder<TName>;
export function googleSqlView<TName extends string, TColumns extends Record<string, ColumnBuilderBase>>(
	name: TName,
	columns: TColumns,
): ManualViewBuilder<TName, TColumns>;
export function googleSqlView(
	name: string,
	columns?: Record<string, ColumnBuilderBase>,
): ViewBuilder | ManualViewBuilder {
	return googleSqlViewWithSchema(name, columns, undefined);
}

export function isGoogleSqlView(obj: unknown): obj is GoogleSqlView {
	return is(obj, GoogleSqlView);
}
