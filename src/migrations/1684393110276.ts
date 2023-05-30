import type { Kysely } from 'kysely';

export const up = async (database: Kysely<unknown>) => {
    // Add missing column
    await database.schema
        .alterTable('guild_counting')
        .addColumn('last_member_id', 'varchar(36)')
        .execute();
};

export const down = async (database: Kysely<unknown>) => {
    await database.schema.alterTable('guild_counting').dropColumn('last_member_id').execute();
};
