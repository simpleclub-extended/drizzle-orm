import { entityKind } from '~/entity.ts';
import { SQL, sql, type SQLWrapper } from '~/sql/sql.ts';
import type { GoogleSQLSession } from '../session.ts';
import type { GoogleSQLTable } from '../table.ts';
import type { GoogleSQLViewBase } from '../view-base.ts';

export class GoogleSQLCountBuilder<
	TSession extends GoogleSQLSession<any, any, any>,
> extends SQL<number> implements Promise<number>, SQLWrapper {
	private sql: SQL<number>;

	static override readonly [entityKind]: string = 'GoogleSQLCountBuilder';
	[Symbol.toStringTag] = 'GoogleSQLCountBuilder';

	private session: TSession;

	private static buildEmbeddedCount(
		source: GoogleSQLTable | GoogleSQLViewBase | SQL | SQLWrapper,
		filters?: SQL<unknown>,
	): SQL<number> {
		return sql<number>`(select count(*) from ${source}${sql.raw(' where ').if(filters)}${filters})`;
	}

	private static buildCount(
		source: GoogleSQLTable | GoogleSQLViewBase | SQL | SQLWrapper,
		filters?: SQL<unknown>,
	): SQL<number> {
		return sql<number>`select count(*) as count from ${source}${sql.raw(' where ').if(filters)}${filters};`;
	}

	constructor(
		readonly params: {
			source: GoogleSQLTable | GoogleSQLViewBase | SQL | SQLWrapper;
			filters?: SQL<unknown>;
			session: TSession;
		},
	) {
		super(GoogleSQLCountBuilder.buildEmbeddedCount(params.source, params.filters).queryChunks);

		this.mapWith(Number);

		this.session = params.session;

		this.sql = GoogleSQLCountBuilder.buildCount(
			params.source,
			params.filters,
		);
	}

	then<TResult1 = number, TResult2 = never>(
		onfulfilled?: ((value: number) => TResult1 | PromiseLike<TResult1>) | null | undefined,
		onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
	): Promise<TResult1 | TResult2> {
		return Promise.resolve(this.session.count(this.sql))
			.then(
				onfulfilled,
				onrejected,
			);
	}

	catch(
		onRejected?: ((reason: any) => any) | null | undefined,
	): Promise<number> {
		return this.then(undefined, onRejected);
	}

	finally(onFinally?: (() => void) | null | undefined): Promise<number> {
		return this.then(
			(value) => {
				onFinally?.();
				return value;
			},
			(reason) => {
				onFinally?.();
				throw reason;
			},
		);
	}
}
