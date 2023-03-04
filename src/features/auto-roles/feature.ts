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
        if (!await isFeatureEnabled('auto-roles', newMember.guild.id)) return;

        // Check if the member has agreed to the rules
        if (oldMember.pending && !newMember.pending) {
            // Give the member their roles
            // @TODO: implement this
        }
    }

    @On({ event: 'messageCreate' })
    async messageCreate([message]: ArgsOf<'messageCreate'>): Promise<void> {
        if (!await isFeatureEnabled('auto-roles', message.guild?.id)) return;

        // Check if the message was sent in a guild
        if (!message.guild?.id) return;

        // Check if the message was sent in a guild text channel
        if (message.channel.type !== ChannelType.GuildText) return;

        // Check if the message was sent by a bot
        if (message.author.bot) return;

        // Fetch the channel's feature data
        const feature = await prisma.feature.findFirst({
            where: {
                guildId: message.guild.id,
                id: 'auto-roles',
            }
        });

        const featureData = JSON.parse(feature?.data ?? '{}');
        const joinChannelId = featureData.joinChannelId as string;
        const welcomeChannelId = featureData.welcomeChannelId as string;
        const addRoles = featureData.addRoles as string[] ?? [];
        const removeRoles = featureData.removeRoles ?? [];

        // Check if the join channel exists
        const joinChannel = client.guilds.cache.get(message.guild.id)?.channels.cache.get(joinChannelId);
        if (!joinChannel) return;

        // Check if the message was sent in the join channel
        if (message.channel.id !== joinChannel.id) return;

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
