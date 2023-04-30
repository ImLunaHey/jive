import { EntityTypes, ItemSubTypes, ItemTypes, Locations, Rarities, Slots } from '@app/common/database/enums';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export const up = async (db: Kysely<unknown>) => {
    // Attack
    await db.schema
        .createTable('attacks')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('time', 'timestamp')
        .addColumn('encounter_id', 'varchar(36)', (col) => col.notNull())
        .addColumn('attacker_id', 'varchar(36)', (col) => col.notNull())
        .addColumn('attackerType', sql`enum(${sql.join(EntityTypes.map(arg => sql.lit(arg)))})`)
        .addColumn('defender_id', 'varchar(36)', (col) => col.notNull())
        .addColumn('defenderType', sql`enum(${sql.join(EntityTypes.map(arg => sql.lit(arg)))})`)
        .addColumn('damage', 'integer')
        .execute();

    // AuditLog
    await db.schema
        .createTable('audit_logs')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('guild_id', 'varchar(36)', col => col.notNull())
        .addColumn('enabled', 'boolean', col => col.defaultTo(true))
        .addColumn('channel_id', 'varchar(36)', col => col.notNull())
        .addColumn('ignored_actions', 'json', col => col.defaultTo('["JOIN", "LEAVE", "BAN", "KICK", "MUTE", "UNMUTE", "WARN", "UNWARN", "PURGE", "ROLE_ADD", "ROLE_REMOVE", "ROLE_CREATE", "ROLE_DELETE", "ROLE_EDIT", "CHANNEL_CREATE", "CHANNEL_DELETE", "CHANNEL_EDIT", "MESSAGE_DELETE", "MESSAGE_BULK_DELETE", "MESSAGE_EDIT", "VOICE_KICK", "VOICE_MUTE", "VOICE_UNMUTE", "VOICE_MOVE", "VOICE_DEAFEN", "VOICE_UNDEAFEN", "GUILD_EDIT", "INVITE_CREATE", "INVITE_DELETE", "EMOJI_CREATE", "EMOJI_DELETE", "EMOJI_EDIT", "MEMBER_UPDATE", ]'))
        .addColumn('ignore_bots', 'boolean', col => col.defaultTo(false))
        .addColumn('ignored_roles', 'json', col => col.defaultTo('[]'))
        .addColumn('ignored_users', 'json', col => col.defaultTo('[]'))
        .addColumn('ignored_channels', 'json', col => col.defaultTo('[]'))
        .addUniqueConstraint('guild_id_channel_id_unique', ['guild_id', 'channel_id'])
        .execute();

    // AutoDelete
    await db.schema
        .createTable('auto_deletes')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('guild_id', 'varchar(36)', col => col.notNull())
        .addColumn('enabled', 'boolean', col => col.notNull().defaultTo(true))
        .addColumn('inverted', 'boolean', col => col.notNull().defaultTo(false))
        .addColumn('timeout', 'integer', col => col.notNull().defaultTo(0))
        .addColumn('trigger_channel_id', 'varchar(36)', col => col.notNull())
        .addColumn('trigger_message', 'text', col => col.notNull())
        .addColumn('reply_message', 'text', col => col.notNull())
        .addColumn('reply_timeout', 'integer', col => col.notNull().defaultTo(0))
        .execute();

    // Creature
    await db.schema
        .createTable('creatures')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('name', 'varchar(1000)', col => col.notNull())
        .addColumn('health', 'integer', col => col.notNull())
        .addColumn('attack', 'integer', col => col.notNull())
        .addColumn('defence', 'integer', col => col.notNull())
        .addColumn('encounter_id', 'varchar(36)', col => col.notNull())
        .addColumn('template_id', 'varchar(36)', col => col.notNull())
        .execute();

    // CreatureTemplate
    await db.schema
        .createTable('creature_templates')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('name', 'varchar(1000)')
        .addColumn('emoji', 'varchar(50)')
        .addColumn('description', 'text')
        .addColumn('location', sql`enum(${sql.join(Locations.map(arg => sql.lit(arg)))})`)
        .addColumn('rarity', sql`enum(${sql.join(Rarities.map(arg => sql.lit(arg)))})`)
        .addColumn('image_url', 'varchar(1000)', col => col.defaultTo(null))
        .addColumn('health', 'integer', col => col.notNull())
        .addColumn('attack', 'integer', col => col.notNull())
        .addColumn('defence', 'integer', col => col.notNull())
        .addColumn('xp', 'integer', col => col.notNull())
        .execute();

    // CustomCommand
    await db.schema
        .createTable('custom_commands')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('guild_id', 'varchar(36)', col => col.notNull())
        .addColumn('enabled', 'boolean', col => col.defaultTo(true))
        .addColumn('name', 'varchar(100)', col => col.notNull())
        .addColumn('trigger_channel_id', 'varchar(36)', col => col.defaultTo(null))
        .addColumn('trigger_message', 'text', col => col.defaultTo(null))
        .addColumn('delete_trigger', 'boolean', col => col.defaultTo(false))
        .addColumn('response_message', 'text', col => col.defaultTo(null))
        .addColumn('response_timeout', 'integer', col => col.defaultTo(0))
        .addColumn('add_roles', 'json', col => col.defaultTo('[]'))
        .addColumn('remove_roles', 'json', col => col.defaultTo('[]'))
        .addUniqueConstraint('guild_id_name_unique', ['guild_id', 'name'])
        .execute();

    // DynamicChannel
    await db.schema
        .createTable('dynamic_channels')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('guild_id', 'varchar(36)', col => col.notNull())
        .addColumn('enabled', 'boolean', col => col.defaultTo(true))
        .addColumn('channel_id', 'varchar(36)', col => col.notNull())
        .addColumn('template', 'text', col => col.notNull())
        .addUniqueConstraint('guild_id_channel_id_unique', ['guild_id', 'channel_id'])
        .execute();

    // Encounter
    await db.schema
        .createTable('encounters')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('location', sql`enum(${sql.join(Locations.map(arg => sql.lit(arg)))})`)
        .addColumn('guild_id', 'varchar(36)')
        .addColumn('guild_member_ids', 'json', (col) => col.defaultTo('[]'))
        .addColumn('creature_ids', 'json', (col) => col.defaultTo('[]'))
        .addColumn('start', 'timestamp', col => col.notNull())
        .addColumn('end', 'timestamp', col => col.defaultTo(null))
        .addColumn('turn', 'integer', col => col.defaultTo(0))
        .execute();

    // Guild
    await db.schema
        .createTable('guilds')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('ticket_number', 'integer', col => col.notNull())
        .addColumn('enabled', 'boolean', col => col.defaultTo(true))
        .execute();

    // GuildMember
    await db.schema
        .createTable('guild_members')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('guild_id', 'varchar(36)', (col) => col.notNull())
        .addColumn('xp', 'integer', (col) => col.defaultTo(null))
        .addColumn('coins', 'integer', (col) => col.defaultTo(null))
        .addColumn('health', 'integer', (col) => col.defaultTo(null))
        .addColumn('location', sql`enum(${sql.join(Locations.map(arg => sql.lit(arg)))})`, (col) => col.defaultTo('TOWN'))
        .addColumn('strength', 'integer', (col) => col.defaultTo(null))
        .addColumn('dexterity', 'integer', (col) => col.defaultTo(null))
        .addColumn('constitution', 'integer', (col) => col.defaultTo(null))
        .addColumn('intelligence', 'integer', (col) => col.defaultTo(null))
        .addColumn('wisdom', 'integer', (col) => col.defaultTo(null))
        .addColumn('charisma', 'integer', (col) => col.defaultTo(null))
        .addColumn('luck', 'integer', (col) => col.defaultTo(null))
        .addColumn('woodcutting', 'integer', (col) => col.defaultTo(null))
        .addColumn('smithing', 'integer', (col) => col.defaultTo(null))
        .addColumn('crafting', 'integer', (col) => col.defaultTo(null))
        .addColumn('stealth', 'integer', (col) => col.defaultTo(null))
        .addColumn('mining', 'integer', (col) => col.defaultTo(null))
        .addColumn('farming', 'integer', (col) => col.defaultTo(null))
        .addColumn('alchemy', 'integer', (col) => col.defaultTo(null))
        .addColumn('research', 'integer', (col) => col.defaultTo(null))
        .addColumn('enchanting', 'integer', (col) => col.defaultTo(null))
        .addColumn('fishing', 'integer', (col) => col.defaultTo(null))
        .addColumn('summoning', 'integer', (col) => col.defaultTo(null))
        .addColumn('performing', 'integer', (col) => col.defaultTo(null))
        .addColumn('cooking', 'integer', (col) => col.defaultTo(null))
        .addColumn('encounter_id', 'varchar(36)', (col) => col.defaultTo(null))
        .addUniqueConstraint('guild_id_member_id_unique', ['guild_id', 'id'])
        .execute();

    // Initiative
    await db.schema
        .createTable('initiatives')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('encounter_id', 'varchar(36)', (col) => col.notNull())
        .addColumn('roll', 'integer', (col) => col.notNull())
        .addColumn('order', 'integer', (col) => col.notNull())
        .addColumn('entity_id', 'varchar(36)', (col) => col.notNull())
        .addColumn('entity_type', sql`enum(${sql.join(Object.values(EntityTypes).map(arg => sql.lit(arg)))})`, col => col.notNull())
        .execute();

    // Invite
    await db.schema
        .createTable('invites')
        .ifNotExists()
        .addColumn('code', 'varchar(50)', col => col.primaryKey().notNull())
        .addColumn('uses', 'integer', col => col.defaultTo(0))
        .addColumn('guild_id', 'varchar(36)', (col) => col.notNull())
        .execute();

    // InviteTracking
    await db.schema
        .createTable('invite_tracking')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('guild_id', 'varchar(36)', (col) => col.notNull())
        .addColumn('enabled', 'boolean', col => col.defaultTo(true))
        .addColumn('channel_id', 'varchar(36)', col => col.defaultTo(null))
        .addColumn('message', 'text', col => col.defaultTo(null))
        .execute();

    // Item
    await db.schema
        .createTable('items')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('name', 'varchar(255)', col => col.notNull())
        .addColumn('emoji', 'varchar(255)', col => col.notNull())
        .addColumn('description', 'text', col => col.notNull())
        .addColumn('rarity', sql`enum(${sql.join(Object.values(Rarities).map(arg => sql.lit(arg)))})`)
        .addColumn('price', 'integer', col => col.notNull())
        .addColumn('quantity', 'integer', col => col.defaultTo(null))
        .addColumn('cool_down', 'integer', col => col.defaultTo(null))
        .addColumn('damage', 'integer', col => col.defaultTo(null))
        .addColumn('defence', 'integer', col => col.defaultTo(null))
        .addColumn('bonus', 'integer', col => col.defaultTo(null))
        .addColumn('heal', 'integer', col => col.defaultTo(null))
        .addColumn('chance', 'integer', col => col.defaultTo(null))
        .addColumn('owner_id', 'varchar(36)', col => col.notNull())
        .addColumn('equipped', 'boolean', col => col.defaultTo(false))
        .addColumn('template_id', 'varchar(36)', col => col.notNull())
        .addColumn('type', sql`enum(${sql.join(Object.values(ItemTypes).map(arg => sql.lit(arg)))})`)
        .addColumn('sub_type', sql`enum(${sql.join(Object.values(ItemSubTypes).map(arg => sql.lit(arg)))})`)
        .addColumn('slot', sql`enum(${sql.join(Object.values(Slots).map(arg => sql.lit(arg)))})`, col => col.defaultTo(null))
        .execute();

    // Leveling
    await db.schema
        .createTable('leveling')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('guild_id', 'varchar(36)', col => col.notNull())
        .addColumn('enabled', 'boolean', col => col.defaultTo(false))
        .addColumn('leveling_channel_id', 'varchar(36)', col => col.defaultTo(null))
        .addColumn('leveling_message', 'text', col => col.defaultTo(null))
        .execute();

    // Purchase
    await db.schema
        .createTable('purchases')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('member_id', 'varchar(36)', col => col.notNull())
        .addColumn('shop_item_id', 'varchar(36)', col => col.notNull())
        .addColumn('quantity', 'integer', col => col.defaultTo(1))
        .addColumn('purchased', 'timestamp', col => col.defaultTo(sql`now()`).notNull())
        .execute();

    // RateLimit
    await db.schema
        .createTable('rate_limits')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('count', 'integer', col => col.defaultTo(0).notNull())
        .addColumn('last_reset', 'timestamp', col => col.defaultTo(sql`now()`).notNull())
        .addColumn('member_id', 'varchar(36)', col => col.notNull())
        .addColumn('guild_id', 'varchar(36)', col => col.notNull())
        .execute();

    // Settings
    await db.schema
        .createTable('settings')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('features_enabled', 'json', col => col.defaultTo(JSON.stringify([])))
        .addColumn('guild_id', 'varchar(36)', col => col.notNull())
        .execute();

    // Shop
    await db.schema
        .createTable('shops')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('name', 'varchar(255)', col => col.notNull())
        .addColumn('description', 'text', col => col.notNull())
        .addColumn('location', sql`enum(${sql.join(Locations.map(arg => sql.lit(arg)))})`)
        .execute();

    // Starboard
    await db.schema
        .createTable('starboards')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('guild_id', 'varchar(36)', col => col.notNull())
        .addColumn('enabled', 'boolean', col => col.defaultTo(false))
        .addColumn('starboard_channel_id', 'varchar(36)', col => col.notNull())
        .addColumn('minimum_reactions', 'integer', col => col.defaultTo(1))
        .addColumn('allowed_reactions', 'json', col => col.defaultTo(JSON.stringify([])))
        .addColumn('trigger_channel_id', 'varchar(36)', col => col.defaultTo(null))
        .execute();

    // Welcome
    await db.schema
        .createTable('welcomes')
        .ifNotExists()
        .addColumn('id', 'varchar(36)', (col) => col.defaultTo(sql`(uuid())`).primaryKey().notNull())
        .addColumn('guild_id', 'varchar(36)', col => col.notNull())
        .addColumn('enabled', 'boolean', col => col.defaultTo(false).notNull())
        .addColumn('wait_until_gate', 'boolean', col => col.defaultTo(false).notNull())
        .addColumn('join_channel_id', 'varchar(36)')
        .addColumn('join_dm', 'boolean', col => col.defaultTo(false).notNull())
        .addColumn('join_message', 'text')
        .addColumn('join_message_timeout', 'integer', col => col.defaultTo(0).notNull())
        .addColumn('leave_channel_id', 'varchar(36)')
        .addColumn('leave_dm', 'boolean', col => col.defaultTo(false).notNull())
        .addColumn('leave_message', 'text')
        .addColumn('add_roles', 'json', col => col.defaultTo(JSON.stringify([])))
        .addColumn('remove_roles', 'json', col => col.defaultTo(JSON.stringify([])))
        .execute();
};

export const down = async (db: Kysely<unknown>) => {
    await db.schema.dropTable('attacks').execute();
    await db.schema.dropTable('audit_logs').execute();
    await db.schema.dropTable('auto_deletes').execute();
    await db.schema.dropTable('creatures').execute();
    await db.schema.dropTable('creature_templates').execute();
    await db.schema.dropTable('custom_commands').execute();
    await db.schema.dropTable('dynamic_channels').execute();
    await db.schema.dropTable('encounters').execute();
    await db.schema.dropTable('guilds').execute();
    await db.schema.dropTable('guild_members').execute();
    await db.schema.dropTable('initiatives').execute();
    await db.schema.dropTable('invites').execute();
    await db.schema.dropTable('invite_tracking').execute();
    await db.schema.dropTable('items').execute();
};