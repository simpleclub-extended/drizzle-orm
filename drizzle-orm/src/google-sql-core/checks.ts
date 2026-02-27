import { entityKind } from '~/entity.ts';
import type { SQL } from '~/sql/index.ts';
import type { GoogleSQLTable } from './table.ts';

export class CheckBuilder {
	static readonly [entityKind]: string = 'GoogleSQLCheckBuilder';

	protected brand!: 'GoogleSQLConstraintBuilder';

	constructor(public name: string, public value: SQL) {}

	/** @internal */
	build(table: GoogleSQLTable): Check {
		return new Check(table, this);
	}
}

export class Check {
	static readonly [entityKind]: string = 'GoogleSQLCheck';

	readonly name: string;
	readonly value: SQL;

	constructor(public table: GoogleSQLTable, builder: CheckBuilder) {
		this.name = builder.name;
		this.value = builder.value;
	}
}

export function check(name: string, value: SQL): CheckBuilder {
	return new CheckBuilder(name, value);
}
