import { isFeatureEnabled } from '@app/common/is-feature-enabled';
import { Logger } from '@app/logger';
import type { TextChannel } from 'discord.js';
import { ChannelType } from 'discord.js';
import { type ArgsOf, Discord, On } from 'discordx';
import { replaceVariablesForMember, templateResultToMessage } from '@app/common/replace-variables';
import { db } from '@app/common/database';

@Discord()
export class Feature {
    private logger = new Logger({ service: 'CustomCommands' });

    constructor() {
        this.logger.info('Initialised');
    }

    @On({ event: 'messageCreate' })
    async messageCreate([message]: ArgsOf<'messageCreate'>): Promise<void> {
        if (!await isFeatureEnabled('CUSTOM_COMMANDS', message.guild?.id)) return;

        // Check if the message was sent in a guild
        if (!message.guild?.id) return;

        // Check if the message was sent in a guild text channel
        if (message.channel.type !== ChannelType.GuildText) return;

        // Check if the message was sent by a bot
        if (message.author.bot) return;

        // Check if the message was sent by a webhook
        if (!message.member) return;

        // Check if this is the custom commands channel and if if this is a valid custom commands message
        const customCommand = await db
            .selectFrom('custom_commands')
            .select('id')
            .select('responseMessage')
            .select('deleteTrigger')
            .select('addRoles')
            .select('removeRoles')
            .where('enabled', '=', true)
            // .where('guildId', '=', message.guild.id)
            .where('triggerMessage', '=', message.content.trim())
            .where(({ or, cmpr }) => or([
                cmpr('triggerChannelId', '=', message.channel.id),
                cmpr('triggerChannelId', '=', null)
            ]))
            .executeTakeFirst();

        if (!customCommand) return;

        // Log that we ran a custom command
        this.logger.info('Ran custom command', {
            guildId: message.guild.id,
            userId: message.member.id,
            customCommandId: customCommand.id,
        });

        // Send the custom command response
        if (customCommand.responseMessage) await message.reply(templateResultToMessage(await replaceVariablesForMember(customCommand.responseMessage, message.member)));

        // Delete the message
        if (customCommand.deleteTrigger) await message.delete().catch((error: unknown) => {
            this.logger.error('Failed to delete message', {
                error,
                guildId: message.guild?.id,
                userId: message.member?.id,
                customCommandId: customCommand.id,
                messageId: message.id,
            });
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

        // Fetch any extra messages that need to be sent
        const extraMessages = await db
            .selectFrom('extra_messages')
            .select('message')
            .select('channelId')
            .where('customCommandId', '=', customCommand.id)
            .execute();

        // Send extra messages
        if (extraMessages.length) {
            for (const extraMessage of extraMessages) {
                if (!extraMessage.message) continue;
                const channel = await message.guild.channels.fetch(extraMessage.channelId ?? message.channel.id) as TextChannel;
                if (!channel) continue;
                await channel.send(await replaceVariablesForMember(extraMessage.message, message.member));
            }
        }
    }
}
