import { logger } from '@app/logger';
import { CommandInteraction } from 'discord.js';
import { Discord, Slash } from 'discordx';

@Discord()
export class Feature {
    constructor() {
        logger.success('Debug feature initialized');
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