import type { Kysely } from 'kysely';

export const up = async (database: Kysely<unknown>) => {
    // Update guild_members
    await database.schema
        .alterTable('guild_members')
        .addColumn('stats_opted_in', 'boolean', col => col.defaultTo(false).notNull())
        .execute();
};

export const down = async (database: Kysely<unknown>) => {
    await database.schema.alterTable('guild_members').dropColumn('stats_opted_in').execute();
};