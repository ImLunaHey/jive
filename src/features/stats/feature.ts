import { db } from '@app/common/database';
import { getDate } from '@app/common/get-date';
import { service } from '@app/features/stats/service';
import { globalLogger } from '@app/logger';
import { CommandInteraction } from 'discord.js';
import { type ArgsOf, Discord, On, Slash } from 'discordx';
import { outdent } from 'outdent';

@Discord()
export class Feature {
    private logger = globalLogger.child({ service: 'Stats' });

    constructor() {
        this.logger.info('Initialised');
    }

    @On({
        event: 'messageCreate'
    })
    onMessageCreate([message]: ArgsOf<'messageCreate'>) {
        if (!message.guild?.id) return;

        this.logger.info('New message', {
            guildId: message.guild?.id,
            channelId: message.channel.id,
        });

        // Record a new message happened
        service.newMessage(message);
    }

    @Slash({
        name: 'stats',
        description: 'Get stats for this server.',
    })
    async stats(
        interaction: CommandInteraction,
    ) {
        // Show the bot thinking
        if (!interaction.deferred) await interaction.deferReply();

        // Get the most active channels for today
        const mostActiveChannels = await db
            .selectFrom('channel_stats')
            .select('channelId')
            .select(db.fn.sum<number>('count').as('totalCount'))
            .where('date', '=', getDate())
            .groupBy('channelId')
            .orderBy('totalCount', 'desc')
            .execute();

        // Reply with the stats
        await interaction.editReply({
            embeds: [{
                title: 'Most active channels today',
                description: outdent`
                    ${mostActiveChannels.map(channel => `<#${channel.channelId}> - ${channel.totalCount} messages`)}
                `
            }]
        });
    }
}
