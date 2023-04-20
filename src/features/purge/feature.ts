import { globalLogger } from '@app/logger';
import type { GuildMember } from 'discord.js';
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle } from 'discord.js';
import { ApplicationCommandOptionType, CommandInteraction, PermissionFlagsBits } from 'discord.js';
import { ButtonComponent, Discord, Slash, SlashChoice, SlashOption } from 'discordx';

const filters = {
    NO_ROLES: {
        name: 'Members with no roles',
        filter: (member: GuildMember) => {
            // The member should have 1 role which is @everyone
            return member.roles.cache.size === 1;
        }
    },

} satisfies Record<string, {
    name: string,
    filter: (member: GuildMember) => boolean;
}>;

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
        const members = interaction.guild.members.cache.filter(member => filters[filter].filter(member));

        // Return a message with a button to approve/deny the purge
        await interaction.editReply({
            embeds: [{
                title: 'Purge',
                fields: [{
                    name: 'Filter',
                    value: filters[filter].name,
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
        const members = interaction.guild.members.cache.filter(member => filters[filter].filter(member));

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
                            value: filters[filter].name,
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
        const members = interaction.guild.members.cache.filter(member => filters[filter].filter(member));

        // Get the current page number
        const page = offset / 100;

        // Create the button components
        const component = new ActionRowBuilder<ButtonBuilder>()
            .addComponents([
                new ButtonBuilder()
                    .setCustomId(`purge-start [${filter}]`)
                    .setLabel(`Purge ${members.size} members`)
                    .setEmoji('🚨')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('purge-cancel')
                    .setLabel('Cancel')
                    .setEmoji('❌')
                    .setStyle(ButtonStyle.Primary),
            ]);

        // If we're past page 1 add a back button
        if (page >= 2) {
            component.addComponents(
                new ButtonBuilder()
                    .setCustomId(`purge-list-members [${filter}] [${Math.max(offset - 100, 0)}]`)
                    .setLabel('⬅️')
                    .setEmoji('📖')
                    .setStyle(ButtonStyle.Secondary),
            );
        }

        if (page < Math.ceil(members.size / 100)) {
            component.addComponents(
                new ButtonBuilder()
                    .setCustomId(`purge-list-members [${filter}] [${offset + 100}]`)
                    .setLabel('➡️')
                    .setEmoji('📖')
                    .setStyle(ButtonStyle.Secondary),
            );
        }

        // Send new message with member list
        await interaction.editReply({
            embeds: [{
                title: `${members.size} members to be purged - page ${page}/${Math.ceil(members.size / 100)}`,
                description: [...members.values()].slice(offset, 100).map(member => `<@${member.id}>`).join(' '),
            }],
            components: [
                component,
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
