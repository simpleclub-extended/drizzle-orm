import { entityKind } from '~/entity.ts';
import type { GoogleSQLColumn } from './columns/index.ts';
import type { GoogleSQLTable } from './table.ts';

export function unique(name?: string): UniqueOnConstraintBuilder {
	return new UniqueOnConstraintBuilder(name);
}

export class UniqueConstraintBuilder {
	static readonly [entityKind]: string = 'GoogleSQLUniqueConstraintBuilder';

	/** @internal */
	columns: GoogleSQLColumn[];

	constructor(
		columns: GoogleSQLColumn[],
		private name?: string,
	) {
		this.columns = columns;
	}

	/** @internal */
	build(table: GoogleSQLTable): UniqueConstraint {
		return new UniqueConstraint(table, this.columns, this.name);
	}
}

export class UniqueOnConstraintBuilder {
	static readonly [entityKind]: string = 'GoogleSQLUniqueOnConstraintBuilder';

	/** @internal */
	name?: string;

	constructor(
		name?: string,
	) {
		this.name = name;
	}

	on(...columns: [GoogleSQLColumn, ...GoogleSQLColumn[]]) {
		return new UniqueConstraintBuilder(columns, this.name);
	}
}

export class UniqueConstraint {
	static readonly [entityKind]: string = 'GoogleSQLUniqueConstraint';

	readonly columns: GoogleSQLColumn[];
	readonly name?: string;
	readonly isNameExplicit: boolean;

	constructor(
		readonly table: GoogleSQLTable,
		columns: GoogleSQLColumn[],
		name?: string,
	) {
		this.columns = columns;
		this.name = name;
		this.isNameExplicit = !!name;
	}

	getName(): string | undefined {
		return this.name;
	}
}
