import type { Kysely } from 'kysely';

export const up = async (db: Kysely<unknown>) => {
    // Rename table
    await db.schema
        .alterTable('member_count')
        .renameTo('guild_member_counting')
        .execute();

    // Rename table
    await db.schema
        .alterTable('server_count')
        .renameTo('guild_counting')
        .execute();
};

export const down = async (db: Kysely<unknown>) => {
    await db.schema.dropTable('guild_member_counting').execute();
    await db.schema.dropTable('guild_counting').execute();
};
