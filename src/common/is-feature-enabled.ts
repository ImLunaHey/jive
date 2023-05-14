import { db } from '@app/common/database';
import type { Feature } from '@app/common/database/enums';
import { Logger } from '@app/logger';

const globallyEnabled: Feature[] = [];

const logger = new Logger({ service: 'common:is-feature-enabled' });

const check = async (feature: Feature, guildId?: string) => {
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
        return settings?.featuresEnabled.includes(feature) ?? false;
    } catch (error: unknown) {
        logger.error('Failed checking if feature is enabled', { error });

        return false;
    }
};

export const isFeatureEnabled = async (feature: Feature, guildId?: string) => {
    // Check if the feature is enabled
    const enabled = await check(feature, guildId);

    logger.debug('Checked if feature is enabled', {
        feature,
        guildId,
        enabled,
    });

    return enabled;
};
