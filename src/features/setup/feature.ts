import '@total-typescript/ts-reset';
import { client } from '@app/client';
import { FeatureId } from '@app/common/is-feature-enabled';
import { globalLogger } from '@app/logger';
import type { ButtonComponent, CacheType, ChatInputCommandInteraction } from 'discord.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Colors, CommandInteraction, EmbedBuilder, ModalBuilder, PermissionFlagsBits, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { PagesBuilder } from 'discord.js-pages';
import type { Trigger } from 'discord.js-pages/lib/types';
import { Discord, Slash, On, type ArgsOf } from 'discordx';
import { db } from '@app/common/database';
import { json } from '@app/common/json';

@Discord()
export class Feature {
    private logger = globalLogger.child({ service: 'Setup' });

    constructor() {
        this.logger.info('Initialised');
    }

    createToggleButton(id: FeatureId, name: string, enabled: boolean) {
        return new ButtonBuilder()
            .setCustomId(enabled ? `${id.toLowerCase()}-disable` : `${id.toLowerCase()}-enable`)
            .setLabel(enabled ? `Disable ${name}` : `Enable ${name}`)
            .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success);
    }

    @On({ event: 'interactionCreate' })
    async onInteractionCreate([interaction]: ArgsOf<'interactionCreate'>) {
        if (!interaction.isModalSubmit()) return;
        if (!interaction.guild?.id) return;

        if (interaction.customId === 'welcome-joinMessage-modal') {
            const joinMessage = interaction.fields.getTextInputValue('joinMessage');

            // Update the database
            await db
                .updateTable('welcomes')
                .set({
                    joinMessage,
                })
                .where('guildId', '=', interaction.guild.id)
                .execute();

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
        if (!interaction.guild?.id) return;

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

        const getSettings = () => db
            .selectFrom('settings')
            .select('featuresEnabled')
            .executeTakeFirst();

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
                            this.createToggleButton(FeatureId.AUDIT_LOG, 'AuditLog', settings.featuresEnabled.includes(FeatureId.AUDIT_LOG)),
                        ),
                ]);

                return new EmbedBuilder()
                    .setTitle('AuditLog')
                    .addFields([{
                        name: 'Enabled',
                        value: settings.featuresEnabled.includes(FeatureId.AUDIT_LOG) ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }]);
            },
            async () => {
                const settings = await getSettings();
                if (!settings) return new EmbedBuilder().setDescription('No settings found');

                builder.setComponents([
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            this.createToggleButton(FeatureId.AUTO_DELETE, 'AutoDelete', settings.featuresEnabled.includes(FeatureId.AUTO_DELETE)),
                        ),
                ]);

                return new EmbedBuilder()
                    .setTitle('AutoDelete')
                    .addFields([{
                        name: 'Enabled',
                        value: settings.featuresEnabled.includes(FeatureId.AUTO_DELETE) ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }]);
            },
            async () => {
                const settings = await getSettings();
                if (!settings) return new EmbedBuilder().setDescription('No settings found');

                builder.setComponents([
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            this.createToggleButton(FeatureId.CUSTOM_COMMANDS, 'CustomCommands', settings.featuresEnabled.includes(FeatureId.CUSTOM_COMMANDS)),
                        ),
                ]);

                return new EmbedBuilder()
                    .setTitle('CustomCommands')
                    .addFields([{
                        name: 'Enabled',
                        value: settings.featuresEnabled.includes(FeatureId.CUSTOM_COMMANDS) ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }]);
            },
            async () => {
                const settings = await getSettings();
                if (!settings) return new EmbedBuilder().setDescription('No settings found');

                builder.setComponents([
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            this.createToggleButton(FeatureId.DYNAMIC_CHANNEL_NAMES, 'DynamicChannelNames', settings.featuresEnabled.includes(FeatureId.DYNAMIC_CHANNEL_NAMES)),
                        ),
                ]);

                return new EmbedBuilder()
                    .setTitle('DynamicChannelNames')
                    .addFields([{
                        name: 'Enabled',
                        value: settings.featuresEnabled.includes(FeatureId.DYNAMIC_CHANNEL_NAMES) ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }]);
            },
            async () => {
                const settings = await getSettings();
                if (!settings) return new EmbedBuilder().setDescription('No settings found');

                builder.setComponents([
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            this.createToggleButton(FeatureId.INVITE_TRACKING, 'InviteTracking', settings.featuresEnabled.includes(FeatureId.INVITE_TRACKING)),
                        ),
                ]);

                return new EmbedBuilder()
                    .setTitle('InviteTracking')
                    .addFields([{
                        name: 'Enabled',
                        value: settings.featuresEnabled.includes(FeatureId.INVITE_TRACKING) ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }]);
            },
            async () => {
                const settings = await getSettings();
                if (!settings) return new EmbedBuilder().setDescription('No settings found');

                builder.setComponents([
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            this.createToggleButton(FeatureId.LEVELING, 'Leveling', settings.featuresEnabled.includes(FeatureId.LEVELING)),
                        ),
                ]);

                return new EmbedBuilder()
                    .setTitle('Leveling')
                    .addFields([{
                        name: 'Enabled',
                        value: settings.featuresEnabled.includes(FeatureId.LEVELING) ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }]);
            },
            async () => {
                const settings = await getSettings();
                if (!settings) return new EmbedBuilder().setDescription('No settings found');

                builder.setComponents([
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            this.createToggleButton(FeatureId.STARBOARD, 'Starboard', settings.featuresEnabled.includes(FeatureId.STARBOARD)),
                        ),
                ]);

                return new EmbedBuilder()
                    .setTitle('Starboard')
                    .addFields([{
                        name: 'Enabled',
                        value: settings.featuresEnabled.includes(FeatureId.STARBOARD) ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }]);
            },
            async () => {
                const settings = await getSettings();
                if (!settings) return new EmbedBuilder().setDescription('No settings found');

                const welcome = await db
                    .selectFrom('welcomes')
                    .select('waitUntilGate')
                    .select('joinDm')
                    .select('leaveDm')
                    .select('joinMessage')
                    .select('leaveMessage')
                    .select('joinChannelId')
                    .select('leaveChannelId')
                    .where('guildId', '=', guild.id)
                    .executeTakeFirst();

                builder.setComponents([
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            this.createToggleButton(FeatureId.WELCOME, 'Welcome', settings.featuresEnabled.includes(FeatureId.WELCOME)),
                            new ButtonBuilder()
                                .setCustomId('welcome-waitUntilGate')
                                .setLabel(welcome?.waitUntilGate ? 'Disable gate' : 'Enable gate')
                                .setStyle(welcome?.waitUntilGate ? ButtonStyle.Danger : ButtonStyle.Success),
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
                        value: settings.featuresEnabled.includes(FeatureId.WELCOME) ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }, {
                        name: 'Wait until gate',
                        value: welcome?.waitUntilGate ? 'Yes ✅' : 'No ❌',
                        inline: true,
                    }, {
                        name: 'Send join message via DM?',
                        value: welcome?.joinDm ? 'Yes ✅' : 'No ❌',
                        inline: true,
                    }, welcome?.joinDm ? null : {
                        name: 'Join channel',
                        value: welcome?.joinChannelId ? `<#${welcome.joinChannelId}>` : 'None',
                        inline: true,
                    }, welcome?.leaveDm ? null : {
                        name: 'Leave channel',
                        value: welcome?.leaveChannelId ? `<#${welcome.leaveChannelId}>` : 'None',
                        inline: true,
                    }, {
                        name: 'Join message',
                        value: welcome?.joinMessage ? welcome.joinMessage : 'None',
                    }, {
                        name: 'Leave message',
                        value: welcome?.leaveMessage ? welcome.leaveMessage : 'None',
                    }].filter(Boolean));
            },
        ]);

        const generateTrigger = (id: FeatureId, enabled: boolean) => {
            return {
                name: `${id.toLowerCase()}-${enabled ? 'disable' : 'enable'}`,
                async callback(interaction) {
                    // Get this guild's settings
                    const settings = await db
                        .selectFrom('settings')
                        .select('featuresEnabled')
                        .where('guildId', '=', guild.id)
                        .executeTakeFirst();

                    // Get the features enabled
                    const featuresEnabled = settings?.featuresEnabled ?? [];

                    // Update the database
                    await db
                        .updateTable('settings')
                        .set({
                            featuresEnabled: json(enabled ? featuresEnabled.filter(featureId => featureId !== id) : [...featuresEnabled, id]),
                        })
                        .where('guildId', '=', guild.id)
                        .execute();

                    // Tell the user that it worked
                    await interaction.reply({
                        content: `Successfully ${enabled ? 'disabled' : 'enabled'} ${id}`,
                        ephemeral: true
                    });
                }
            } satisfies Trigger<ButtonComponent>;
        };

        builder.setTriggers([
            generateTrigger(FeatureId.AUDIT_LOG, true),
            generateTrigger(FeatureId.AUDIT_LOG, false),
            generateTrigger(FeatureId.AUTO_DELETE, true),
            generateTrigger(FeatureId.AUTO_DELETE, false),
            generateTrigger(FeatureId.CUSTOM_COMMANDS, true),
            generateTrigger(FeatureId.CUSTOM_COMMANDS, false),
            generateTrigger(FeatureId.DYNAMIC_CHANNEL_NAMES, true),
            generateTrigger(FeatureId.DYNAMIC_CHANNEL_NAMES, false),
            generateTrigger(FeatureId.INVITE_TRACKING, true),
            generateTrigger(FeatureId.INVITE_TRACKING, false),
            generateTrigger(FeatureId.LEVELING, true),
            generateTrigger(FeatureId.LEVELING, false),
            generateTrigger(FeatureId.STARBOARD, true),
            generateTrigger(FeatureId.STARBOARD, false),
            generateTrigger(FeatureId.WELCOME, true),
            generateTrigger(FeatureId.WELCOME, false),
            {
                name: 'welcome-waitUntilGate',
                async callback(interaction) {
                    // @TODO: prevent the race condition

                    // Get the current welcome settings
                    const welcome = await db
                        .selectFrom('welcomes')
                        .select('waitUntilGate')
                        .where('guildId', '=', guild.id)
                        .executeTakeFirst();

                    // Update the database
                    await db
                        .updateTable('welcomes')
                        .set({
                            waitUntilGate: !welcome?.waitUntilGate,
                        })
                        .execute();

                    await interaction.followUp({
                        content: 'welcome-waitUntilGate button callback!',
                        ephemeral: true
                    });
                }
            },
            {
                name: 'welcome-joinMessage',
                async callback(interaction) {
                    if (!interaction.channel) return;
                    if (interaction.channel.type !== ChannelType.GuildText) return;

                    // Get the welcome settings
                    const welcome = await db
                        .selectFrom('welcomes')
                        .select('joinMessage')
                        .where('guildId', '=', guild.id)
                        .executeTakeFirst();

                    if (!welcome) return;

                    // Create the modal
                    const modal = new ModalBuilder()
                        .setCustomId('welcome-joinMessage-modal')
                        .setTitle('Welcome settings');

                    // Add inputs to the modal
                    modal.addComponents([
                        new ActionRowBuilder<TextInputBuilder>().addComponents(
                            new TextInputBuilder()
                                .setCustomId('joinMessage')
                                .setLabel('What\'s the join message?')
                                .setPlaceholder('<@{{ member.id }}> welcome to {{ guild.name }}!')
                                .setValue(welcome?.joinMessage ?? '')
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
                    await db
                        .updateTable('welcomes')
                        .set({
                            joinChannelId: interaction.values[0],
                        })
                        .where('guildId', '=', guild.id)
                        .execute();

                    // Tell the user that it worked
                    await interaction.editReply({
                        content: 'Successfully updated the join channel!'
                    });
                }
            }
        ]);

        await builder.build({
            ephemeral: true,
        });
    }
}
