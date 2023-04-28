import type { Kysely } from 'kysely';

export const up = async (db: Kysely<unknown>) => {
    // Update guild_members
    await db.schema
        .alterTable('guild_members')
        .addColumn('stats_opted_in', 'boolean', col => col.defaultTo(false).notNull())
        .execute();
};

export const down = async (db: Kysely<unknown>) => {
    await db.schema.alterTable('guild_members').dropColumn('stats_opted_in').execute();
};