import { Logger } from '@app/logger';
import { levelService } from '@app/features/leveling/service';
import { store } from '@app/store';
import { Cron, Expression } from '@reflet/cron';

export class Jobs {
    private logger = new Logger({ service: 'Leveling:Jobs' });

    constructor() {
        this.logger.info('Initialised');
    }

    @Cron.PreventOverlap
    @Cron(Expression.EVERY_MINUTE)
    async grantXp() {
        // Get all the users who have sent text messages this minute
        for (const [guildId, guild] of store.getState().usersWhoChattedThisMinute.entries()) {
            for (const memberId in guild.values()) {
                this.logger.info('Granting text XP to member', {
                    guildId,
                    memberId,
                    xp: levelService.DEFAULT_XP,
                });

                // Clear them from the list
                store.getState().usersWhoChattedThisMinute.delete(memberId);

                // Grant them XP
                await levelService.grantXp(memberId, levelService.DEFAULT_XP);
            }
        }

        // Get all the users who are currently in voice channels
        for (const [guildId, guild] of store.getState().usersInVC.entries()) {
            for (const memberId in guild.values()) {
                this.logger.info('Granting voice XP to member', {
                    guildId,
                    memberId,
                    xp: levelService.DEFAULT_XP,
                });

                // Grant them XP
                await levelService.grantXp(memberId, levelService.DEFAULT_XP);
            }
        }
    }
}