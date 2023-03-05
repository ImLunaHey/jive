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

        // Get the current features
        const features = await prisma.features.findFirst({
            where: {
                guild: {
                    id: guild.id
                }
            },
            include: {
                starboard: true,
                welcome: true,
                leveling: true,
                autoRoles: true,
                inviteTracking: true,
                customCommand: true,
            }
        });

        // Reply with the current features
        await interaction.editReply({
            embeds: [{
                title: 'Features',
                description: 'Configure the bot\'s features',
                fields: [
                    {
                        name: 'Starboard',
                        value: features?.starboard?.enabled ? 'Enabled' : 'Disabled',
                        inline: true
                    },
                    {
                        name: 'Welcome',
                        value: features?.welcome?.enabled ? 'Enabled' : 'Disabled',
                        inline: true
                    },
                    {
                        name: 'Leveling',
                        value: features?.leveling?.enabled ? 'Enabled' : 'Disabled',
                        inline: true
                    },
                    {
                        name: 'Auto Roles',
                        value: features?.autoRoles?.enabled ? 'Enabled' : 'Disabled',
                        inline: true
                    },
                    {
                        name: 'Invite Tracking',
                        value: features?.inviteTracking?.enabled ? 'Enabled' : 'Disabled',
                        inline: true
                    },
                    {
                        name: 'Custom Commands',
                        value: features?.customCommand?.enabled ? 'Enabled' : 'Disabled',
                    }
                ]
            }],
        });
    }
}