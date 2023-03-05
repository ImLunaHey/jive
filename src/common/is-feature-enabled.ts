import { prisma } from '@app/common/prisma-client';

const globallyEnabled: string[] = [];

export const isFeatureEnabled = async (id: 'leveling' | 'welcome' | 'starboard' | 'autoRoles' | 'customCommand', guildId?: string) => {
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
                customCommand: true
            }
        });

        try {
            const feature = features?.[id as keyof typeof features];
            return feature?.enabled ?? false;
        } catch (error) {
            console.log(error);

            return false;
        }
    };

    return await check();
};
