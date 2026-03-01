import { bool } from './bool.ts';
import { bytes } from './bytes.ts';
import { customType } from './custom.ts';
import { date } from './date.ts';
import { float32 } from './float32.ts';
import { doublePrecision, float64 } from './float64.ts';
import { int64 } from './int64.ts';
import { json } from './json.ts';
import { numeric } from './numeric.ts';
import { string, text } from './string.ts';
import { timestamp } from './timestamp.ts';
import { uuid } from './uuid.ts';

export function getGoogleSqlColumnBuilders() {
	return {
		bool,
		bytes,
		customType,
		date,
		float32,
		float64,
		doublePrecision,
		int64,
		json,
		numeric,
		string,
		text,
		timestamp,
		uuid,
	};
}

export type GoogleSqlColumnsBuilders = ReturnType<typeof getGoogleSqlColumnBuilders>;
