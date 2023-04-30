import type { Kysely } from 'kysely';

export const up = async (db: Kysely<unknown>) => {
    // Update invites
    await db.schema
        .alterTable('invites')
        .addColumn('member_id', 'varchar(36)')
        .execute();
};

export const down = async (db: Kysely<unknown>) => {
    await db.schema.alterTable('invites').dropColumn('member_id').execute();
};