import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export const up = async (db: Kysely<unknown>) => {
    // Create the new table
    await db.schema
        .createTable('guild_member_stats')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('member_id', 'varchar(36)', col => col.notNull())
        .addColumn('guild_id', 'varchar(36)', col => col.notNull())
        .addColumn('date', 'datetime', col => col.notNull())
        .addColumn('count', 'integer', col => col.notNull())
        .addUniqueConstraint('guild_id_member_id_date_unique', ['guild_id', 'member_id', 'date'])
        .execute();
};

export const down = async (db: Kysely<unknown>) => {
    await db.schema.dropTable('member_stats').execute();
};