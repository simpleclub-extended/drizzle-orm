import { entityKind, is } from '~/entity.ts';

export type GoogleSQLSequenceOptions = {
	sequenceKind: 'bit_reversed_positive';
	skipRangeMin?: number | string;
	skipRangeMax?: number | string;
	startWithCounter?: number | string;
};

export class GoogleSQLSequence {
	static readonly [entityKind]: string = 'GoogleSQLSequence';

	constructor(
		public readonly seqName: string,
		public readonly seqOptions: GoogleSQLSequenceOptions | undefined,
		public readonly schema: string | undefined,
	) {
	}
}

export function googleSQLSequence(
	name: string,
	options?: GoogleSQLSequenceOptions,
): GoogleSQLSequence {
	return googleSQLSequenceWithSchema(name, options, undefined);
}

/** @internal */
export function googleSQLSequenceWithSchema(
	name: string,
	options?: GoogleSQLSequenceOptions,
	schema?: string,
): GoogleSQLSequence {
	return new GoogleSQLSequence(name, options, schema);
}

export function isGoogleSQLSequence(obj: unknown): obj is GoogleSQLSequence {
	return is(obj, GoogleSQLSequence);
}
