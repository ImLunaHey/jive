import { db } from '@app/common/database';
import { getDate } from '@app/common/get-date';
import { globalLogger } from '@app/logger';
import type { Message } from 'discord.js';

class Service {
    private logger = globalLogger.child({ service: 'Stats' });

    public stats: {
        guildId: string;
        channelId: string;
        date: `${number}${number}${number}${number}-${number}${number}-${number}${number}`;
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
                    date: getDate(),
                    hour,
                    count: 1,
                });
                return;
            }

            this.stats[existingStatIndex].count += 1;
        } catch (error: unknown) {
            this.logger.error('Failed recording stats', {
                error,
            });
            console.log(error);
        }
    }

    async writeData() {
        if (this.stats.length === 0) return;

        this.logger.info('Writing stats to database', {
            rows: this.stats.length,
        });
        try {
            const stats = structuredClone(this.stats);
            this.stats = [];
            for (const data of stats) {
                await db
                    .insertInto('channel_stats')
                    .values({
                        guildId: data.guildId,
                        channelId: data.channelId,
                        date: data.date,
                        hour: data.hour,
                        count: data.count,
                    })
                    .onDuplicateKeyUpdate(eb => ({
                        count: eb.bxp('count', '+', data.count)
                    }))
                    .execute();
            }
        } catch (error: unknown) {
            this.logger.error('Failed writing stats to database', {
                error,
            });
            console.log(error);
        }
    }
}

export const service = new Service();
