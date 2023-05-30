import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export const up = async (database: Kysely<unknown>) => {
    // Insert member count
    await database.schema
        .createTable('member_count')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('guild_id', 'varchar(36)', col => col.notNull())
        .addColumn('member_id', 'varchar(36)', col => col.notNull())
        .addColumn('highest_count', 'integer')
        .execute();

    // Insert server count
    await database.schema
        .createTable('server_count')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('guild_id', 'varchar(36)', col => col.notNull())
        .addColumn('member_id', 'varchar(36)', col => col.notNull())
        .addColumn('highest_count', 'integer', col => col.notNull().defaultTo(0))
        .addColumn('current_count', 'integer', col => col.notNull().defaultTo(0))
        .addColumn('last_reset_timestamp', 'datetime')
        .addColumn('last_reset_member_id', 'varchar(36)')
        .execute();
};

export const down = async (database: Kysely<unknown>) => {
    await database.schema.dropTable('member_count').execute();
    await database.schema.dropTable('server_count').execute();
};
