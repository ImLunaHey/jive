import { db } from '@app/common/database';
import { globalLogger } from '@app/logger';
import { Cron, Expression } from '@reflet/cron';
import { type ArgsOf, Discord, On } from 'discordx';

@Discord()
export class Feature {
    private stats: {
        guildId: string;
        channelId: string;
        hour: number;
        count: number;
    }[] = [];
    private logger = globalLogger.child({ service: 'Stats' });

    constructor() {
        this.logger.info('Initialised');
    }

    @On({
        event: 'messageCreate'
    })
    onMessageCreate([message]: ArgsOf<'messageCreate'>) {
        try {
            const guildId = message.guild?.id;
            if (!guildId) return;

            const channelId = message.channel.id;
            const hour = new Date().getHours();
            const existingStatIndex = this.stats.findIndex(stat => stat.guildId === guildId && stat.channelId === channelId && stat.hour === hour);
            if (existingStatIndex === -1) {
                this.stats.push({
                    guildId,
                    channelId,
                    hour,
                    count: 1,
                });
                return;
            }

            this.stats[existingStatIndex].count += 1;
        } catch (error: unknown) {
            this.logger.error('Failed when recording stats', {
                error
            });
        }
    }

    @Cron.PreventOverlap
    @Cron(Expression.EVERY_30_SECONDS)
    async checkNeedsToWrite() {
        await this.writeData();
    }

    async writeData() {
        this.logger.info('Writing stats to database', {
            rows: this.stats.length,
        });
        for (const data of this.stats) {
            delete this.stats[this.stats.indexOf(data)];
            await db
                .insertInto('channel_stats')
                .values({
                    guildId: data.guildId,
                    channelId: data.channelId,
                    count: data.count,
                    hour: data.hour,
                })
                .onDuplicateKeyUpdate(eb => ({
                    count: eb.bxp('count', '+', data.count)
                }))
                .execute();
        }
    }
}
