import { Features } from '@app/common/is-feature-enabled';
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
                        value: settings?.featuresEnabled.includes(Features.AUDIT_LOG) ? 'Enabled ✅' : 'Disabled ❌',
                    },
                    {
                        name: 'Auto Delete',
                        value: settings?.featuresEnabled.includes(Features.AUTO_DELETE) ? 'Enabled ✅' : 'Disabled ❌',
                    },
                    {
                        name: 'Custom Commands',
                        value: settings?.featuresEnabled.includes(Features.CUSTOM_COMMANDS) ? 'Enabled ✅' : 'Disabled ❌',
                    },
                    {
                        name: 'Dynamic Channel Names',
                        value: settings?.featuresEnabled.includes(Features.DYNAMIC_CHANNEL_NAMES) ? 'Enabled ✅' : 'Disabled ❌',
                    },
                    {
                        name: 'Invite Tracking',
                        value: settings?.featuresEnabled.includes(Features.INVITE_TRACKING) ? 'Enabled ✅' : 'Disabled ❌',
                    },
                    {
                        name: 'Leveling',
                        value: settings?.featuresEnabled.includes(Features.LEVELING) ? 'Enabled ✅' : 'Disabled ❌',
                    },
                    {
                        name: 'Moderation',
                        value: settings?.featuresEnabled.includes(Features.MODERATION) ? 'Enabled ✅' : 'Disabled ❌',
                    },
                    {
                        name: 'Starboard',
                        value: settings?.featuresEnabled.includes(Features.STARBOARD) ? 'Enabled ✅' : 'Disabled ❌',
                    },
                    {
                        name: 'Welcome',
                        value: settings?.featuresEnabled.includes(Features.WELCOME) ? 'Enabled ✅' : 'Disabled ❌',
                    },
                ]
            }],
        });
    }
}
