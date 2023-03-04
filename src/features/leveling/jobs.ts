import { globalLogger } from '@app/logger';
import { levelService } from '@app/features/leveling/service';
import { client } from '@app/client';
import { store } from '@app/store';
import { Cron, Expression } from '@reflet/cron';

export class Jobs {
    private logger = globalLogger.scope('Jobs');

    constructor() {
        this.logger.success('Jobs initialized');
    }

    @Cron.PreventOverlap
    @Cron(Expression.EVERY_MINUTE)
    async grantXp() {
        // Get all the users who have sent text messages this minute
        for (const [guildId, guild] of store.getState().usersWhoChattedThisMinute.entries()) {
            for (const userId in guild.values()) {
                this.logger.success('Granting %s text XP to "%s"', levelService.DEFAULT_XP, client.guilds.cache.get(guildId)?.members.cache.get(userId)?.user.username ?? `Unknown user [ID: ${userId}]`);

                // Clear them from the list
                store.getState().usersWhoChattedThisMinute.delete(userId);

                // Grant them XP
                levelService.grantXp(userId, levelService.DEFAULT_XP);
            }
        }

        // Get all the users who are currently in voice channels
        for (const [guildId, guild] of store.getState().usersInVC.entries()) {
            for (const userId in guild.values()) {
                this.logger.success('Granting %s voice XP to "%s"', levelService.DEFAULT_XP, client.guilds.cache.get(guildId)?.members.cache.get(userId)?.user.username ?? `Unknown user [ID: ${userId}]`);

                // Grant them XP
                await levelService.grantXp(userId, levelService.DEFAULT_XP);
            }
        }
    }
}