import type { Kysely } from 'kysely';

export const up = async (db: Kysely<unknown>) => {
    // Update guild_members
    await db.schema
        .alterTable('guild_members')
        .addColumn('member_id', 'varchar(36)')
        .execute();
};

export const down = async (db: Kysely<unknown>) => {
    await db.schema.alterTable('guild_members').dropColumn('member_id').execute();
};