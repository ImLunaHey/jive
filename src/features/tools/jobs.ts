import { Logger } from '@app/logger';
import { Cron, Expression } from '@reflet/cron';
import { database } from '@app/common/database';
import { sql } from 'kysely';
import { client } from '@app/client';

export class Jobs {
    private logger = new Logger({ service: 'Tools:Jobs' });

    constructor() {
        this.logger.info('Initialised');
    }

    @Cron.PreventOverlap
    @Cron(Expression.EVERY_30_SECONDS)
    async checkForReminders() {
        // Get all the reminders that've gone off
        const reminders = await database
            .selectFrom('reminders')
            .select('id')
            .select('guildId')
            .select('memberId')
            .select('reason')
            .where('timestamp', '<=', sql`now()`)
            .execute();

        // Clear these reminders
        await database
            .deleteFrom('reminders')
            .where('id', 'in', reminders.map(reminder => reminder.id))
            .execute();

        // Send reminders
        for (const reminder of reminders) {
            const member = client.guilds.cache.get(reminder.guildId)?.members.cache.get(reminder.memberId);
            if (!member) continue;

            // Send the reminder
            await member.send({
                embeds: [{
                    title: '🌼 Reminder!',
                    description: reminder.reason,
                }]
            });
        }
    }
}