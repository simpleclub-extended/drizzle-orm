import { entityKind, is } from '~/entity.ts';
import { SQL, sql, type SQLWrapper } from '~/sql/sql.ts';
import { type googleSqlSequence, googleSqlSequenceWithSchema } from './sequence.ts';
import { type GoogleSqlTableFn, googleSqlTableWithSchema } from './table.ts';
import { type googleSqlView, googleSqlViewWithSchema } from './view.ts';

export class GoogleSqlSchema<TName extends string = string> implements SQLWrapper {
    static readonly [entityKind]: string = 'GoogleSqlSchema';

    isExisting: boolean = false;
    constructor(
        public readonly schemaName: TName,
    ) {}

    table: GoogleSqlTableFn<TName> = ((name, columns, extraConfig) => {
        return googleSqlTableWithSchema(name, columns, extraConfig, this.schemaName);
    }) as GoogleSqlTableFn<TName>;

    view = ((name, columns) => {
        return googleSqlViewWithSchema(name, columns, this.schemaName);
    }) as typeof googleSqlView;

    getSQL(): SQL {
        return new SQL([sql.identifier(this.schemaName)]);
    }

    shouldOmitSQLParens(): boolean {
        return true;
    }

    existing(): this {
        this.isExisting = true;
        return this;
    }
}

export function isGoogleSqlSchema(obj: unknown): obj is GoogleSqlSchema {
    return is(obj, GoogleSqlSchema);
}

export function googleSqlSchema<T extends string>(name: T) {
    if (name.toLowerCase() === 'default') {
        throw new Error(
            `You can't specify 'default' as schema name. GoogleSql is using default schema by default. If you want to use 'default' schema, just use googleSqlTable() instead of creating a schema`,
        );
    }

    return new GoogleSqlSchema(name);
}
