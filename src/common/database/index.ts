import { PlanetScaleDialect } from 'kysely-planetscale';
import { fetch } from 'undici';
import { CamelCasePlugin, Kysely } from 'kysely';
import type { ColumnType, RawBuilder } from 'kysely';
import { env } from '@app/env';
import type { Action, EntityType, Feature, ItemSubType, ItemType, Location, Rarity, Slot } from '@app/common/database/enums';

export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type Attack = {
    id: string;
    encounterId: string;
    time: Timestamp;
    attackerId: string | null;
    attackerType: EntityType | null;
    defenderId: string | null;
    defenderType: EntityType | null;
    damage: number;
};
export type AuditLog = {
    id: string;
    guildId: ColumnType<string, string, never>;
    enabled: boolean;
    channelId: string;
    ignoredActions: Action[];
    ignoreBots: boolean;
    ignoredRoles: string[];
    ignoredUsers: string[];
    ignoredChannels: string[];
};
export type AutoDelete = {
    id: string;
    guildId: ColumnType<string, string, never>;
    enabled: boolean;
    inverted: boolean;
    timeout: number;
    triggerChannelId: string | null;
    triggerMessage: string | null;
    replyMessage: string | null;
    replyTimeout: number;
};
export type Creature = {
    id: string;
    name: string;
    health: number;
    attack: number;
    defence: number;
    encounterId: string;
    templateId: string;
};
export type CreatureTemplate = {
    id: string;
    name: string;
    emoji: string;
    description: string;
    location: Location;
    rarity: Rarity;
    imageUrl: string | null;
    health: number;
    attack: number;
    defence: number;
    xp: number;
};
export type CustomCommand = {
    id: string;
    guildId: ColumnType<string, string, never>;
    enabled: boolean;
    name: string;
    triggerChannelId: string | null;
    triggerMessage: string | null;
    deleteTrigger: boolean;
    responseMessage: string | null;
    responseTimeout: number;
    addRoles: string[];
    removeRoles: string[];
};
export type DynamicChannel = {
    id: string;
    guildId: ColumnType<string, string, never>;
    enabled: boolean;
    channelId: string;
    template: string;
};
export type Encounter = {
    id: string;
    location: Location;
    guildId: string;
    guildMembers: ColumnType<string[], RawBuilder<string[]>, RawBuilder<string[]>>;
    creatures: ColumnType<string[], RawBuilder<string[]>, RawBuilder<string[]>>;
    start: Timestamp;
    end: Timestamp | null;
    turn: number;
};
export type ExtraMessage = {
    id: string;
    message: string;
    channelId: string | null;
    customCommandId: string;
};
export type Guild = {
    id: string;
    enabled: boolean;
    coins: number;
    ticketNumber: number;
};
export type GuildMember = {
    id: ColumnType<string, string, never>;
    guildId: ColumnType<string, string, never>;
    xp: ColumnType<number, number | undefined, number>;
    coins: ColumnType<number, number | undefined, number>;
    health: ColumnType<number, number | undefined, number>;
    location: ColumnType<Location, Location | undefined, Location>;
    strength: ColumnType<number, number | undefined, number>;
    dexterity: ColumnType<number, number | undefined, number>;
    constitution: ColumnType<number, number | undefined, number>;
    intelligence: ColumnType<number, number | undefined, number>;
    wisdom: ColumnType<number, number | undefined, number>;
    charisma: ColumnType<number, number | undefined, number>;
    luck: ColumnType<number, number | undefined, number>;
    woodcutting: ColumnType<number, number | undefined, number>;
    smithing: ColumnType<number, number | undefined, number>;
    crafting: ColumnType<number, number | undefined, number>;
    stealth: ColumnType<number, number | undefined, number>;
    mining: ColumnType<number, number | undefined, number>;
    farming: ColumnType<number, number | undefined, number>;
    alchemy: ColumnType<number, number | undefined, number>;
    research: ColumnType<number, number | undefined, number>;
    enchanting: ColumnType<number, number | undefined, number>;
    fishing: ColumnType<number, number | undefined, number>;
    summoning: ColumnType<number, number | undefined, number>;
    performing: ColumnType<number, number | undefined, number>;
    cooking: ColumnType<number, number | undefined, number>;
    encounterId: string | null;
};
export type Initiative = {
    id: string;
    encounterId: string;
    roll: number;
    order: number;
    entityId: string;
    entityType: EntityType;
};
export type Invite = {
    code: string;
    uses: number;
    guildId: ColumnType<string, string, never>;
};
export type InviteTracking = {
    id: string;
    guildId: ColumnType<string, string, never>;
    enabled: boolean;
    channelId: string | null;
    message: string | null;
};
export type Item = {
    id: string;
    name: string;
    emoji: string;
    description: string;
    rarity: Rarity;
    price: number;
    quantity: number | null;
    coolDown: number | null;
    damage: number | null;
    defence: number | null;
    bonus: number | null;
    heal: number | null;
    chance: number | null;
    ownerId: string;
    equipped: boolean;
    templateId: string;
    type: ItemType;
    subType: ItemSubType;
    slot: Slot | null;
};
export type ItemTemplate = {
    id: string;
    name: string;
    emoji: string;
    description: string;
    rarity: Rarity;
    price: number;
    quantity: number | null;
    coolDown: number | null;
    damage: number | null;
    defence: number | null;
    bonus: number | null;
    heal: number | null;
    chance: number | null;
    type: ItemType;
    subType: ItemSubType;
    slot: Slot | null;
    shopId: string | null;
    creatureId: string | null;
};
export type Leveling = {
    id: string;
    guildId: ColumnType<string, string, never>;
    enabled: boolean;
    levelingChannelId: string | null;
    levelingMessage: string | null;
};
export type Purchase = {
    id: string;
    memberId: string;
    shopItemId: string;
    quantity: number;
    purchased: Timestamp;
};
export type RateLimit = {
    id: string;
    count: number;
    lastReset: Timestamp;
    memberId: string;
    guildId: string;
};
export type Settings = {
    id: string;
    featuresEnabled: ColumnType<Feature[], RawBuilder<Feature[]>, RawBuilder<Feature[]>>;
    guildId: string;
};
export type Shop = {
    id: string;
    name: string;
    description: string;
    location: Location;
};
export type Starboard = {
    id: string;
    guildId: ColumnType<string, string, never>;
    enabled: boolean;
    starboardChannelId: string;
    minimumReactions: number;
    allowedReactions: string[];
    triggerChannelId: string | null;
};
export type Welcome = {
    id: string;
    guildId: ColumnType<string, string, never>;
    enabled: boolean;
    waitUntilGate: boolean;
    joinChannelId: string | null;
    joinDm: boolean;
    joinMessage: string | null;
    joinMessageTimeout: number;
    leaveChannelId: string | null;
    leaveDm: boolean;
    leaveMessage: string | null;
    addRoles: string[];
    removeRoles: string[];
};

export type Database = {
    attacks: Attack;
    audit_logs: AuditLog;
    auto_deletes: AutoDelete;
    creatures: Creature;
    creature_templates: CreatureTemplate;
    custom_commands: CustomCommand;
    dynamic_channels: DynamicChannel;
    encounters: Encounter;
    extra_messages: ExtraMessage;
    guilds: Guild;
    guild_members: GuildMember;
    initiatives: Initiative;
    invites: Invite;
    invite_trackings: InviteTracking;
    items: Item;
    item_templates: ItemTemplate;
    leveling: Leveling;
    purchases: Purchase;
    rate_limits: RateLimit;
    settings: Settings;
    shops: Shop;
    starboards: Starboard;
    welcomes: Welcome;
};

export const db = new Kysely<Database>({
    dialect: new PlanetScaleDialect({
        url: env.DATABASE_URL,
        fetch,
    }),
    plugins: [
        new CamelCasePlugin(),
    ],
});