import { db } from '@app/common/database';
import { globalLogger } from '@app/logger';
import type { Message } from 'discord.js';

class Service {
    private logger = globalLogger.child({ service: 'Stats' });

    public stats: {
        guildId: string;
        channelId: string;
        hour: number;
        count: number;
    }[] = [];

    newMessage(message: Message) {
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
            this.logger.error('Failed recording stats', {
                error
            });
        }
    }

    async writeData() {
        this.logger.info('Writing stats to database', {
            rows: this.stats.length,
        });
        try {
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
        } catch (error: unknown) {
            this.logger.error('Failed writing stats to database', {
                error
            });
        }
    }
}

export const service = new Service();
