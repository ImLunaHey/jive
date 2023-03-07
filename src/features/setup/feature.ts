import '@total-typescript/ts-reset';
import { client } from '@app/client';
import { globalFeatures } from '@app/common/is-feature-enabled';
import { prisma } from '@app/common/prisma-client';
import { globalLogger } from '@app/logger';
import { ActionRowBuilder, ButtonBuilder, ButtonComponent, ButtonStyle, CacheType, ChatInputCommandInteraction, Colors, CommandInteraction, EmbedBuilder, PermissionFlagsBits, SelectMenuComponent } from 'discord.js';
import { PagesBuilder } from 'discord.js-pages';
import { Trigger } from 'discord.js-pages/lib/types';
import { Discord, Guard, Slash, GuardFunction } from 'discordx';

@Discord()
export class Feature {
    private logger = globalLogger.scope('Setup');

    constructor() {
        this.logger.success('Feature initialized');

    }

    createToggleButton(id: string, name: string, enabled: boolean) {
        return new ButtonBuilder()
            .setCustomId(enabled ? `${id}-disable` : `${id}-enable`)
            .setLabel(enabled ? `Disable ${name}` : `Enable ${name}`)
            .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success);
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
                    auditLog: true,
                    autoDelete: true,
                    customCommand: true,
                    dynamicChannelNames: true,
                    inviteTracking: true,
                    leveling: true,
                    starboard: true,
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
                            this.createToggleButton('auditLog', 'AuditLog', settings.auditLog.enabled),
                        ),
                ]);

                return new EmbedBuilder()
                    .setDescription('AuditLog')
                    .addFields([{
                        name: 'Enabled',
                        value: settings.auditLog.enabled ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }]);
            },
            async () => {
                const settings = await getSettings();
                if (!settings) return new EmbedBuilder().setDescription('No settings found');

                builder.setComponents([
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            this.createToggleButton('autoDelete', 'AutoDelete', settings.autoDelete.enabled),
                        ),
                ]);

                return new EmbedBuilder()
                    .setDescription('AutoDelete')
                    .addFields([{
                        name: 'Enabled',
                        value: settings.autoDelete.enabled ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }]);
            },
            async () => {
                const settings = await getSettings();
                if (!settings) return new EmbedBuilder().setDescription('No settings found');

                builder.setComponents([
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            this.createToggleButton('customCommand', 'CustomCommands', settings.customCommand.enabled),
                        ),
                ]);

                return new EmbedBuilder()
                    .setDescription('CustomCommands')
                    .addFields([{
                        name: 'Enabled',
                        value: settings.customCommand.enabled ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }]);
            },
            async () => {
                const settings = await getSettings();
                if (!settings) return new EmbedBuilder().setDescription('No settings found');

                builder.setComponents([
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            this.createToggleButton('dynamicChannelNames', 'DynamicChannelNames', settings.dynamicChannelNames.enabled),
                        ),
                ]);

                return new EmbedBuilder()
                    .setDescription('DynamicChannelNames')
                    .addFields([{
                        name: 'Enabled',
                        value: settings.dynamicChannelNames.enabled ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }]);
            },
            async () => {
                const settings = await getSettings();
                if (!settings) return new EmbedBuilder().setDescription('No settings found');

                builder.setComponents([
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            this.createToggleButton('inviteTracking', 'InviteTracking', settings.inviteTracking.enabled),
                        ),
                ]);

                return new EmbedBuilder()
                    .setDescription('InviteTracking')
                    .addFields([{
                        name: 'Enabled',
                        value: settings.inviteTracking.enabled ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }]);
            },
            async () => {
                const settings = await getSettings();
                if (!settings) return new EmbedBuilder().setDescription('No settings found');

                builder.setComponents([
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            this.createToggleButton('leveling', 'Leveling', settings.leveling.enabled),
                        ),
                ]);

                return new EmbedBuilder()
                    .setDescription('Leveling')
                    .addFields([{
                        name: 'Enabled',
                        value: settings.leveling.enabled ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }]);
            },
            async () => {
                const settings = await getSettings();
                if (!settings) return new EmbedBuilder().setDescription('No settings found');

                builder.setComponents([
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            this.createToggleButton('starboard', 'Starboard', settings.starboard.enabled),
                        ),
                ]);

                return new EmbedBuilder()
                    .setDescription('Starboard')
                    .addFields([{
                        name: 'Enabled',
                        value: settings.starboard.enabled ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }]);
            },
            async () => {
                const settings = await getSettings();
                if (!settings) return new EmbedBuilder().setDescription('No settings found');

                builder.setComponents([
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            this.createToggleButton('welcome', 'Welcome', settings.welcome.enabled),
                        ),
                ]);

                return new EmbedBuilder()
                    .setDescription('Welcome')
                    .addFields([{
                        name: 'Enabled',
                        value: settings.welcome.enabled ? 'Yes ✅' : 'No ❌',
                        inline: true
                    }, {
                        name: 'Wait until gate',
                        value: settings.welcome.waitUntilGate ? `Yes ✅` : 'No ❌',
                        inline: true,
                    }, {
                        name: 'Send via DM?',
                        value: settings.welcome.joinDm ? `Yes ✅` : 'No ❌',
                    }, settings.welcome.joinDm ? null : {
                        name: 'Join channel',
                        value: settings.welcome.joinChannelId ? `<#${settings.welcome.joinChannelId}>` : 'None',
                        inline: true,
                    }, {
                        name: 'Join message',
                        value: settings.welcome.joinMessage ? settings.welcome.joinMessage : 'None',
                    }, {
                        name: 'Leave channel',
                        value: settings.welcome.leaveChannelId ? `<#${settings.welcome.leaveChannelId}>` : 'None',
                        inline: true,
                    }, {
                        name: 'Leave message',
                        value: settings.welcome.leaveMessage ? settings.welcome.leaveMessage : 'None',
                    }].filter(Boolean));
            },
        ]);

        const generateTrigger = (id: globalFeatures, enabled: boolean) => {
            return {
                name: `${id}-${enabled ? 'disable' : 'enable'}`,
                async callback(interaction) {
                    // Update the database
                    await prisma.guild.update({
                        where: {
                            id: guild.id
                        },
                        data: {
                            settings: {
                                update: {
                                    [id]: {
                                        update: {
                                            enabled: !enabled
                                        }
                                    }
                                }
                            }
                        }
                    });

                    await interaction.followUp({
                        content: `${id}-${enabled ? 'disable' : 'enable'} button callback!`,
                        ephemeral: true
                    });
                }
            } satisfies Trigger<ButtonComponent | SelectMenuComponent>;
        };

        builder.setTriggers([
            generateTrigger('auditLog', true),
            generateTrigger('auditLog', false),
            generateTrigger('autoDelete', true),
            generateTrigger('autoDelete', false),
            generateTrigger('customCommand', true),
            generateTrigger('customCommand', false),
            generateTrigger('dynamicChannelNames', true),
            generateTrigger('dynamicChannelNames', false),
            generateTrigger('inviteTracking', true),
            generateTrigger('inviteTracking', false),
            generateTrigger('leveling', true),
            generateTrigger('leveling', false),
            generateTrigger('starboard', true),
            generateTrigger('starboard', false),
            generateTrigger('welcome', true),
            generateTrigger('welcome', false),
        ]);

        await builder.build({
            ephemeral: true
        });
    }
}
