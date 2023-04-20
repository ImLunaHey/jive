import { globalLogger } from '@app/logger';
import type { GuildMember } from 'discord.js';
import { ApplicationCommandOptionType, CommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Discord, Slash, SlashChoice, SlashOption } from 'discordx';

const filters = {
    NO_ROLES: (member: GuildMember) => {
        // The member should have 1 role which is @everyone
        return member.roles.cache.size === 1;
    }
};

@Discord()
export class Feature {
    private logger = globalLogger.child({ service: 'Purge' });

    constructor() {
        this.logger.info('Initialised');
    }

    @Slash({
        name: 'purge',
        description: 'Purge members',
    })
    async purge(
        @SlashChoice({ name: 'No roles', value: 'NO_ROLES' })
        @SlashOption({
            description: 'Which filter should be used?',
            name: 'filter',
            required: true,
            type: ApplicationCommandOptionType.String,
        })
        filter: 'NO_ROLES',
        interaction: CommandInteraction
    ) {
        // Don't handle users with weird permissions
        if (typeof interaction.member?.permissions === 'string') return;

        // Check for permissions
        if (!interaction.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({
                embeds: [{
                    description: 'You do not have the `ADMINISTRATOR` permission.'
                }]
            });
            return;
        }

        // Show the bot thinking
        await interaction.deferReply({ ephemeral: false });

        // Get the guild
        const guild = interaction.guild;

        // Check if the guild exists
        if (!guild) {
            // Send a message to the user
            await interaction.editReply({
                content: 'This command can only be used in a guild',
            });
            return;
        }

        // Fetch all the users who match the filter
        const members = interaction.guild.members.cache.filter(member => filters[filter](member));

        // Return a message with a button to approve/deny the purge
        await interaction.editReply({
            embeds: [{
                title: `Purge - ${members.size} members`,
            }]
        })
    }
}
