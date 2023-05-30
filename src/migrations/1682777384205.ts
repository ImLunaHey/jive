import type { Kysely } from 'kysely';

export const up = async (database: Kysely<unknown>) => {
    // Update invites
    await database.schema
        .alterTable('invites')
        .addColumn('member_id', 'varchar(36)')
        .execute();
};

export const down = async (database: Kysely<unknown>) => {
    await database.schema.alterTable('invites').dropColumn('member_id').execute();
};