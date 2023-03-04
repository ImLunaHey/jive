import { client } from '@app/client';
import { logger } from '@app/logger';
import { ChannelType, MessageCreateOptions, MessagePayload, TextChannel } from 'discord.js';
import { ArgsOf, Discord, On } from 'discordx';
import { outdent } from 'outdent';

@Discord()
export class Feature {
    constructor() {
        logger.success('AuditLog feature initialized');
    }

    @On({ event: 'messageDelete' })
    async messageDelete([message]: ArgsOf<'messageDelete'>) {
        // Skip bot messages
        if (message.author?.bot) return;

        // Skip webhook messages
        if (!message.author) return;

        // Skip system messages
        if (!message.guild) return;

        // Skip DM messages
        if (message.channel.type === ChannelType.DM) return;

        // Skip the void channel
        if (message.channel.name.includes('void')) return;

        // Send the audit log message
        this.sendAuditLogMessage(message.guild.id, {
            embeds: [{
                author: {
                    name: message.author.username,
                    icon_url: message.author.avatarURL() ?? undefined,
                },
                title: `🗑️ Message deleted in ${message.channel}`,
                description: message.content ?? '',
                color: 0xff0000,
                footer: {
                    text: `Message ID: ${message.id}`
                },
                timestamp: new Date().toISOString(),
            }]
        });
    }

    @On({ event: 'guildMemberRemove' })
    async guildMemberRemove([member]: ArgsOf<'guildMemberRemove'>) {
        this.sendAuditLogMessage(member.guild.id, {
            embeds: [{
                author: {
                    name: member.user.username,
                    icon_url: member.user.avatarURL() ?? member.user.defaultAvatarURL,
                },
                description: member.joinedTimestamp ? outdent`
                    📤 <@${member.id}> **left the server**
                    They were here for **${Math.floor((Date.now() - member.joinedTimestamp) / 1000 / 60 / 60 / 24)} days**
                ` : outdent`
                    📤 <@${member.id}> **left the server**
                `,
                thumbnail: {
                    url: member.user.avatarURL({ size: 4096 }) ?? member.user.defaultAvatarURL,
                },
                color: 0xff0000,
                footer: {
                    text: `Member ID: ${member.id}`,
                },
                timestamp: new Date().toISOString(),
            }]
        });
    }

    async sendAuditLogMessage(guildId: string, payload: MessagePayload | MessageCreateOptions | string) {
        // Get the guild
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;

        // Get the audit log channel
        const auditLogChannel = guild.channels.cache.find(channel => channel.name.includes('audit-log') && channel.type === ChannelType.GuildText) as TextChannel | undefined;
        if (!auditLogChannel) return;

        // Send the message to the audit log channel
        await auditLogChannel.send(payload);
    }
}
