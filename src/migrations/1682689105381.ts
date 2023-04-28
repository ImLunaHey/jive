import type { Kysely } from 'kysely';

export const up = async (db: Kysely<unknown>) => {
    // Update guild_members
    await db.schema
        .alterTable('guild_members')
        .modifyColumn('joined_timestamp', 'integer')
        .execute();
};

export const down = async (db: Kysely<unknown>) => {
    await db.schema.alterTable('guild_members').modifyColumn('joined_timestamp', 'timestamp').execute();
};