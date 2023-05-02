import { Discord, Slash } from 'discordx';
import { globalLogger } from '@app/logger';
import { CommandInteraction } from 'discord.js';
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

        // Send audit message
        await interaction.editReply({
            embeds: [{
                description: outdent`
                    ${emoji} \`${membersWithDefaultProfileImage.size}/${members.size}\` **(\`${Math.floor(members.size / membersWithDefaultProfileImage.size)}%\`)** members have a default profile image.

                    ${[...membersWithDefaultProfileImage.values()].slice(0, 20).map(member => `<@${member.id}> ${member.displayName}\n`)}
                `
            }]
        });
    }
}
