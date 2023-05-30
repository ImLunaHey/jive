import type { Kysely } from 'kysely';

export const up = async (database: Kysely<unknown>) => {
    // Update guild_members
    await database.schema
        .alterTable('guild_members')
        .addColumn('joined_timestamp', 'timestamp')
        .execute();
};

export const down = async (database: Kysely<unknown>) => {
    await database.schema.alterTable('guild_members').dropColumn('joined_timestamp').execute();
};
