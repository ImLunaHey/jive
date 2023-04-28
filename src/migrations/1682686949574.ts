import type { Kysely } from 'kysely';

export const up = async (db: Kysely<unknown>) => {
    // Update guild_stats
    await db.schema
        .alterTable('guild_stats')
        .addUniqueConstraint('guild_id', ['guild_id'])
        .execute();
};

export const down = async (db: Kysely<unknown>) => {
    await db.schema.alterTable('guild_stats').dropConstraint('guild_id').execute();
};