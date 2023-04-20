import { globalLogger } from '@app/logger';
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, GuildMember, StringSelectMenuBuilder } from 'discord.js';
import { ApplicationCommandOptionType, CommandInteraction, PermissionFlagsBits } from 'discord.js';
import { ButtonComponent, Discord, Slash, SlashChoice, SlashOption } from 'discordx';

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

    async canUse(interaction: CommandInteraction | ButtonInteraction) {
        // Don't handle users with weird permissions
        if (typeof interaction.member?.permissions === 'string') return false;

        // Check for permissions
        if (!interaction.member || !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({
                embeds: [{
                    description: 'You do not have the `ADMINISTRATOR` permission.'
                }]
            });
            return false;
        }

        return true;
    }

    @Slash({
        name: 'purge',
        description: 'Purge members',
    })
    async purge(
        @SlashChoice({ name: 'Members with no roles', value: 'NO_ROLES' })
        @SlashOption({
            description: 'Which filter should be used?',
            name: 'filter',
            required: true,
            type: ApplicationCommandOptionType.String,
        })
        filter: 'NO_ROLES',
        interaction: CommandInteraction
    ) {
        // Check permissions
        if (!await this.canUse(interaction)) return;

        // Don't handle users with weird permissions
        if (typeof interaction.member?.permissions === 'string') return;

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

        // Fetch all the users
        await interaction.guild.members.fetch();

        // Get all the users who match the filter
        const members = interaction.guild.members.cache.filter(member => filters[filter](member));

        // Return a message with a button to approve/deny the purge
        await interaction.editReply({
            embeds: [{
                title: 'Purge',
                fields: [{
                    name: 'Filter',
                    value: filter,
                }]
            }],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents([
                        new ButtonBuilder()
                            .setCustomId(`purge-start [${filter}]`)
                            .setLabel(`Purge ${members.size} members`)
                            .setEmoji('🚨')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId(`purge-list-members [${filter}] [100]`)
                            .setLabel('List members to purge')
                            .setEmoji('📖')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('purge-cancel')
                            .setLabel('Cancel')
                            .setEmoji('❌')
                            .setStyle(ButtonStyle.Primary),
                    ]),
            ],
        })
    }

    @ButtonComponent({
        id: /^purge-start(?:\s+\[([\w-]+)\])?$/
    })
    async start(
        interaction: ButtonInteraction,
    ) {
        // Check permissions
        if (!await this.canUse(interaction)) return;

        if (!interaction.guild?.id) return;
        if (!interaction.member?.user.id) return;

        // Show the bot is thinking
        if (!interaction.deferred) await interaction.deferUpdate();

        // Get the filter from the button ID
        const filter = interaction.customId.match(/^purge-start(?:\s+\[([\w-]+)\])?$/)?.[1] as keyof typeof filters;

        // Get all the users who match the filter
        const members = interaction.guild.members.cache.filter(member => filters[filter](member));

        const membersToPurge = members.size;
        let membersPurged = 0;

        // Purge 100 members at a time
        // Each time we kick a wave update the original message
        for (const [, member] of members) {
            try {
                this.logger.info('Kicking member', {
                    guildId: member.guild.id,
                    memberId: member.id,
                });

                // await member.kick();
                membersPurged++;
            } catch { }

            // Update the count every 100 members and at the end
            if (membersPurged % 100 === 0 || membersPurged === membersToPurge) {
                await interaction.editReply({
                    embeds: [{
                        title: 'Purge',
                        fields: [{
                            name: 'Filter',
                            value: filter,
                        }, {
                            name: 'Status',
                            value: membersPurged === membersToPurge ? 'Done' : 'Kicking members',
                        }, {
                            name: 'Purged',
                            value: `${membersPurged}/${membersToPurge}`,
                        }]
                    }],
                    components: [],
                });
            }
        }

    }

    @ButtonComponent({
        id: /^purge-list-members(?:\s+\[([\w-]+)\])?(?:\s+\[([\d]+)\])?$/
    })
    async listMembers(
        interaction: ButtonInteraction,
    ) {
        // Check permissions
        if (!await this.canUse(interaction)) return;

        if (!interaction.guild?.id) return;
        if (!interaction.member?.user.id) return;

        // Show the bot is thinking
        if (!interaction.deferred) await interaction.deferUpdate();

        // Get the data from the buttonID
        const buttonData = interaction.customId.match(/^purge-list-members(?:\s+\[([\w-]+)\])?(?:\s+\[([\d]+)\])?$/);
        if (!buttonData) return;

        // Get the filter from the button ID
        const filter = buttonData[1] as keyof typeof filters;

        // Get the offset from the button ID
        const offset = Number(buttonData[2]);

        // Get all the users who match the filter
        const members = interaction.guild.members.cache.filter(member => filters[filter](member));

        // Send new message with member list
        await interaction.editReply({
            embeds: [{
                title: `${members.size} members to be purged`,
                description: [...members.values()].slice(0, offset).map(member => `<@${member.id}>`).join(' '),
            }],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents([
                        new ButtonBuilder()
                            .setCustomId(`purge-start [${filter}]`)
                            .setLabel(`Purge ${members.size} members`)
                            .setEmoji('🚨')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId(`purge-list-members [${filter}] [${offset + 100}]`)
                            .setLabel('List members to purge')
                            .setEmoji('📖')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('purge-cancel')
                            .setLabel('Cancel')
                            .setEmoji('❌')
                            .setStyle(ButtonStyle.Primary),
                    ]),
            ]
        });
    }

    @ButtonComponent({
        id: 'purge-cancel'
    })
    async cancel(
        interaction: ButtonInteraction,
    ) {
        // Check permissions
        if (!await this.canUse(interaction)) return;

        if (!interaction.guild?.id) return;
        if (!interaction.member?.user.id) return;

        // Show the bot is thinking
        if (!interaction.deferred) await interaction.deferUpdate();

        // Remove the buttons from the original purge message
        await interaction.editReply({
            components: [],
        });
    }
}
