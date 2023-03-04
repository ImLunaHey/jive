import { logger } from '@app/logger';
import { ApplicationCommandOptionType, CommandInteraction, PermissionFlagsBits, TextChannel } from 'discord.js';
import { Discord, Slash, SlashOption } from 'discordx';

@Discord()
export class Feature {
    constructor() {
        logger.success('Moderation feature initialized');
    }

    @Slash({
        name: 'clear',
        description: 'Clears a specified amount of messages',
    })
    async clearMessages(
        @SlashOption({
            name: 'amount',
            description: 'The amount of messages to clear',
            type: ApplicationCommandOptionType.Number,
            required: true
        }) amount: number,
        interaction: CommandInteraction
    ) {
        // Don't handle users with weird permissions
        if (typeof interaction.member?.permissions === 'string') return;

        // Check if the user has the MANAGE_MESSAGES permission
        if (!interaction.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
            await interaction.reply({
                content: 'You do not have the `MANAGE_MESSAGES` permission.',
                ephemeral: true,
            });
            return;
        }

        // Show the bot thinking
        await interaction.deferReply({ ephemeral: true });

        try {
            if (amount < 1 || amount > 100) {
                await interaction.editReply({
                    content: 'Please specify an amount between 1 and 100.'
                });
                return;
            }

            const messages = await (interaction.channel as TextChannel).messages.fetch({ limit: amount });
            await (interaction.channel as TextChannel).bulkDelete(messages, true);
            await interaction.editReply({
                content: `Cleared ${amount} messages.`
            });
        } catch (error: unknown) {
            if (!(error instanceof Error)) throw new Error('Unknown Error: ' + error);
            logger.error('Failed to clear messages', error);
            await interaction.editReply({
                content: 'Failed to clear messages, please let a member of staff know.'
            });
        }
    }
}