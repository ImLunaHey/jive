import type { Kysely } from 'kysely';

export const up = async (database: Kysely<unknown>) => {
    // Update guild_members
    await database.schema
        .alterTable('guild_members')
        .addColumn('invited_by', 'varchar(36)')
        .execute();
};

export const down = async (database: Kysely<unknown>) => {
    await database.schema.alterTable('guild_members').dropColumn('invited_by').execute();
};