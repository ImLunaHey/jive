import { client } from '@app/client';
import { prisma } from '@app/common/prisma-client';
import { env } from '@app/env';
import { globalLogger } from '@app/logger';
import { ChannelType, CommandInteraction, EmbedBuilder } from 'discord.js';
import { Discord, On, Slash } from 'discordx';

@Discord()
export class Feature {
    private logger = globalLogger.scope('Debug');

    constructor() {
        this.logger.success('Feature initialized');

        // Get count of guilds
        void prisma.guild.count().then((count) => {
            this.logger.info('Bot is in %d guilds', count);
        });
    }

    @On({ event: 'ready' })
    async ready(): Promise<void> {
        // Get the guild
        const guild = client.guilds.cache.get('927461441051701280');
        if (!guild) return;

        // Get the channel
        const channel = guild.channels.cache.get('1081533925337350166');
        if (!channel) return;

        // Check if the channel is a text channel
        if (channel.type !== ChannelType.GuildText) return;

        // Get the status
        const status = env.MAINTENCE_MODE ? 'in maintence mode' : 'online';

        // Create the embed
        const embed = new EmbedBuilder({
            title: 'Bot status',
            description: `The bot is ${status} and ready to go!`,
            // Orange or green
            color: env.MAINTENCE_MODE ? 0xffa500 : 0x00ff00,
        });

        // Fetch the messages
        const messages = await channel.messages.fetch();

        // Check if the embed has already been sent
        const message = messages.find((message) => message.embeds.some((embed) => embed.title === 'Bot status'));
        if (message) {
            // Edit the embed
            await message.edit({
                embeds: [embed]
            });
            return;
        }

        // Send the embed to the channel
        await channel.send({
            embeds: [embed]
        });
    }

    @Slash({
        name: 'ping',
        description: 'Pong!',
    })
    async clearMessages(
        interaction: CommandInteraction
    ) {
        // Show the bot thinking
        await interaction.deferReply({ ephemeral: false });

        const message = await interaction.editReply({
            embeds: [{
                title: 'Pong!',
                description: 'Checking the ping...'
            }]
        });

        await message.edit({
            embeds: [{
                title: 'Pong!',
                description: `Message latency is ${message.createdTimestamp - interaction.createdTimestamp}ms. API Latency is ${Math.round(interaction.client.ws.ping)}ms`
            }]
        });
    }
}