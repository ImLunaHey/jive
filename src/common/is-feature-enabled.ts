import { prisma } from '@app/common/prisma-client';
import { globalLogger } from '@app/logger';

type Autocomplete<Keys extends string> = Keys | Omit<string, Keys>;

const globallyEnabled: string[] = [];

export const isFeatureEnabled = async (id: Autocomplete<'leveling' | 'welcome'>, guildId?: string) => {
    const check = async () => {
        if (!guildId) return false;

        // If the feature is enabled globally, return true
        if (globallyEnabled.includes(id as string)) return true;

        // Is this feature enabled for this guild?
        const features = await prisma.features.findFirst({
            where: {
                guild: {
                    id: guildId
                }
            },
            select: {
                leveling: true,
                welcome: true,
                autoRoles: true,
                starboard: true,
            }
        });

        try {
            return features?.[id as keyof typeof features].enabled;
        } catch {
            return false;
        }
    };

    const enabled = await check();
    globalLogger.debug('Checking feature enabled', { id, guildId, enabled });
    return enabled;
};
