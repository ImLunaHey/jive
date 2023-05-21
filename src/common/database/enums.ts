export const Actions = [
    'JOIN',
    'LEAVE',
    'BAN',
    'KICK',
    'MUTE',
    'UNMUTE',
    'WARN',
    'UNWARN',
    'PURGE',
    'ROLE_ADD',
    'ROLE_REMOVE',
    'ROLE_CREATE',
    'ROLE_DELETE',
    'ROLE_EDIT',
    'CHANNEL_CREATE',
    'CHANNEL_DELETE',
    'CHANNEL_EDIT',
    'MESSAGE_DELETE',
    'MESSAGE_BULK_DELETE',
    'MESSAGE_EDIT',
    'VOICE_KICK',
    'VOICE_MUTE',
    'VOICE_UNMUTE',
    'VOICE_MOVE',
    'VOICE_DEAFEN',
    'VOICE_UNDEAFEN',
    'GUILD_EDIT',
    'INVITE_CREATE',
    'INVITE_DELETE',
    'EMOJI_CREATE',
    'EMOJI_DELETE',
    'EMOJI_EDIT',
    'MEMBER_UPDATE',
] as const;
export type Action = typeof Actions[number];

export const Features = [
    'AUDIT_LOG',
    'AUTO_DELETE',
    'CUSTOM_COMMANDS',
    'DEBUG',
    'DYNAMIC_CHANNEL_NAMES',
    'ECONOMY',
    'INVITE_TRACKING',
    'LEVELING',
    'MODERATION',
    'REDDIT',
    'STARBOARD',
    'VOID',
    'WELCOME',
] as const;
export type Feature = typeof Features[number];

export const ItemTypes = [
    'WEAPON',
    'ARMOUR',
    'FOOD',
] as const;
export type ItemType = typeof ItemTypes[number];

export const ItemSubTypes = [
    'SWORD',
    'AXE',
    'BOW',
    'STAFF',
    'DAGGER',
    'SPEAR',
    'WAND',
    'FIST',
    'CROSSBOW',
    'HELMET',
    'CHEST',
    'LEGS',
    'FEET',
    'NECK',
    'RING',
    'SHIELD',
] as const;
export type ItemSubType = typeof ItemSubTypes[number];

export const Rarities = [
    'COMMON',
    'UNCOMMON',
    'RARE',
    'EPIC',
    'LEGENDARY',
    'MYTHIC',
] as const;
export type Rarity = typeof Rarities[number];

export const Slots = [
    'MAIN_HAND',
    'OFF_HAND',
    'HEAD',
    'NECK',
    'BODY',
    'RING',
    'LEGS',
    'FEET',
] as const;
export type Slot = typeof Slots[number];

export const Locations = [
    'FOREST',
    'DESERT',
    'CAVE',
    'MOUNTAIN',
    'BEACH',
    'TOWN',
    'CITY',
    'VILLAGE',
    'FARM',
    'RIVER',
    'LAKE',
    'OCEAN',
    'VOLCANO',
    'ICEBERG',
    'SNOWY_MOUNTAIN',
    'SNOWY_FOREST',
    'SNOWY_BEACH',
    'SNOWY_RIVER',
    'SNOWY_LAKE',
    'SNOWY_OCEAN',
    'SNOWY_VOLCANO',
    'SNOWY_ICEBERG',
    'SNOWY_TOWN',
    'SNOWY_CITY',
    'SNOWY_VILLAGE',
    'SNOWY_FARM',
    'SNOWY_DESERT',
    'SNOWY_CAVE',
    'SNOWY_PLAINS',
    'SNOWY_HILLS',
    'SNOWY_SWAMP',
    'SNOWY_JUNGLE',
    'SNOWY_TAIGA',
    'SNOWY_SAVANNA',
    'SNOWY_BADLANDS',
    'SNOWY_WASTELAND',
] as const;
export type Location = typeof Locations[number];

export const EntityTypes = [
    'CREATURE',
    'GUILD_MEMBER',
] as const;
export type EntityType = typeof EntityTypes[number];

export const ModerationActions = [
    'WARN',
    'KICK',
    'BAN'
] as const;
export type ModerationAction = typeof ModerationActions[number];

export const ModerationReasons = [
    'SPAM',
    'CUSTOM'
] as const;
export type ModerationReason = typeof ModerationReasons[number];
