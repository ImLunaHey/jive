import '@total-typescript/ts-reset';
import { client } from '@app/client';
import { Features } from '@app/common/is-feature-enabled';
import { prisma } from '@app/common/prisma-client';
import { globalLogger } from '@app/logger';
import { ActionRowBuilder, ButtonBuilder, ButtonComponent, ButtonStyle, CacheType, ChannelType, ChatInputCommandInteraction, Colors, CommandInteraction, EmbedBuilder, ModalBuilder, PermissionFlagsBits, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { PagesBuilder } from 'discord.js-pages';
import { Trigger } from 'discord.js-pages/lib/types';
import { Discord, Slash, On, ArgsOf } from 'discordx';

@Discord()
export class Feature {
    private logger = globalLogger.scope('Setup');

    constructor() {
        this.logger.success('Feature initialized');

    }

    createToggleButton(id: Features, name: string, enabled: boolean) {
        return new ButtonBuilder()
            .setCustomId(enabled ? `${id.toLowerCase()}-disable` : `${id.toLowerCase()}-enable`)
            .setLabel(enabled ? `Disable ${name}` : `Enable ${name}`)
            .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success);
    }

    @On({ event: 'interactionCreate' })
    async onInteractionCreate([interaction]: ArgsOf<'interactionCreate'>) {
        if (!interaction.isModalSubmit()) return;

        if (interaction.customId === 'welcome-joinMessage-modal') {
            const joinMessage = interaction.fields.getTextInputValue('joinMessage');

            // Update the database
            await prisma.guild.update({
                where: {
                    id: interaction.guild?.id,
                },
                data: {
                    settings: {
                        update: {
                            welcome: {
                                update: {
                                    joinMessage,
                                },
                            },
                        },
                    },
                },
            });

            await interaction.reply({
                content: 'Join message updated',
                ephemeral: true,
            });

            return;
        }
    }

    @Slash({
        name: 'setup',
        description: 'Setup the bot',
    })
    async setup(
        interaction: CommandInteraction
    ) {
        // Show the bot thinking
        await interaction.deferReply({ ephemeral: true });

        // This can only be used in a guild
        if (!interaction.guild?.id) return;
        const guild = client.guilds.cache.get(interaction.guild?.id);
        if (!guild) return;

        // Don't handle users with weird permissions
        if (typeof interaction.member?.permissions === 'string') return;

        // Only allow admins to use this command
        if (!interaction.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({
                content: 'You do not have the `ADMINISTRATOR` permission.',
                ephemeral: true,
            });
            return;
        }

        // Don't handle non-commands
        if (!interaction.isCommand()) return;

        const getSettings = () => {
            return prisma.settings.findFirst({
                where: {
                    guild: {
                        id: guild.id
                    }
                },
                include: {
                    auditLogs: true,
                    // autoDelete: true,
                    customCommands: true,
                    // dynamicChannelNames: true,
                    inviteTracking: true,
                    leveling: true,
                    starboards: true,
                    welcome: true,
                }
            });
        };

        // Create the pages
        const builder = new PagesBuilder(interaction as ChatInputCommandInteraction<CacheType>)
            .setTitle('Setup')
            .setColor(Colors.Purple)

        builder.setPages([
            async () => {
                const settings = await getSettings();
                if (!settings) return new EmbedBuilder().setDescription('No settings found');

                builder.setComponents([
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            this.createToggleButton(Features.AUDIT_LOG, 'AuditLog', settings.featuresEnabled.includes(Features.AUDIT_LOG)),
                        ),
                ]);

                return new EmbedBuilder()
                    .setTitle('AuditLog')
                    .addFields([{
                        name: 'Enabled',
                        value: settings.featuresEnabled.includes(Features.AUDIT_LOG) ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }]);
            },
            async () => {
                const settings = await getSettings();
                if (!settings) return new EmbedBuilder().setDescription('No settings found');

                builder.setComponents([
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            this.createToggleButton(Features.AUTO_DELETE, 'AutoDelete', settings.featuresEnabled.includes(Features.AUTO_DELETE)),
                        ),
                ]);

                return new EmbedBuilder()
                    .setTitle('AutoDelete')
                    .addFields([{
                        name: 'Enabled',
                        value: settings.featuresEnabled.includes(Features.AUTO_DELETE) ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }]);
            },
            async () => {
                const settings = await getSettings();
                if (!settings) return new EmbedBuilder().setDescription('No settings found');

                builder.setComponents([
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            this.createToggleButton(Features.CUSTOM_COMMANDS, 'CustomCommands', settings.featuresEnabled.includes(Features.CUSTOM_COMMANDS)),
                        ),
                ]);

                return new EmbedBuilder()
                    .setTitle('CustomCommands')
                    .addFields([{
                        name: 'Enabled',
                        value: settings.featuresEnabled.includes(Features.CUSTOM_COMMANDS) ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }]);
            },
            async () => {
                const settings = await getSettings();
                if (!settings) return new EmbedBuilder().setDescription('No settings found');

                builder.setComponents([
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            this.createToggleButton(Features.DYNAMIC_CHANNEL_NAMES, 'DynamicChannelNames', settings.featuresEnabled.includes(Features.DYNAMIC_CHANNEL_NAMES)),
                        ),
                ]);

                return new EmbedBuilder()
                    .setTitle('DynamicChannelNames')
                    .addFields([{
                        name: 'Enabled',
                        value: settings.featuresEnabled.includes(Features.DYNAMIC_CHANNEL_NAMES) ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }]);
            },
            async () => {
                const settings = await getSettings();
                if (!settings) return new EmbedBuilder().setDescription('No settings found');

                builder.setComponents([
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            this.createToggleButton(Features.INVITE_TRACKING, 'InviteTracking', settings.featuresEnabled.includes(Features.INVITE_TRACKING)),
                        ),
                ]);

                return new EmbedBuilder()
                    .setTitle('InviteTracking')
                    .addFields([{
                        name: 'Enabled',
                        value: settings.featuresEnabled.includes(Features.INVITE_TRACKING) ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }]);
            },
            async () => {
                const settings = await getSettings();
                if (!settings) return new EmbedBuilder().setDescription('No settings found');

                builder.setComponents([
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            this.createToggleButton(Features.LEVELING, 'Leveling', settings.featuresEnabled.includes(Features.LEVELING)),
                        ),
                ]);

                return new EmbedBuilder()
                    .setTitle('Leveling')
                    .addFields([{
                        name: 'Enabled',
                        value: settings.featuresEnabled.includes(Features.LEVELING) ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }]);
            },
            async () => {
                const settings = await getSettings();
                if (!settings) return new EmbedBuilder().setDescription('No settings found');

                builder.setComponents([
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            this.createToggleButton(Features.STARBOARD, 'Starboard', settings.featuresEnabled.includes(Features.STARBOARD)),
                        ),
                ]);

                return new EmbedBuilder()
                    .setTitle('Starboard')
                    .addFields([{
                        name: 'Enabled',
                        value: settings.featuresEnabled.includes(Features.STARBOARD) ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }]);
            },
            async () => {
                const settings = await getSettings();
                if (!settings) return new EmbedBuilder().setDescription('No settings found');

                builder.setComponents([
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            this.createToggleButton(Features.WELCOME, 'Welcome', settings.featuresEnabled.includes(Features.WELCOME)),
                            new ButtonBuilder()
                                .setCustomId('welcome-waitUntilGate')
                                .setLabel(settings.welcome?.waitUntilGate ? 'Disable gate' : 'Enable gate')
                                .setStyle(settings.welcome?.waitUntilGate ? ButtonStyle.Danger : ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId('welcome-joinMessage-button')
                                .setLabel('Set join message')
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder()
                                .setCustomId('welcome-joinChannelId-button')
                                .setLabel('Set join channel')
                                .setStyle(ButtonStyle.Primary)
                        ),
                ]);

                return new EmbedBuilder()
                    .setTitle('Welcome')
                    .addFields([{
                        name: 'Enabled',
                        value: settings.featuresEnabled.includes(Features.WELCOME) ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }, {
                        name: 'Wait until gate',
                        value: settings.welcome?.waitUntilGate ? `Yes ✅` : 'No ❌',
                        inline: true,
                    }, {
                        name: 'Send join message via DM?',
                        value: settings.welcome?.joinDm ? `Yes ✅` : 'No ❌',
                        inline: true,
                    }, settings.welcome?.joinDm ? null : {
                        name: 'Join channel',
                        value: settings.welcome?.joinChannelId ? `<#${settings.welcome.joinChannelId}>` : 'None',
                        inline: true,
                    }, settings.welcome?.leaveDm ? null : {
                        name: 'Leave channel',
                        value: settings.welcome?.leaveChannelId ? `<#${settings.welcome.leaveChannelId}>` : 'None',
                        inline: true,
                    }, {
                        name: 'Join message',
                        value: settings.welcome?.joinMessage ? settings.welcome.joinMessage : 'None',
                    }, {
                        name: 'Leave message',
                        value: settings.welcome?.leaveMessage ? settings.welcome.leaveMessage : 'None',
                    }].filter(Boolean));
            },
        ]);

        const generateTrigger = (id: Features, enabled: boolean) => {
            return {
                name: `${id.toLowerCase()}-${enabled ? 'disable' : 'enable'}`,
                async callback(interaction) {
                    // Get the features enabled
                    const featuresEnabled = await prisma.settings.findFirst({
                        where: {
                            guildId: guild.id
                        }
                    }).then(settings => settings?.featuresEnabled ?? []);

                    // Update the database
                    await prisma.guild.update({
                        where: {
                            id: guild.id
                        },
                        data: {
                            settings: {
                                update: {
                                    featuresEnabled: {
                                        set: enabled ? featuresEnabled.filter(f => f !== id) : [...featuresEnabled, id],
                                    }
                                }
                            }
                        }
                    });

                    // Tell the user that it worked
                    await interaction.followUp({
                        content: `Successfully ${enabled ? 'disabled' : 'enabled'} ${id}`,
                        ephemeral: true
                    });
                }
            } satisfies Trigger<ButtonComponent>;
        };

        builder.setTriggers([
            generateTrigger(Features.AUDIT_LOG, true),
            generateTrigger(Features.AUDIT_LOG, false),
            generateTrigger(Features.AUTO_DELETE, true),
            generateTrigger(Features.AUTO_DELETE, false),
            generateTrigger(Features.CUSTOM_COMMANDS, true),
            generateTrigger(Features.CUSTOM_COMMANDS, false),
            generateTrigger(Features.DYNAMIC_CHANNEL_NAMES, true),
            generateTrigger(Features.DYNAMIC_CHANNEL_NAMES, false),
            generateTrigger(Features.INVITE_TRACKING, true),
            generateTrigger(Features.INVITE_TRACKING, false),
            generateTrigger(Features.LEVELING, true),
            generateTrigger(Features.LEVELING, false),
            generateTrigger(Features.STARBOARD, true),
            generateTrigger(Features.STARBOARD, false),
            generateTrigger(Features.WELCOME, true),
            generateTrigger(Features.WELCOME, false),
            {
                name: 'welcome-waitUntilGate',
                async callback(interaction) {
                    const settings = await getSettings();
                    if (!settings) return;

                    // Update the database
                    await prisma.guild.update({
                        where: {
                            id: guild.id
                        },
                        data: {
                            settings: {
                                update: {
                                    welcome: {
                                        update: {
                                            waitUntilGate: !settings.welcome?.waitUntilGate
                                        }
                                    }
                                }
                            }
                        }
                    });

                    await interaction.followUp({
                        content: `welcome-waitUntilGate button callback!`,
                        ephemeral: true
                    });
                }
            },
            {
                name: 'welcome-joinMessage',
                async callback(interaction) {
                    if (!interaction.channel) return;
                    if (interaction.channel.type !== ChannelType.GuildText) return;

                    // Get the settings
                    const settings = await getSettings();
                    if (!settings) return;

                    // Create the modal
                    const modal = new ModalBuilder()
                        .setCustomId('welcome-joinMessage-modal')
                        .setTitle('Welcome settings');

                    // Add inputs to the modal
                    modal.addComponents([
                        new ActionRowBuilder<TextInputBuilder>().addComponents(
                            new TextInputBuilder()
                                .setCustomId('joinMessage')
                                .setLabel(`What's the join message?`)
                                .setPlaceholder('<@{{ member.id }}> welcome to {{ guild.name }}!')
                                .setValue(settings.welcome?.joinMessage ?? '')
                                .setStyle(TextInputStyle.Paragraph)
                        ),
                    ]);

                    // Show the modal to the user
                    await interaction.showModal(modal);
                }
            },
            {
                name: 'welcome-joinChannelId-button',
                async callback(interaction) {
                    if (!interaction.channel) return;
                    if (interaction.channel.type !== ChannelType.GuildText) return;

                    // Get the settings
                    const settings = await getSettings();
                    if (!settings) return;

                    // Create select menu
                    await interaction.reply({
                        ephemeral: true,
                        components: [
                            new ActionRowBuilder<StringSelectMenuBuilder>()
                                .addComponents(
                                    new StringSelectMenuBuilder()
                                        .setCustomId('welcome-joinChannelId-select')
                                        .setPlaceholder('Nothing selected')
                                        .addOptions(
                                            {
                                                label: 'Select me',
                                                description: 'This is a description',
                                                value: 'first_option',
                                            },
                                            {
                                                label: 'You can select me too',
                                                description: 'This is also a description',
                                                value: 'second_option',
                                            },
                                        )
                                ),
                        ]
                    });
                }
            }, {
                name: 'welcome-joinChannelId-select',
                async callback(interaction) {
                    if (!interaction.channel) return;
                    if (interaction.channel.type !== ChannelType.GuildText) return;

                    // Get the settings
                    const settings = await getSettings();
                    if (!settings) return;

                    // Make sure it's a select menu
                    if (!interaction.isStringSelectMenu()) return;

                    // Show bot as thinking
                    await interaction.deferReply({
                        ephemeral: true
                    });

                    // Update the database
                    await prisma.guild.update({
                        where: {
                            id: guild.id
                        },
                        data: {
                            settings: {
                                update: {
                                    welcome: {
                                        update: {
                                            joinChannelId: interaction.values[0]
                                        }
                                    }
                                }
                            }
                        }
                    });

                    // Tell the user that it worked
                    await interaction.editReply({
                        content: `Successfully updated the join channel!`
                    });
                }
            }
        ]);

        await builder.build({
            ephemeral: true,
        });
    }
}
