import { entityKind, is } from '~/entity.ts';
import { SQL, sql, type SQLWrapper } from '~/sql/sql.ts';
import { type googleSQLSequence, googleSQLSequenceWithSchema } from './sequence.ts';
import { type GoogleSQLTableFn, googleSQLTableWithSchema } from './table.ts';
import { type googleSQLView, googleSQLViewWithSchema } from './view.ts';

export class GoogleSQLSchema<TName extends string = string> implements SQLWrapper {
    static readonly [entityKind]: string = 'GoogleSQLSchema';

    isExisting: boolean = false;
    constructor(
        public readonly schemaName: TName,
    ) {}

    table: GoogleSQLTableFn<TName> = ((name, columns, extraConfig) => {
        return googleSQLTableWithSchema(name, columns, extraConfig, this.schemaName);
    }) as GoogleSQLTableFn<TName>;

    view = ((name, columns) => {
        return googleSQLViewWithSchema(name, columns, this.schemaName);
    }) as typeof googleSQLView;

    sequence: typeof googleSQLSequence = ((name, options) => {
        return googleSQLSequenceWithSchema(name, options, this.schemaName);
    });

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

export function isGoogleSQLSchema(obj: unknown): obj is GoogleSQLSchema {
    return is(obj, GoogleSQLSchema);
}

export function googleSQLSchema<T extends string>(name: T) {
    if (name.toLowerCase() === 'default') {
        throw new Error(
            `You can't specify 'default' as schema name. GoogleSQL is using default schema by default. If you want to use 'default' schema, just use googleSQLTable() instead of creating a schema`,
        );
    }

    return new GoogleSQLSchema(name);
}
