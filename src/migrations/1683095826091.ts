import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export const up = async (database: Kysely<unknown>) => {
    // Insert reminders
    await database.schema
        .createTable('reminders')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('member_id', 'varchar(36)', col => col.notNull())
        .addColumn('guild_id', 'varchar(36)', col => col.notNull())
        .addColumn('reason', 'varchar(255)')
        .addColumn('timestamp', 'timestamp', col => col.notNull())
        .execute();
};

export const down = async (database: Kysely<unknown>) => {
    await database.schema.alterTable('guild_members').dropColumn('invited_by').execute();
};
