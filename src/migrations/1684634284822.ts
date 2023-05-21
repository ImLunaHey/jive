import { ModerationActions, ModerationReasons } from '@app/common/database/enums';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export const up = async (db: Kysely<unknown>) => {
    // Moderation
    await db.schema
        .createTable('moderation')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('action', sql`enum(${sql.join(Object.values(ModerationActions).map(arg => sql.lit(arg)))})`, col => col.notNull())
        .addColumn('reason', sql`enum(${sql.join(Object.values(ModerationReasons).map(arg => sql.lit(arg)))})`, col => col.notNull())
        .addColumn('custom_reason', 'varchar(2000)')
        .addColumn('member_id', 'varchar(36)', col => col.notNull())
        .addColumn('moderator_id', 'varchar(36)', col => col.notNull())
        .addColumn('guild_id', 'varchar(36)', col => col.notNull())
        .execute();
};

export const down = async (db: Kysely<unknown>) => {
    await db.schema.dropTable('moderation').execute();
};
