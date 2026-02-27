import { entityKind } from '~/entity.ts';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GoogleSQLRoleConfig {
}

export class GoogleSQLRole implements GoogleSQLRoleConfig {
	static readonly [entityKind]: string = 'GoogleSQLRole';

	/** @internal */
	_existing?: boolean;

	constructor(
		readonly name: string,
		config?: GoogleSQLRoleConfig,
	) {
		if (config) {
		}
	}

	existing(): this {
		this._existing = true;
		return this;
	}
}

export function googleSQLRole(name: string, config?: GoogleSQLRoleConfig) {
	return new GoogleSQLRole(name, config);
}
