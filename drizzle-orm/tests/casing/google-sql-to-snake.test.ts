import {beforeEach, describe, it} from 'vitest';
import {alias, boolean, googleSqlSchema, googleSqlTable, int64, text, union, uuid} from '~/google-sql-core';
import {relations} from '~/_relations';
import {drizzle as spanner} from '~/spanner';
import {asc, eq, sql} from '~/sql';

const testSchema = googleSqlSchema('test');
const users = googleSqlTable('users', {
    id: uuid().primaryKey(),
    first_name: text().notNull(),
    last_name: text().notNull(),
    // Test that custom aliases remain
    age: int64('AGE'),
});
const usersRelations = relations(users, ({one}) => ({
    developers: one(developers),
}));
const developers = testSchema.table('developers', {
    user_id: uuid().primaryKey().references(() => users.id),
    uses_drizzle_orm: boolean().notNull(),
});
const developersRelations = relations(developers, ({one}) => ({
    user: one(users, {
        fields: [developers.user_id],
        references: [users.id],
    }),
}));
const devs = alias(developers, 'devs');
const schema = {users, usersRelations, developers, developersRelations};

const db = spanner({
    connection: {
        instanceId: 'default',
        databaseId: 'test-drizzle',
    },
    schema: schema,
    casing: 'snake_case'
});

const usersCache = {
    'public.users.id': 'id',
    'public.users.first_name': 'first_name',
    'public.users.last_name': 'last_name',
    'public.users.AGE': 'age',
};
const developersCache = {
    'test.developers.user_id': 'user_id',
    'test.developers.uses_drizzle_orm': 'uses_drizzle_orm',
};
const cache = {
    ...usersCache,
    ...developersCache,
};

const fullName = sql`${users.first_name} || ' ' || ${users.last_name}`.as('name');

describe('spanner to snake case', () => {
    beforeEach(() => {
        db.dialect.casing.clearCache();
    });

    it('select', ({expect}) => {
        const query = db
            .select({name: fullName, age: users.age})
            .from(users)
            .leftJoin(developers, eq(users.id, developers.user_id))
            .orderBy(asc(users.first_name));

        expect(query.toSQL()).toEqual({
            sql:
                "select `users`.`first_name` || ' ' || `users`.`last_name` as `name`, `users`.`AGE` from `users` left join `test`.`developers` on `users`.`id` = `test`.`developers`.`user_id` order by `users`.`first_name` asc",
            params: [],
        });
        expect(db.dialect.casing.cache).toEqual(cache);
    });

    it('select (with alias)', ({expect}) => {
        const query = db
            .select({firstName: users.first_name})
            .from(users)
            .leftJoin(devs, eq(users.id, devs.user_id));

        expect(query.toSQL()).toEqual({
            sql:
                'select `users`.`first_name` from `users` left join `test`.`developers` `devs` on `users`.`id` = `devs`.`user_id`',
            params: [],
        });
        expect(db.dialect.casing.cache).toEqual(cache);
    });

    it('with CTE', ({expect}) => {
        const cte = db.$with('cte').as(db.select({name: fullName}).from(users));
        const query = db.with(cte).select().from(cte);

        expect(query.toSQL()).toEqual({
            sql: "with `cte` as (select `first_name` || ' ' || `last_name` as `name` from `users`) select `name` from `cte`",
            params: [],
        });
        expect(db.dialect.casing.cache).toEqual(usersCache);
    });

    it('with CTE (with query builder)', ({expect}) => {
        const cte = db.$with('cte').as((qb) => qb.select({name: fullName}).from(users));
        const query = db.with(cte).select().from(cte);

        expect(query.toSQL()).toEqual({
            sql: "with `cte` as (select `first_name` || ' ' || `last_name` as `name` from `users`) select `name` from `cte`",
            params: [],
        });
        expect(db.dialect.casing.cache).toEqual(usersCache);
    });

    it('set operator', ({expect}) => {
        const query = db
            .select({firstName: users.first_name})
            .from(users)
            .union(db.select({firstName: users.first_name}).from(users));

        expect(query.toSQL()).toEqual({
            sql: '(select `first_name` from `users`) union (select `first_name` from `users`)',
            params: [],
        });
        expect(db.dialect.casing.cache).toEqual(usersCache);
    });

    it('set operator (function)', ({expect}) => {
        const query = union(
            db.select({firstName: users.first_name}).from(users),
            db.select({firstName: users.first_name}).from(users),
        );

        expect(query.toSQL()).toEqual({
            sql: '(select `first_name` from `users`) union (select `first_name` from `users`)',
            params: [],
        });
        expect(db.dialect.casing.cache).toEqual(usersCache);
    });

    // todo: Renable this once "lateral"/correlated joins are supported.
    it.skip('query (find first)', ({expect}) => {
        const query = db._query.users.findFirst({
            columns: {
                id: true,
                age: true,
            },
            extras: {
                fullName,
            },
            where: eq(users.id, 1),
            with: {
                developers: {
                    columns: {
                        uses_drizzle_orm: true,
                    },
                },
            },
        });

        expect(query.toSQL()).toEqual({
            sql:
                "select `users`.`id`, `users`.`AGE`, `users`.`first_name` || ' ' || `users`.`last_name` as `name`, `users_developers`.`data` as `developers` from `users` `users` left join lateral (select json_array(`users_developers`.`usesDrizzleOrm`) as `data` from (select * from `developers` `users_developers` where `users_developers`.`user_id` = `users`.`id` limit @p1) `users_developers`) `users_developers` on true where `users`.`id` = @p2 limit @p3",
            params: [1, 1, 1],
        });
        expect(db.dialect.casing.cache).toEqual(cache);
    });

    // todo: Renable this once "lateral"/correlated joins are supported.
    it.skip('query (find many)', ({expect}) => {
        const query = db._query.users.findMany({
            columns: {
                id: true,
                age: true,
            },
            extras: {
                fullName,
            },
            where: eq(users.id, 1),
            with: {
                developers: {
                    columns: {
                        uses_drizzle_orm: true,
                    },
                },
            },
        });

        expect(query.toSQL()).toEqual({
            sql:
                "select `users`.`id`, `users`.`AGE`, `users`.`first_name` || ' ' || `users`.`last_name` as `name`, `users_developers`.`data` as `developers` from `users` left join lateral (select json_array(`users_developers`.`usesDrizzleOrm`) as `data` from (select * from `developers` `users_developers` where `users_developers`.`user_id` = `users`.`id` limit @p1) `users_developers`) `users_developers` on true where `users`.`id` = @p2",
            params: [1, 1],
        });
        expect(db.dialect.casing.cache).toEqual(cache);
    });

    it('insert', ({expect}) => {
        const query = db
            .insert(users)
            .values({first_name: 'John', last_name: 'Doe', age: 30});

        expect(query.toSQL()).toEqual({
            sql: 'insert into `users` (`id`, `first_name`, `last_name`, `AGE`) values (default, @p1, @p2, @p3)',
            params: ['John', 'Doe', 30],
        });
        expect(db.dialect.casing.cache).toEqual(usersCache);
    });

    it('insert (on duplicate key update)', ({expect}) => {
        const query = db
            .insert(users)
            .orUpdate()
            .values({first_name: 'John', last_name: 'Doe', age: 30});

        expect(query.toSQL()).toEqual({
            sql:
                'insert or update into `users` (`id`, `first_name`, `last_name`, `AGE`) values (default, @p1, @p2, @p3)',
            params: ['John', 'Doe', 30],
        });
        expect(db.dialect.casing.cache).toEqual(usersCache);
    });

    it('update', ({expect}) => {
        const query = db
            .update(users)
            .set({first_name: 'John', last_name: 'Doe', age: 30})
            .where(eq(users.id, 1));

        expect(query.toSQL()).toEqual({
            sql: 'update `users` set `first_name` = @p1, `last_name` = @p2, `AGE` = @p3 where `users`.`id` = @p4',
            params: ['John', 'Doe', 30, 1],
        });
        expect(db.dialect.casing.cache).toEqual(usersCache);
    });

    it('delete', ({expect}) => {
        const query = db
            .delete(users)
            .where(eq(users.id, 1));

        expect(query.toSQL()).toEqual({
            sql: 'delete from `users` where `users`.`id` = @p1',
            params: [1],
        });
        expect(db.dialect.casing.cache).toEqual(usersCache);
    });
});