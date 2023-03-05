import { client } from '@app/client';
import { isFeatureEnabled } from '@app/common/is-feature-enabled';
import { prisma } from '@app/common/prisma-client';
import { globalLogger } from '@app/logger';
import { TextChannel } from 'discord.js';
import { ArgsOf, Discord, On } from 'discordx';

@Discord()
export class Feature {
    private logger = globalLogger.scope('AutoRoles');

    constructor() {
        this.logger.success('Feature initialized');
    }

    // @TODO: workout where this actually belongs
    @On({ event: 'guildMemberUpdate' })
    async guildMemberUpdate([oldMember, newMember]: ArgsOf<'guildMemberUpdate'>) {
        if (!await isFeatureEnabled('welcome', newMember.guild.id)) return;

        // Check if the member has passed the guild's membership screening requirements
        if (oldMember.pending && !newMember.pending) {
            // Ping them in the rules channel to let them know to agree to the rules
            const features = await prisma.features.findFirst({
                where: {
                    guild: {
                        id: newMember.guild.id
                    }
                },
                select: {
                    welcome: true
                }
            });

            if (!features?.welcome.rulesChannelId) return;

            const rulesChannel = client.guilds.cache.get(newMember.guild.id)?.channels.cache.get(features.welcome.rulesChannelId) as TextChannel;
            if (!rulesChannel) return;

            await rulesChannel.send(`<@${newMember.user.id}> please agree to the rules by typing \`!agree\` in this channel.`);
        }
    }
}
