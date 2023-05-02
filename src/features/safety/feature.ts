import { Discord, Slash, SlashOption } from 'discordx';
import { globalLogger } from '@app/logger';
import { ApplicationCommandOptionType, CommandInteraction } from 'discord.js';
import { outdent } from 'outdent';

@Discord()
export class Feature {
    private logger = globalLogger.child({ service: 'Safety' });

    constructor() {
        this.logger.info('Initialised');
    }

    getEmoji(value: number, total: number) {
        const percentage = Math.floor((value / total) * 100);
        if (percentage === 100) return '🔥';
        if (percentage >= 75) return '😓';
        if (percentage >= 50) return '👍';
        if (percentage >= 25) return '✅';
        return '🏆';
    }

    @Slash({
        name: 'audit',
        description: 'Audit the server',
    })
    async audit(
        @SlashOption({
            name: 'warn',
            description: 'If the members should be warned',
            type: ApplicationCommandOptionType.Boolean,
            required: false,
        }) warn = false,
        @SlashOption({
            name: 'kick',
            description: 'If the members should be kicked',
            type: ApplicationCommandOptionType.Boolean,
            required: false,
        }) kick = false,
        interaction: CommandInteraction
    ) {
        // Only run in guilds
        if (!interaction.guild?.id) return;

        // Show bot thinking
        if (!interaction.deferred) await interaction.deferReply();

        // Fetch all the members for this guild
        const members = await interaction.guild.members.fetch();

        // Gather stats
        const membersWithDefaultProfileImage = members.filter(member => member.displayAvatarURL() === `https://cdn.discordapp.com/embed/avatars/${Number(member.user.discriminator) % 5}.png`);

        // Get emoji
        const emoji = this.getEmoji(membersWithDefaultProfileImage.size, members.size);

        // Warn members they need to update their profile image
        if (warn) {
            // Send warning
            await interaction.editReply({
                embeds: [{
                    title: '⚠️ IMPORTANT MESSAGE ⚠️',
                    description: 'Please set your profile image to anything other than the default or you will be kicked.',
                }],
                content: `${[...membersWithDefaultProfileImage.values()].slice(0, 50).map(member => `<@${member.id}>`).join(' ')}`,
            });
            return;
        }

        // Kick members who have a default profile image
        if (kick) {
            const membersToKick = [...membersWithDefaultProfileImage.values()].slice(0, 50);

            // Send kick message
            await interaction.editReply({
                embeds: [{
                    title: '⚠️ IMPORTANT MESSAGE ⚠️',
                    description: 'Kicking members who have a default profile image.',
                }],
                content: `${membersToKick.map(member => `<@${member.id}>`).join(' ')}`,
            });

            // Kick each of the members
            await Promise.all(membersToKick.map(async member => {
                try {
                    await member.kick();
                } catch { }
            }));
            return;
        }

        // Send audit message
        await interaction.editReply({
            embeds: [{
                description: outdent`
                    ${emoji} \`${membersWithDefaultProfileImage.size}/${members.size}\` **(\`${Math.floor(members.size / membersWithDefaultProfileImage.size)}%\`)** members have a default profile image.
                `
            }],
        });
    }
}
