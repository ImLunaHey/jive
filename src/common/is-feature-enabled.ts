import { db } from '@app/common/database';
import { globalLogger } from '@app/logger';

const globallyEnabled: string[] = [];

export enum FeatureId {
    AUDIT_LOG = 'AUDIT_LOG',
    AUTO_DELETE = 'AUTO_DELETE',
    CUSTOM_COMMANDS = 'CUSTOM_COMMANDS',
    DYNAMIC_CHANNEL_NAMES = 'DYNAMIC_CHANNEL_NAMES',
    INVITE_TRACKING = 'INVITE_TRACKING',
    LEVELING = 'LEVELING',
    MODERATION = 'MODERATION',
    STARBOARD = 'STARBOARD',
    WELCOME = 'WELCOME',
}

export const isFeatureEnabled = async (featureId: FeatureId, guildId?: string) => {
    const check = async () => {
        if (!guildId) return false;

        // If the feature is enabled globally, return true
        if (globallyEnabled.includes(featureId)) return true;

        // Is this feature enabled for this guild?
        const settings = await db
            .selectFrom('settings')
            .select('featuresEnabled')
            .where('guildId', '=', guildId)
            .executeTakeFirst();

        try {
            return settings?.featuresEnabled.includes(featureId);
        } catch (error) {
            globalLogger.error(error);

            return false;
        }
    };

    return await check();
};
