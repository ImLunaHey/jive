import { isFeatureEnabled } from '@app/common/is-feature-enabled';
import { globalLogger } from '@app/logger';
import { ChannelType, TextChannel } from 'discord.js';
import { ArgsOf, Discord, On } from 'discordx';
import { replaceVariablesForMember, templateResultToMessage } from '@app/common/replace-variables';
import { prisma } from '@app/common/prisma-client';

@Discord()
export class Feature {
    private logger = globalLogger.scope('CustomCommands');

    constructor() {
        this.logger.success('Feature initialized');
    }

    @On({ event: 'messageCreate' })
    async messageCreate([message]: ArgsOf<'messageCreate'>): Promise<void> {
        if (!await isFeatureEnabled('customCommand', message.guild?.id)) return;

        // Check if the message was sent in a guild
        if (!message.guild?.id) return;

        // Check if the message was sent in a guild text channel
        if (message.channel.type !== ChannelType.GuildText) return;

        // Check if the message was sent by a bot
        if (message.author.bot) return;

        // Check if the message was sent by a webhook
        if (!message.member) return;

        // Check if this is the custom commands channel and if if this is a valid custom commands message
        const customCommand = await prisma.customCommand.findFirst({
            where: {
                CustomCommandSettings: {
                    settings: {
                        guild: {
                            id: message.guild.id
                        }
                    }
                },
                triggerMessage: message.content.trim(),
                OR: [{
                    triggerChannelId: message.channel.id,
                }, {
                    triggerChannelId: null
                }]
            },
            include: {
                extraMessages: true
            }
        });
        if (!customCommand) return;

        // Log that we ran a custom command
        this.logger.info('Ran custom command "%s" for %s in %s', customCommand.triggerMessage, message.member.user.tag, message.guild.name);

        // Send the custom command response
        if (customCommand.responseMessage) await message.reply(templateResultToMessage(await replaceVariablesForMember(customCommand.responseMessage, message.member)));

        // Delete the message
        if (customCommand.deleteTrigger) await message.delete().catch(() => {
            this.logger.error('Failed to delete message', message.id);
        });

        // Add the roles
        if (customCommand.addRoles.length) {
            const member = await message.guild.members.fetch(message.author.id);
            await member.roles.add(customCommand.addRoles);
        }

        // Remove the roles
        if (customCommand.removeRoles.length) {
            const member = await message.guild.members.fetch(message.author.id);
            await member.roles.remove(customCommand.removeRoles);
        }

        // Send extra messages
        if (customCommand.extraMessages.length) {
            for (const extraMessage of customCommand.extraMessages) {
                if (!extraMessage.message) continue;
                const channel = await message.guild.channels.fetch(extraMessage.channelId ?? message.channel.id) as TextChannel;
                if (!channel) continue;
                await channel.send(await replaceVariablesForMember(extraMessage.message, message.member));
            }
        }
    }
}
