import type { GoogleSQLDialectConfig } from '~/google-sql-core/dialect.ts';
import { GoogleSQLDialect } from '~/google-sql-core/dialect.ts';
import { entityKind, is } from '~/entity.ts';
import type { TypedQueryBuilder } from '~/query-builders/query-builder.ts';
import { SelectionProxyHandler } from '~/selection-proxy.ts';
import type { ColumnsSelection, SQL } from '~/sql/sql.ts';
import { WithSubquery } from '~/subquery.ts';
import type { WithBuilder } from '../subquery.ts';
import { GoogleSQLSelectBuilder } from './select.ts';
import type { SelectedFields } from './select.types.ts';

export class QueryBuilder {
	static readonly [entityKind]: string = 'GoogleSQLQueryBuilder';

	private dialect: GoogleSQLDialect | undefined;
	private dialectConfig: GoogleSQLDialectConfig | undefined;

	constructor(dialect?: GoogleSQLDialect | GoogleSQLDialectConfig) {
		this.dialect = is(dialect, GoogleSQLDialect) ? dialect : undefined;
		this.dialectConfig = is(dialect, GoogleSQLDialect) ? undefined : dialect;
	}

	$with: WithBuilder = (alias: string, selection?: ColumnsSelection) => {
		const queryBuilder = this;
		const as = (
			qb:
				| TypedQueryBuilder<ColumnsSelection | undefined>
				| SQL
				| ((qb: QueryBuilder) => TypedQueryBuilder<ColumnsSelection | undefined> | SQL),
		) => {
			if (typeof qb === 'function') {
				qb = qb(queryBuilder);
			}

			return new Proxy(
				new WithSubquery(
					qb.getSQL(),
					selection ?? ('getSelectedFields' in qb ? qb.getSelectedFields() ?? {} : {}) as SelectedFields,
					alias,
					true,
				),
				new SelectionProxyHandler({ alias, sqlAliasedBehavior: 'alias', sqlBehavior: 'error' }),
			) as any;
		};
		return { as };
	};

	with(...queries: WithSubquery[]) {
		const self = this;

		function select(): GoogleSQLSelectBuilder<undefined, 'qb'>;
		function select<TSelection extends SelectedFields>(fields: TSelection): GoogleSQLSelectBuilder<TSelection, 'qb'>;
		function select<TSelection extends SelectedFields>(
			fields?: TSelection,
		): GoogleSQLSelectBuilder<TSelection | undefined, 'qb'> {
			return new GoogleSQLSelectBuilder({
				fields: fields ?? undefined,
				session: undefined,
				dialect: self.getDialect(),
				withList: queries,
			});
		}

		function selectDistinct(): GoogleSQLSelectBuilder<undefined, 'qb'>;
		function selectDistinct<TSelection extends SelectedFields>(
			fields: TSelection,
		): GoogleSQLSelectBuilder<TSelection, 'qb'>;
		function selectDistinct<TSelection extends SelectedFields>(
			fields?: TSelection,
		): GoogleSQLSelectBuilder<TSelection | undefined, 'qb'> {
			return new GoogleSQLSelectBuilder({
				fields: fields ?? undefined,
				session: undefined,
				dialect: self.getDialect(),
				distinct: true,
			});
		}

		return { select, selectDistinct };
	}

	select(): GoogleSQLSelectBuilder<undefined, 'qb'>;
	select<TSelection extends SelectedFields>(fields: TSelection): GoogleSQLSelectBuilder<TSelection, 'qb'>;
	select<TSelection extends SelectedFields>(
		fields?: TSelection,
	): GoogleSQLSelectBuilder<TSelection | undefined, 'qb'> {
		return new GoogleSQLSelectBuilder({
			fields: fields ?? undefined,
			session: undefined,
			dialect: this.getDialect(),
		});
	}

	selectDistinct(): GoogleSQLSelectBuilder<undefined>;
	selectDistinct<TSelection extends SelectedFields>(fields: TSelection): GoogleSQLSelectBuilder<TSelection>;
	selectDistinct<TSelection extends SelectedFields>(
		fields?: TSelection,
	): GoogleSQLSelectBuilder<TSelection | undefined> {
		return new GoogleSQLSelectBuilder({
			fields: fields ?? undefined,
			session: undefined,
			dialect: this.getDialect(),
			distinct: true,
		});
	}

	// Lazy load dialect to avoid circular dependency
	private getDialect() {
		if (!this.dialect) {
			this.dialect = new GoogleSQLDialect(this.dialectConfig);
		}

		return this.dialect;
	}
}
