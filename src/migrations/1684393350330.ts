import type { Kysely } from 'kysely';

export const up = async (database: Kysely<unknown>) => {
    // Drop extra column
    await database.schema
        .alterTable('guild_counting')
        .dropColumn('member_id')
        .execute();
};

export const down = async (database: Kysely<unknown>) => {
    await database.schema.alterTable('guild_counting').addColumn('member_id', 'varchar(36)', col => col.notNull()).execute();
};
