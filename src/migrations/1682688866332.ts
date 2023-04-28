import type { Kysely } from 'kysely';

export const up = async (db: Kysely<unknown>) => {
    // Update guild_members
    await db.schema
        .alterTable('guild_members')
        .addColumn('joined_timestamp', 'timestamp')
        .execute();
};

export const down = async (db: Kysely<unknown>) => {
    await db.schema.alterTable('guild_members').dropColumn('joined_timestamp').execute();
};