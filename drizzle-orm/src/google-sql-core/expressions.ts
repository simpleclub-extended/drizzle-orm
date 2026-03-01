import type { GoogleSqlColumn } from '~/google-sql-core/columns/index.ts';
import { bindIfParam } from '~/sql/expressions/index.ts';
import type { Placeholder, SQL, SQLChunk, SQLWrapper } from '~/sql/sql.ts';
import { sql } from '~/sql/sql.ts';

export * from '~/sql/expressions/index.ts';

export function concat(column: GoogleSqlColumn | SQL.Aliased, value: string | Placeholder | SQLWrapper): SQL {
	return sql`${column} || ${bindIfParam(value, column)}`;
}

export function substring(
	column: GoogleSqlColumn | SQL.Aliased,
	{ from, for: _for }: { from?: number | Placeholder | SQLWrapper; for?: number | Placeholder | SQLWrapper },
): SQL {
	const chunks: SQLChunk[] = [sql`substr(`, column];
	if (from !== undefined) {
		chunks.push(sql`, `, bindIfParam(from, column));
	}
	if (_for !== undefined) {
		if (from === undefined) {
			chunks.push(sql`, 1`); // If `from` is not specified, it defaults to 1
		}
		chunks.push(sql`, `, bindIfParam(_for, column));
	}
	chunks.push(sql`)`);
	return sql.join(chunks);
}
