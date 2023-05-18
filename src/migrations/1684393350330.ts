import type { Kysely } from 'kysely';

export const up = async (db: Kysely<unknown>) => {
    // Drop extra column
    await db.schema
        .alterTable('guild_counting')
        .dropColumn('member_id')
        .execute();
};

export const down = async (db: Kysely<unknown>) => {
    await db.schema.alterTable('guild_counting').addColumn('member_id', 'varchar(36)', col => col.notNull()).execute();
};
