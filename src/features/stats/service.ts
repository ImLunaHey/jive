import { db } from '@app/common/database';
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

    getDate(): `${number}${number}${number}${number}-${number}${number}-${number}${number}` {
        const today = new Date();
        const year = today.getFullYear().toString() as `${number}${number}${number}${number}`;
        const month = String(today.getMonth() + 1).padStart(2, '0') as `${number}${number}`;
        const day = String(today.getDate()).padStart(2, '0') as `${number}${number}`;
        return `${year}-${month}-${day}`;
    }

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
                    date: this.getDate(),
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
