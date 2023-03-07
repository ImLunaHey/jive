import { prisma } from '@app/common/prisma-client';

const globallyEnabled: string[] = [];

export type globalFeatures =
    'auditLog' |
    'autoDelete' |
    'customCommand' |
    'dynamicChannelNames' |
    'inviteTracking' |
    'leveling' |
    'starboard' |
    'welcome'
    ;

export const isFeatureEnabled = async (id: globalFeatures, guildId?: string) => {
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
            },
            select: {
                auditLog: true,
                autoDelete: true,
                customCommand: true,
                dynamicChannelNames: true,
                inviteTracking: true,
                leveling: true,
                starboard: true,
                welcome: true,
            }
        });

        try {
            const feature = settings?.[id as keyof typeof settings];
            return feature?.enabled ?? false;
        } catch (error) {
            console.log(error);

            return false;
        }
    };

    return await check();
};
