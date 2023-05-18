import { Logger } from '@app/logger';
import { Cron, Expression } from '@reflet/cron';
import { service } from '@app/features/stats/service';
import { client } from '@app/client';
import { db } from '@app/common/database';

// Time in ms
const ONE_MINUTE = 1_000 * 60;
const ONE_HOUR = ONE_MINUTE * 60;
const ONE_DAY = ONE_HOUR * 24;
const ONE_WEEK = ONE_DAY * 7;
const ONE_MONTH = (ONE_DAY * 365) / 12;

// Generate a date before the time period selected
const timePeriod = (period: 'day' | 'week' | 'month' | 'total' = 'day') => ({
    day: new Date(new Date().getTime() - ONE_DAY),
    week: new Date(new Date().getTime() - ONE_WEEK),
    month: new Date(new Date().getTime() - ONE_MONTH),
    total: new Date(0),
}[period]);

export class Jobs {
    private logger = new Logger({ service: 'Stats:Jobs' });

    constructor() {
        this.logger.info('Initialised');
    }

    @Cron.PreventOverlap
    @Cron(Expression.EVERY_30_SECONDS)
    async writeData() {
        await service.writeData();
    }

    @Cron.PreventOverlap
    @Cron(Expression.EVERY_10_MINUTES)
    async updateActiveMemberRoles() {
        // Get the main guild
        const guild = client.guilds.cache.get('927461441051701280');
        if (!guild) return;

        // Get the active role
        const activeRole = guild.roles.cache.get('1108725214835126342');
        if (!activeRole) return;

        // Get all of the members who should have it
        const activeMembers = await db
            .selectFrom('guild_member_stats')
            .select('memberId')
            .select(db.fn.sum<number>('count').as('totalCount'))
            .where('date', '>=', timePeriod('week'))
            .where('guildId', '=', guild.id)
            .groupBy('memberId')
            .orderBy('totalCount', 'desc')
            .limit(10)
            .execute()
            .then(members => members.map(member => member.memberId));

        // Get all the server members and their roles
        const members = await guild.members.fetch();

        // Loop over all guild members
        // Add/Remove the role as needed
        for (const [memberId, member] of members) {
            if (activeMembers.includes(memberId)) {
                // Add the active role
                if (!member.roles.cache.has(activeRole.id)) await member.roles.add(activeRole);
            } else {
                // Remove the active role
                if (member.roles.cache.has(activeRole.id)) await member.roles.remove(activeRole);
            }
        }
    }
}