import { db } from '@app/common/database';
import type { Feature } from '@app/common/database/enums';
import { globalLogger } from '@app/logger';

const globallyEnabled: Feature[] = [];

export const isFeatureEnabled = async (feature: Feature, guildId?: string) => {
    const check = async () => {
        if (!guildId) return false;

        // If the feature is enabled globally, return true
        if (globallyEnabled.includes(feature)) return true;

        // Is this feature enabled for this guild?
        const settings = await db
            .selectFrom('settings')
            .select('featuresEnabled')
            .where('guildId', '=', guildId)
            .executeTakeFirst();

        try {
            return settings?.featuresEnabled.includes(feature);
        } catch (error) {
            globalLogger.error(error);

            return false;
        }
    };

    return await check();
};
