import type { BuildColumns, ColumnBuilderBase } from '~/column-builder.ts';
import { entityKind, is } from '~/entity.ts';
import type { TypedQueryBuilder } from '~/query-builders/query-builder.ts';
import type { AddAliasToSelection } from '~/query-builders/select.types.ts';
import { SelectionProxyHandler } from '~/selection-proxy.ts';
import type { ColumnsSelection, SQL } from '~/sql/sql.ts';
import { getTableColumns } from '~/utils.ts';
import type { GoogleSQLColumn } from './columns/common.ts';
import { QueryBuilder } from './query-builders/query-builder.ts';
import { googleSQLTable } from './table.ts';
import { GoogleSQLViewBase } from './view-base.ts';

export class DefaultViewBuilderCore<TConfig extends { name: string; columns?: unknown }> {
	static readonly [entityKind]: string = 'GoogleSQLDefaultViewBuilderCore';

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
	static override readonly [entityKind]: string = 'GoogleSQLViewBuilder';

	as<TSelectedFields extends ColumnsSelection>(
		qb: TypedQueryBuilder<TSelectedFields> | ((qb: QueryBuilder) => TypedQueryBuilder<TSelectedFields>),
	): GoogleSQLViewWithSelection<TName, false, AddAliasToSelection<TSelectedFields, TName, 'google-sql'>> {
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
			new GoogleSQLView({
				config: {
					name: this.name,
					schema: this.schema,
					selectedFields: aliasedSelection,
					query: qb.getSQL().inlineParams(),
				},
			}),
			selectionProxy as any,
		) as GoogleSQLViewWithSelection<TName, false, AddAliasToSelection<TSelectedFields, TName, 'google-sql'>>;
	}
}

export class ManualViewBuilder<
	TName extends string = string,
	TColumns extends Record<string, ColumnBuilderBase> = Record<string, ColumnBuilderBase>,
> extends DefaultViewBuilderCore<{ name: TName; columns: TColumns }> {
	static override readonly [entityKind]: string = 'GoogleSQLManualViewBuilder';

	private columns: Record<string, GoogleSQLColumn>;

	constructor(
		name: TName,
		columns: TColumns,
		schema: string | undefined,
	) {
		super(name, schema);
		this.columns = getTableColumns(googleSQLTable(name, columns));
	}

	existing(): GoogleSQLViewWithSelection<TName, true, BuildColumns<TName, TColumns, 'google-sql'>> {
		return new Proxy(
			new GoogleSQLView({
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
		) as GoogleSQLViewWithSelection<TName, true, BuildColumns<TName, TColumns, 'google-sql'>>;
	}

	as(query: SQL): GoogleSQLViewWithSelection<TName, false, BuildColumns<TName, TColumns, 'google-sql'>> {
		return new Proxy(
			new GoogleSQLView({
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
		) as GoogleSQLViewWithSelection<TName, false, BuildColumns<TName, TColumns, 'google-sql'>>;
	}
}

export class GoogleSQLView<
	TName extends string = string,
	TExisting extends boolean = boolean,
	TSelectedFields extends ColumnsSelection = ColumnsSelection,
> extends GoogleSQLViewBase<TName, TExisting, TSelectedFields> {
	static override readonly [entityKind]: string = 'GoogleSQLView';

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

export type GoogleSQLViewWithSelection<
	TName extends string = string,
	TExisting extends boolean = boolean,
	TSelectedFields extends ColumnsSelection = ColumnsSelection,
> = GoogleSQLView<TName, TExisting, TSelectedFields> & TSelectedFields;

/** @internal */
export function googleSQLViewWithSchema(
	name: string,
	selection: Record<string, ColumnBuilderBase> | undefined,
	schema: string | undefined,
): ViewBuilder | ManualViewBuilder {
	if (selection) {
		return new ManualViewBuilder(name, selection, schema);
	}
	return new ViewBuilder(name, schema);
}

export function googleSQLView<TName extends string>(name: TName): ViewBuilder<TName>;
export function googleSQLView<TName extends string, TColumns extends Record<string, ColumnBuilderBase>>(
	name: TName,
	columns: TColumns,
): ManualViewBuilder<TName, TColumns>;
export function googleSQLView(
	name: string,
	columns?: Record<string, ColumnBuilderBase>,
): ViewBuilder | ManualViewBuilder {
	return googleSQLViewWithSchema(name, columns, undefined);
}

export function isGoogleSQLView(obj: unknown): obj is GoogleSQLView {
	return is(obj, GoogleSQLView);
}
