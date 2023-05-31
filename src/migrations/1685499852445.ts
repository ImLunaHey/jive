import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export const up = async (database: Kysely<unknown>) => {
    // FAQ
    await database.schema
        .createTable('faq')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('question', 'varchar(2000)')
        .addColumn('answer', 'varchar(2000)')
        .addColumn('guild_id', 'varchar(36)', col => col.notNull())
        .execute();
};

export const down = async (database: Kysely<unknown>) => {
    await database.schema.dropTable('faq').execute();
};
