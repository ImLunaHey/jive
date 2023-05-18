import type { Kysely } from 'kysely';

export const up = async (db: Kysely<unknown>) => {
    // Add missing column
    await db.schema
        .alterTable('guild_counting')
        .addColumn('last_member_id', 'varchar(36)')
        .execute();
};

export const down = async (db: Kysely<unknown>) => {
    await db.schema.alterTable('guild_counting').dropColumn('last_member_id').execute();
};
