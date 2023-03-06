import { prisma } from '@app/common/prisma-client';
import { globalLogger } from '@app/logger';
import { CommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Discord, Slash } from 'discordx';

@Discord()
export class Feature {
    private logger = globalLogger.scope('Features');

    constructor() {
        this.logger.success('Feature initialized');
    }

    @Slash({
        name: 'features',
        description: 'Configure the bot\'s features',
    })
    async features(
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

        // Get the current settings
        const settings = await prisma.settings.findFirst({
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

        // Reply with the current features
        await interaction.editReply({
            embeds: [{
                title: 'Features',
                description: 'Configure the bot\'s features',
                fields: [
                    {
                        name: 'Audit Log',
                        value: settings?.auditLog?.enabled ? 'Enabled' : 'Disabled',
                    },
                    {
                        name: 'Auto Delete',
                        value: settings?.autoDelete?.enabled ? 'Enabled' : 'Disabled',
                    },
                    {
                        name: 'Custom Commands',
                        value: settings?.customCommand?.enabled ? 'Enabled' : 'Disabled',
                    },
                    {
                        name: 'Dynamic Channel Names',
                        value: settings?.dynamicChannelNames?.enabled ? 'Enabled' : 'Disabled',
                    },
                    {
                        name: 'Invite Tracking',
                        value: settings?.inviteTracking?.enabled ? 'Enabled' : 'Disabled',
                        inline: true
                    },
                    {
                        name: 'Leveling',
                        value: settings?.leveling?.enabled ? 'Enabled' : 'Disabled',
                        inline: true
                    },
                    {
                        name: 'Starboard',
                        value: settings?.starboard?.enabled ? 'Enabled' : 'Disabled',
                        inline: true
                    },
                    {
                        name: 'Welcome',
                        value: settings?.welcome?.enabled ? 'Enabled' : 'Disabled',
                        inline: true
                    },
                ]
            }],
        });
    }
}