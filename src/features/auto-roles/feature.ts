import { client } from '@app/client';
import { isFeatureEnabled } from '@app/common/is-feature-enabled';
import { prisma } from '@app/common/prisma-client';
import { globalLogger } from '@app/logger';
import { ChannelType, TextChannel } from 'discord.js';
import { ArgsOf, Discord, On } from 'discordx';

@Discord()
export class Feature {
    private logger = globalLogger.scope('AutoRoles');

    constructor() {
        this.logger.success('Feature initialized');
    }

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

    @On({ event: 'messageCreate' })
    async messageCreate([message]: ArgsOf<'messageCreate'>): Promise<void> {
        if (!await isFeatureEnabled('welcome', message.guild?.id)) return;

        // Check if the message was sent in a guild
        if (!message.guild?.id) return;

        // Check if the message was sent in a guild text channel
        if (message.channel.type !== ChannelType.GuildText) return;

        // Check if the message was sent by a bot
        if (message.author.bot) return;

        // Fetch the channel's feature data
        const features = await prisma.features.findFirst({
            where: {
                guild: {
                    id: message.guild.id
                }
            },
            include: {
                welcome: true
            }
        });

        // Check if the feature is enabled
        if (!features?.welcome.enabled) return;

        const { addRoles, removeRoles, rulesChannelId, welcomeChannelId } = features.welcome;

        // Check if the join channel exists
        const rulesChannel = client.guilds.cache.get(message.guild.id)?.channels.cache.get(rulesChannelId);
        if (!rulesChannel) return;

        // Check if the message was sent in the join channel
        if (message.channel.id !== rulesChannel.id) return;

        // If they sent !agree add/remove their roles
        if (message.content.toLowerCase().trim() === '!agree') {
            this.logger.debug('%s agreed to the rules', message.member?.user.tag);
            this.logger.debug('Adding roles: %s', addRoles.join(', '));
            this.logger.debug('Removing roles: %s', removeRoles.join(', '));

            for (const roleId of addRoles) {
                // Add the member's roles
                await message.member?.roles.add(roleId);
            }

            for (const roleId of removeRoles) {
                // Remove the member's roles
                await message.member?.roles.remove(roleId);
            }

            // Delete the message
            await message.delete().catch(() => {
                this.logger.warn('Failed to delete message %s', message.id);
            });

            // Check if the welcome channel exists
            const welcomeChannel = client.guilds.cache.get(message.guild.id)?.channels.cache.get(welcomeChannelId) as TextChannel;
            if (!welcomeChannel) return;

            // Welcome them to the server
            await welcomeChannel.send(`<@${message.author.id}> welcome to ${message.guild?.name}!`);
        }
    }
}
