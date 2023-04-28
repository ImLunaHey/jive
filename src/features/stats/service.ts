import { db } from '@app/common/database';
import { getDate } from '@app/common/get-date';
import { globalLogger } from '@app/logger';
import type { Message } from 'discord.js';

class Service {
    private logger = globalLogger.child({ service: 'Stats' });

    public channelStats: {
        guildId: string;
        channelId: string;
        date: `${number}${number}${number}${number}-${number}${number}-${number}${number}`;
        hour: number;
        count: number;
    }[] = [];

    public memberStats: {
        guildId: string;
        memberId: string;
        date: `${number}${number}${number}${number}-${number}${number}-${number}${number}`;
        hour: number;
        count: number;
    }[] = [];

    /**
     * Is a guild member opted into stats collection?
     */
    async isMemberOptedIn(guildId: string, memberId: string) {
        const guildMember = await db
            .selectFrom('guild_members')
            .select('statsOptedIn')
            .where('id', '=', memberId)
            .where('guildId', '=', guildId)
            .executeTakeFirst();

        return guildMember?.statsOptedIn ?? false;
    }

    channelStat(message: Message) {
        try {
            const guildId = message.guild?.id;
            if (!guildId) return;

            const channelId = message.channel.id;
            const hour = new Date().getHours();
            const existingStatIndex = this.channelStats.findIndex(stat => stat.guildId === guildId && stat.channelId === channelId && stat.hour === hour);
            if (existingStatIndex === -1) {
                this.channelStats.push({
                    guildId,
                    channelId,
                    date: getDate(),
                    hour,
                    count: 1,
                });
                return;
            }

            this.channelStats[existingStatIndex].count += 1;
        } catch (error: unknown) {
            this.logger.error('Failed recording stats', {
                error,
            });
            console.log(error);
        }
    }

    async memberStat(message: Message) {
        try {
            // Only process messages by members in guilds
            const guildId = message.guild?.id;
            const memberId = message.member?.id;
            if (!guildId || !memberId) return;

            // Only process messages for members who are opted in
            // @TODO: Add a cache for this
            //        When adding the cache make sure to update when changing opt-in settings.
            if (!await this.isMemberOptedIn(guildId, memberId)) return;

            const hour = new Date().getHours();
            const existingStatIndex = this.memberStats.findIndex(stat => stat.guildId === guildId && stat.memberId === memberId && stat.hour === hour);

            // Record a new stat row
            if (existingStatIndex === -1) {
                this.memberStats.push({
                    guildId,
                    memberId,
                    date: getDate(),
                    hour,
                    count: 1,
                });
                return;
            }

            // Update an existing stat row
            this.memberStats[existingStatIndex].count += 1;
        } catch (error: unknown) {
            this.logger.error('Failed recording stats', {
                error,
            });
            console.log(error);
        }
    }

    async newMessage(message: Message) {
        this.channelStat(message);
        await this.memberStat(message);
    }

    async writeChannelData() {
        if (this.channelStats.length === 0) return;

        this.logger.info('Writing channel stats to database', {
            rows: this.channelStats.length,
        });
        try {
            const stats = structuredClone(this.channelStats);
            this.channelStats = [];
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
            this.logger.error('Failed writing channel stats to database', {
                error,
            });
            console.log(error);
        }
    }

    async writeMemberData() {
        if (this.memberStats.length === 0) return;

        this.logger.info('Writing member stats to database', {
            rows: this.memberStats.length,
        });
        try {
            const stats = structuredClone(this.memberStats);
            this.memberStats = [];
            for (const data of stats) {
                await db
                    .insertInto('guild_member_stats')
                    .values({
                        guildId: data.guildId,
                        memberId: data.memberId,
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
            this.logger.error('Failed writing member stats to database', {
                error,
            });
            console.log(error);
        }
    }

    async writeData() {
        await this.writeChannelData();
        await this.writeMemberData();
    }
}

export const service = new Service();
