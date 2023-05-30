import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export const up = async (database: Kysely<unknown>) => {
    // Create the new table
    await database.schema
        .createTable('guild_stats')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('guild_id', 'varchar(36)', col => col.notNull())
        .addColumn('fastest_leave', 'integer')
        .execute();
};

export const down = async (database: Kysely<unknown>) => {
    await database.schema.dropTable('guild_stats').execute();
};