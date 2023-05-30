import type { Kysely } from 'kysely';

export const up = async (database: Kysely<unknown>) => {
    // Update guild_stats
    await database.schema
        .alterTable('guild_stats')
        .addUniqueConstraint('guild_id', ['guild_id'])
        .execute();
};

export const down = async (database: Kysely<unknown>) => {
    await database.schema.alterTable('guild_stats').dropConstraint('guild_id').execute();
};