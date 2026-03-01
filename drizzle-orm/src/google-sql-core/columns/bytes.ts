import type { ColumnBaseConfig } from '~/column.ts';
import { entityKind } from '~/entity.ts';
import type { GoogleSqlTable } from '../table.ts';
import { GoogleSqlColumn, GoogleSqlColumnBuilder } from './common.ts';

export class GoogleSqlBytesBuilder extends GoogleSqlColumnBuilder<{
	dataType: 'object buffer';
	data: Buffer;
	driverParam: Buffer;
}> {
	static override readonly [entityKind]: string = 'GoogleSqlBytesBuilder';

	constructor(name: string) {
		super(name, 'object buffer', 'GoogleSqlBytes');
	}

	/** @internal */
	override build(table: GoogleSqlTable<any>) {
		return new GoogleSqlBytes(table, this.config as any);
	}
}

export class GoogleSqlBytes<T extends ColumnBaseConfig<'object buffer'>> extends GoogleSqlColumn<T> {
	static override readonly [entityKind]: string = 'GoogleSqlBytes';

	override mapFromDriverValue(value: Buffer | Uint8Array | string): Buffer {
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

export function bytes(name?: string): GoogleSqlBytesBuilder {
	return new GoogleSqlBytesBuilder(name ?? '');
}
