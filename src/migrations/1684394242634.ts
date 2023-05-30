import type { Kysely } from 'kysely';

export const up = async (database: Kysely<unknown>) => {
    // Make guild_id unique
    await database.schema
        .alterTable('guild_counting')
        .addUniqueConstraint('guild_id_unique', ['guild_id'])
        .execute();
};

export const down = async (database: Kysely<unknown>) => {
    await database.schema.alterTable('guild_counting').dropConstraint('guild_id_unique').execute();
};
