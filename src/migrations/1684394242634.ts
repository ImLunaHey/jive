import type { Kysely } from 'kysely';

export const up = async (db: Kysely<unknown>) => {
    // Make guild_id unique
    await db.schema
        .alterTable('guild_counting')
        .addUniqueConstraint('guild_id_unique', ['guild_id'])
        .execute();
};

export const down = async (db: Kysely<unknown>) => {
    await db.schema.alterTable('guild_counting').dropConstraint('guild_id_unique').execute();
};
