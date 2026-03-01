import { entityKind, is } from '~/entity.ts';

export type GoogleSqlSequenceOptions = {
	sequenceKind: 'bit_reversed_positive';
	skipRangeMin?: number | string;
	skipRangeMax?: number | string;
	startWithCounter?: number | string;
};

export class GoogleSqlSequence {
	static readonly [entityKind]: string = 'GoogleSqlSequence';

	constructor(
		public readonly seqName: string,
		public readonly seqOptions: GoogleSqlSequenceOptions | undefined,
		public readonly schema: string | undefined,
	) {
	}
}

export function googleSqlSequence(
	name: string,
	options?: GoogleSqlSequenceOptions,
): GoogleSqlSequence {
	return googleSqlSequenceWithSchema(name, options, undefined);
}

/** @internal */
export function googleSqlSequenceWithSchema(
	name: string,
	options?: GoogleSqlSequenceOptions,
	schema?: string,
): GoogleSqlSequence {
	return new GoogleSqlSequence(name, options, schema);
}

export function isGoogleSqlSequence(obj: unknown): obj is GoogleSqlSequence {
	return is(obj, GoogleSqlSequence);
}
