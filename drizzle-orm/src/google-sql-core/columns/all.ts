import { bigint, int8 } from './bigint.ts';
import { bool } from './bool.ts';
import { bytes } from './bytes.ts';
import { customType } from './custom.ts';
import { date } from './date.ts';
import { decimal, numeric } from './decimal.ts';
import { doublePrecision, float } from './float.ts';
import { interval } from './interval.ts';
import { json } from './json.ts';
import { real } from './real.ts';
import { string, text } from './string.ts';
import { timestamp } from './timestamp.ts';
import { uuid } from './uuid.ts';

export function getGoogleSQLColumnBuilders() {
	return {
		bigint,
		bool,
		bytes,
		customType,
		date,
		doublePrecision,
		int8,
		interval,
		json,
		numeric,
		decimal,
		real,
		text,
		timestamp,
		uuid,
		float,
		string,
	};
}

export type GoogleSQLColumnsBuilders = ReturnType<typeof getGoogleSQLColumnBuilders>;
