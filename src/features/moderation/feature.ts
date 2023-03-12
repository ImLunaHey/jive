import { globalLogger } from '@app/logger';
import { ApplicationCommandOptionType, CommandInteraction, PermissionFlagsBits, TextChannel } from 'discord.js';
import { Discord, Slash, SlashOption } from 'discordx';

@Discord()
export class Feature {
    private logger = globalLogger.scope('Moderation');

    constructor() {
        this.logger.success('Feature initialized');
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
            this.logger.error('Failed to clear messages', error);
            await interaction.editReply({
                content: 'Failed to clear messages, please let a member of staff know.'
            });
        }
    }

    @Slash({
        name: 'warn',
        description: 'Warns a user',
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
        // Don't handle users with weird permissions
        if (typeof interaction.member?.permissions === 'string') return;

        // TODO: #1:6h/dev Add a way to check if the user is a moderator
        //        (e.g. a moderator role)
        //        This should come from the database
        // Check if the user has the KICK_MEMBERS permission
        if (!interaction.member?.permissions.has(PermissionFlagsBits.KickMembers)) {
            await interaction.reply({
                content: 'You do not have the `KICK_MEMBERS` permission.',
                ephemeral: true,
            });
            return;
        }

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

            // TODO: #2:6h/dev Add warning to database

            // Send a message to the user that they were warned
            await member.send({
                content: `You were warned in ${interaction.guild?.name} for ${reason}.`
            });

            // Send a message to the moderator that the user was warned
            await interaction.editReply({
                content: `Warned ${member.user.tag}.`
            });
        } catch (error: unknown) {
            if (!(error instanceof Error)) throw new Error('Unknown Error: ' + error);
            this.logger.error('Failed to warn user', error);
            await interaction.editReply({
                content: 'Failed to warn user, please let a member of staff know.'
            });
        }
    }

    @Slash({
        name: 'kick',
        description: 'Kicks a user from the server',
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
        // Don't handle users with weird permissions
        if (typeof interaction.member?.permissions === 'string') return;

        // TODO: #3:6h/dev Add a way to check if the user is a moderator
        //        (e.g. a moderator role)
        //        This should come from the database
        // Check if the user has the KICK_MEMBERS permission
        if (!interaction.member?.permissions.has(PermissionFlagsBits.KickMembers)) {
            await interaction.reply({
                content: 'You do not have the `KICK_MEMBERS` permission.',
                ephemeral: true,
            });
            return;
        }

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

            // TODO: #4:6h/dev Add kick to database
            // This can be used by the auditlog to enrich the auditlog message
            // Kicked wasi#7226.

            // Kick the user
            await member.kick(reason);

            // Send a message to the moderator that the user was kicked
            await interaction.editReply({
                content: `Successfully kicked <@${member.user.id}>.`
            });
        } catch (error: unknown) {
            if (!(error instanceof Error)) throw new Error('Unknown Error: ' + error);
            this.logger.error('Failed to kick user', error);
            await interaction.editReply({
                content: 'Failed to kick user, please let a member of staff know.'
            });
        }
    }

    @Slash({
        name: 'ban',
        description: 'Bans a user from the server',
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
        // Don't handle users with weird permissions
        if (typeof interaction.member?.permissions === 'string') return;

        // TODO: #5:6h/dev Add a way to check if the user is a moderator
        //        (e.g. a moderator role)
        //        This should come from the database
        // Check if the user has the BAN_MEMBERS permission
        if (!interaction.member?.permissions.has(PermissionFlagsBits.BanMembers)) {
            await interaction.reply({
                content: 'You do not have the `BAN_MEMBERS` permission.',
                ephemeral: true,
            });
            return;
        }

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
            if (!(error instanceof Error)) throw new Error('Unknown Error: ' + error);
            this.logger.error('Failed to ban user', error);
            await interaction.editReply({
                content: 'Failed to ban user, please let a member of staff know.'
            });
        }
    }
}