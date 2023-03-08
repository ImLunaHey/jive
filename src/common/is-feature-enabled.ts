import { prisma } from '@app/common/prisma-client';
import { globalLogger } from '@app/logger';

const globallyEnabled: string[] = [];

export enum Features {
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

export const isFeatureEnabled = async (id: Features, guildId?: string) => {
    const check = async () => {
        if (!guildId) return false;

        // If the feature is enabled globally, return true
        if (globallyEnabled.includes(id as string)) return true;

        // Is this feature enabled for this guild?
        const settings = await prisma.settings.findFirst({
            where: {
                guild: {
                    id: guildId
                }
            }
        });

        try {
            return settings?.featuresEnabled.includes(id);
        } catch (error) {
            globalLogger.error(error);

            return false;
        }
    };

    return await check();
};
