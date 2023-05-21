import { PlanetScaleDialect } from 'kysely-planetscale';
import { fetch } from 'undici';
import { CamelCasePlugin, Kysely } from 'kysely';
import type { ColumnType, RawBuilder } from 'kysely';
import { env } from '@app/env';
import type { Action, EntityType, Feature, ItemSubType, ItemType, Location, ModerationAction, ModerationReason, Rarity, Slot } from '@app/common/database/enums';

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

    // Should we capture stats for this user
    statsOptedIn: ColumnType<boolean, boolean | undefined, boolean>;

    // When did they join
    joinedTimestamp: number;

    // Who invited them
    invitedBy?: string;
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
    memberId: ColumnType<string, string, never>;
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
export type Reminder = {
    id: ColumnType<string, never, never>;
    memberId: string;
    guildId: string;
    reason?: string;
    timestamp: Timestamp;
}
export type Settings = {
    id: ColumnType<string, never, never>;
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
export type ChannelStat = {
    guildId: ColumnType<string, string, never>;
    channelId: ColumnType<string, string, never>;
    date: Date;
    count: number;
};
export type GuildMemberStat = {
    memberId: ColumnType<string, string, never>;
    guildId: ColumnType<string, string, never>;
    date: Date;
    count: number;
};
export type GuildStat = {
    guildId: ColumnType<string, string, never>;
    fastestLeave: number;
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

type GuildCounting = {
    // Which guild this is
    guildId: string;
    // The highest count this guild has gotten
    highestCount: number;
    // The current count
    currentCount: number;
    // The last member to post a number
    lastMemberId: string | null;
    // The last member to break the count
    lastResetTimestamp: Date | null;
    // When the count was last broken
    lastResetMemberId: string | null;
}

type GuildMemberCounting = {
    guildId: string;
    memberId: string;
    highestCount: number;
}

export type Moderation = {
    /**
     * The thing that happened
     */
    action: ModerationAction;
    /**
     * Why it happened
     */
    reason: ModerationReason;
    /**
     * If reason is set to "CUSTOM" use this
     */
    custom_reason?: string;
    /**
     * Who actioned this
     */
    moderator_id: string;
    /**
     * Who did the thing
     */
    member_id: string;
}

// /warn user:notch reason: yeah?
// /timeout user:notch reason: no?
// /kick user:notch reason: he sucks
// /ban user:notch reason: he still sucks

export type Database = {
    attacks: Attack;
    audit_logs: AuditLog;
    auto_deletes: AutoDelete;
    channel_stats: ChannelStat;
    creature_templates: CreatureTemplate;
    creatures: Creature;
    custom_commands: CustomCommand;
    dynamic_channels: DynamicChannel;
    encounters: Encounter;
    extra_messages: ExtraMessage;
    guild_counting: GuildCounting;
    guild_member_counting: GuildMemberCounting;
    guild_member_stats: GuildMemberStat;
    guild_members: GuildMember;
    guild_stats: GuildStat;
    guilds: Guild;
    initiatives: Initiative;
    invite_tracking: InviteTracking;
    invites: Invite;
    item_templates: ItemTemplate;
    items: Item;
    leveling: Leveling;
    moderation: Moderation;
    purchases: Purchase;
    rate_limits: RateLimit;
    reminders: Reminder;
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