import { prisma } from '@app/common/prisma-client';

export const isFeatureEnabled = async (id: string, guildId?: string) => {
    if (!guildId) return false;

    // Is this feature enabled for this guild?
    const feature = await prisma.feature.findFirst({ where: { id, guild: { id: guildId } } });
    if (feature?.enabled !== true) return false;

    return true;
};
