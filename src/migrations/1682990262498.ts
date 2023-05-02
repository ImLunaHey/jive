import type { Kysely } from 'kysely';

export const up = async (db: Kysely<unknown>) => {
    // Update guild_members
    await db.schema
        .alterTable('guild_members')
        .addColumn('invited_by', 'varchar(36)')
        .execute();
};

export const down = async (db: Kysely<unknown>) => {
    await db.schema.alterTable('guild_members').dropColumn('invited_by').execute();
};