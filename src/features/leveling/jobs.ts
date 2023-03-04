import { logger } from '@app/logger';
import { levelService } from '@app/features/leveling/service';
import { client } from '@app/client';
import { store } from '@app/store';
import { Cron, Expression } from '@reflet/cron';

export class Jobs {
    constructor() {
        logger.success('Leveling jobs initialized');
    }

    @Cron.PreventOverlap
    @Cron.RunOnInit
    @Cron(Expression.EVERY_MINUTE)
    async grantXp() {
        // Get all the users who have sent text messages this minute
        store.getState().usersWhoChattedThisMinute.forEach(async (userId) => {
            logger.success('Granting %s text XP to "%s"', 100, client.guilds.cache.get('927461441051701280')?.members.cache.get(userId)?.user.username ?? `Unknown user [ID: ${userId}]`);

            // Clear them from the list
            store.getState().usersWhoChattedThisMinute.delete(userId);

            // Grant them XP
            levelService.grantXp(userId, 100);
        });

        // Get all the users who are currently in voice channels
        store.getState().usersInVC.forEach(async (userId) => {
            logger.success('Granting %s voice XP to "%s"', 100, client.guilds.cache.get('927461441051701280')?.members.cache.get(userId)?.user.username ?? `Unknown user [ID: ${userId}]`);

            // Grant them XP
            levelService.grantXp(userId, 100);
        });
    }
}