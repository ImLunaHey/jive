import type { Kysely } from 'kysely';

export const up = async (database: Kysely<unknown>) => {
    // Rename table
    await database.schema
        .alterTable('member_count')
        .renameTo('guild_member_counting')
        .execute();

    // Rename table
    await database.schema
        .alterTable('server_count')
        .renameTo('guild_counting')
        .execute();
};

export const down = async (database: Kysely<unknown>) => {
    await database.schema.dropTable('guild_member_counting').execute();
    await database.schema.dropTable('guild_counting').execute();
};
