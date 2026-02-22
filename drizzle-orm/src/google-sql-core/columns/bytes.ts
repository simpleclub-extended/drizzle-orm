import { entityKind } from '~/entity.ts';
import type { GoogleSQLTable } from '../table.ts';
import { GoogleSQLColumn, GoogleSQLColumnBuilder } from './common.ts';

export class GoogleSQLByteaBuilder extends GoogleSQLColumnBuilder<{
	dataType: 'object buffer';
	data: Buffer;
	driverParam: Buffer;
}> {
	static override readonly [entityKind]: string = 'GoogleSQLByteaBuilder';

	constructor(name: string) {
		super(name, 'object buffer', 'GoogleSQLBytea');
	}

	/** @internal */
	override build(table: GoogleSQLTable<any>) {
		return new GoogleSQLBytea(table, this.config as any);
	}
}

export class GoogleSQLBytea extends GoogleSQLColumn<'object buffer'> {
	static override readonly [entityKind]: string = 'GoogleSQLBytea';

	override mapFromDriverValue(value: Buffer | Uint8Array | string): Buffer {
		// todo: Check whether this is correct for Google SQL.
		if (Buffer.isBuffer(value)) return value;

		if (typeof value === 'string') {
			// Remove '\x'
			const trimmed = value.slice(2, value.length);
			return Buffer.from(trimmed, 'hex');
		}

		return Buffer.from(value);
	}

	getSQLType(): string {
		return 'bytes';
	}
}

export function bytes(name?: string): GoogleSQLByteaBuilder {
	return new GoogleSQLByteaBuilder(name ?? '');
}
