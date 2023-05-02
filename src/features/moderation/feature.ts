import { globalLogger } from '@app/logger';
import type { TextChannel } from 'discord.js';
import { ApplicationCommandOptionType, CommandInteraction } from 'discord.js';
import { Discord, Slash, SlashOption } from 'discordx';

@Discord()
export class Feature {
    private logger = globalLogger.child({ service: 'Moderation' });

    constructor() {
        this.logger.info('Initialised');
    }

    @Slash({
        name: 'clear',
        description: 'Clears a specified amount of messages',
        defaultMemberPermissions: ['Administrator', 'ManageMessages']
    })
    async clearMessages(
        @SlashOption({
            name: 'amount',
            description: 'The amount of messages to clear',
            type: ApplicationCommandOptionType.Number,
            required: true
        }) amount: number,
        @SlashOption({
            name: 'keep-pinned',
            description: 'Keep pinned messages?',
            type: ApplicationCommandOptionType.Boolean,
            required: false
        }) keepPinned = true,
        interaction: CommandInteraction
    ) {
        // Show the bot thinking
        await interaction.deferReply({ ephemeral: true });

        try {
            if (amount < 1) {
                await interaction.editReply({
                    content: 'Please specify an amount above 1.'
                });
                return;
            }

            // Discord only allows you to delete 100 at a time
            const chunks = Math.max(1, amount / 100);
            for (let i = 0; i <= chunks; i++) {
                const messages = await (interaction.channel as TextChannel).messages.fetch({ limit: Math.min(amount, 100) });
                const filteredMessages = keepPinned ? messages.filter(message => !message.pinned) : messages;
                await (interaction.channel as TextChannel).bulkDelete(filteredMessages, true);
                await interaction.editReply({
                    content: `Cleared ${amount} messages.`
                });
            }
        } catch (error: unknown) {
            if (!(error instanceof Error)) throw new Error(`Unknown Error: ${String(error)}`);
            this.logger.error('Failed to clear messages', error);
            await interaction.editReply({
                content: 'Failed to clear messages, please let a member of staff know.'
            });
        }
    }

    @Slash({
        name: 'warn',
        description: 'Warns a user',
        defaultMemberPermissions: ['Administrator', 'BanMembers'],
    })
    async warnUser(
        @SlashOption({
            name: 'user',
            description: 'The user to warn',
            type: ApplicationCommandOptionType.User,
            required: true
        }) user: string,
        @SlashOption({
            name: 'reason',
            description: 'The reason for warning the user',
            type: ApplicationCommandOptionType.String,
            required: true
        }) reason: string,
        interaction: CommandInteraction
    ) {
        if (!interaction.guild) return;

        // Show the bot thinking
        await interaction.deferReply({ ephemeral: true });

        try {
            // Make sure the user is in the guild
            const member = await interaction.guild?.members.fetch(user);
            if (!member) {
                await interaction.editReply({
                    content: 'Failed to find the specified user.'
                });
                return;
            }

            // TODO: Add warning to database

            // Send a message to the user that they were warned
            await member.send({
                content: `You were warned in ${interaction.guild.name} for ${reason}.`
            });

            // Send a message to the moderator that the user was warned
            await interaction.editReply({
                content: `Warned ${member.user.tag}.`
            });
        } catch (error: unknown) {
            if (!(error instanceof Error)) throw new Error(`Unknown Error: ${String(error)}`);
            this.logger.error('Failed to warn user', error);
            await interaction.editReply({
                content: 'Failed to warn user, please let a member of staff know.'
            });
        }
    }

    @Slash({
        name: 'kick',
        description: 'Kicks a user from the server',
        defaultMemberPermissions: ['KickMembers'],
    })
    async kickUser(
        @SlashOption({
            name: 'user',
            description: 'The user to kick',
            type: ApplicationCommandOptionType.User,
            required: true
        }) user: string,
        @SlashOption({
            name: 'reason',
            description: 'The reason for kicking the user',
            type: ApplicationCommandOptionType.String,
            required: true
        }) reason: string,
        interaction: CommandInteraction
    ) {
        // Show the bot thinking
        await interaction.deferReply({ ephemeral: true });

        try {
            // Make sure the user is in the guild
            const member = await interaction.guild?.members.fetch(user);
            if (!member) {
                await interaction.editReply({
                    content: 'Failed to find the specified user.'
                });
                return;
            }

            // TODO: Add kick to database
            // This can be used by the auditlog to enrich the auditlog message
            // Kicked wasi#7226.

            // Kick the user
            await member.kick(reason);

            // Send a message to the moderator that the user was kicked
            await interaction.editReply({
                content: `Successfully kicked <@${member.user.id}>.`
            });
        } catch (error: unknown) {
            if (!(error instanceof Error)) throw new Error(`Unknown Error: ${String(error)}`);
            this.logger.error('Failed to kick user', error);
            await interaction.editReply({
                content: 'Failed to kick user, please let a member of staff know.'
            });
        }
    }

    @Slash({
        name: 'ban',
        description: 'Bans a user from the server',
        defaultMemberPermissions: ['BanMembers'],
    })
    async banUser(
        @SlashOption({
            name: 'user',
            description: 'The user to ban',
            type: ApplicationCommandOptionType.User,
            required: true
        }) user: string,
        @SlashOption({
            name: 'reason',
            description: 'The reason for banning the user',
            type: ApplicationCommandOptionType.String,
            required: true
        }) reason: string,
        @SlashOption({
            name: 'delete-messages',
            description: 'Whether to delete the users messages',
            type: ApplicationCommandOptionType.Boolean,
            required: true
        }) deleteMessages: boolean,
        interaction: CommandInteraction
    ) {
        // Show the bot thinking
        await interaction.deferReply({ ephemeral: true });

        try {
            // Make sure the user is in the guild
            const member = await interaction.guild?.members.fetch(user);
            if (!member) {
                await interaction.editReply({
                    content: 'Failed to find the specified user.'
                });
                return;
            }

            // Ban the user
            // If deleteMessages is true, delete the users messages from the last 7 days
            await member.ban({ reason, deleteMessageSeconds: deleteMessages ? 604800 : 0 });

            // Send a message to the moderator that the user was banned
            await interaction.editReply({
                content: `Banned ${member.user.tag}.`
            });
        } catch (error: unknown) {
            if (!(error instanceof Error)) throw new Error(`Unknown Error: ${String(error)}`);
            this.logger.error('Failed to ban user', error);
            await interaction.editReply({
                content: 'Failed to ban user, please let a member of staff know.'
            });
        }
    }
}