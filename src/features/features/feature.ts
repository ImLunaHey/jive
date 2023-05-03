import { db } from '@app/common/database';
import { globalLogger } from '@app/logger';
import { CommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Discord, Slash } from 'discordx';

@Discord()
export class Feature {
    private logger = globalLogger.child({ service: 'Features' });

    constructor() {
        this.logger.info('Initialised');
    }

    @Slash({
        name: 'features',
        description: 'Configure the bot\'s features',
        defaultMemberPermissions: 'Administrator',
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
        const settings = await db
            .selectFrom('settings')
            .select('featuresEnabled')
            .where('guildId', '=', guild.id)
            .executeTakeFirst();

        // Reply with the current features
        await interaction.editReply({
            embeds: [{
                title: 'Features',
                description: 'Configure the bot\'s features',
                fields: [
                    {
                        name: 'Audit Log',
                        value: settings?.featuresEnabled.includes('AUDIT_LOG') ? 'Enabled ✅' : 'Disabled ❌',
                    },
                    {
                        name: 'Auto Delete',
                        value: settings?.featuresEnabled.includes('AUTO_DELETE') ? 'Enabled ✅' : 'Disabled ❌',
                    },
                    {
                        name: 'Custom Commands',
                        value: settings?.featuresEnabled.includes('CUSTOM_COMMANDS') ? 'Enabled ✅' : 'Disabled ❌',
                    },
                    {
                        name: 'Dynamic Channel Names',
                        value: settings?.featuresEnabled.includes('DYNAMIC_CHANNEL_NAMES') ? 'Enabled ✅' : 'Disabled ❌',
                    },
                    {
                        name: 'Invite Tracking',
                        value: settings?.featuresEnabled.includes('INVITE_TRACKING') ? 'Enabled ✅' : 'Disabled ❌',
                    },
                    {
                        name: 'Leveling',
                        value: settings?.featuresEnabled.includes('LEVELING') ? 'Enabled ✅' : 'Disabled ❌',
                    },
                    {
                        name: 'Moderation',
                        value: settings?.featuresEnabled.includes('MODERATION') ? 'Enabled ✅' : 'Disabled ❌',
                    },
                    {
                        name: 'Starboard',
                        value: settings?.featuresEnabled.includes('STARBOARD') ? 'Enabled ✅' : 'Disabled ❌',
                    },
                    {
                        name: 'Welcome',
                        value: settings?.featuresEnabled.includes('WELCOME') ? 'Enabled ✅' : 'Disabled ❌',
                    },
                ]
            }],
        });
    }
}
