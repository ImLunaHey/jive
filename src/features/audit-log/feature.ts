import { isFeatureEnabled } from '@app/common/is-feature-enabled';
import { prisma } from '@app/common/prisma-client';
import { globalLogger } from '@app/logger';
import { AuditLog } from '@prisma/client';
import { Channel, ChannelType, Colors, GuildMember, PartialGuildMember, TextChannel, User } from 'discord.js';
import { ArgsOf, Discord, On } from 'discordx';
import { outdent } from 'outdent';

@Discord()
export class Feature {
    private logger = globalLogger.scope('AuditLog');

    constructor() {
        this.logger.success('Feature initialized');
    }

    isValid(auditLog: AuditLog, { member, user, channel }: {
        member?: GuildMember | PartialGuildMember;
        user?: User;
        channel?: Channel;
    }) {
        // If there's no user or member bail
        const id = member?.id ?? user?.id;
        if (!id) return false;

        // Skip bots
        if (auditLog.ignoreBots && (member?.user.bot || user?.bot)) return false;

        // Skip ignored users
        if (auditLog.ignoredUsers?.includes(id)) return false;

        // Skip ignored roles
        if (member && auditLog.ignoredRoles?.some(roleId => member.roles.cache.has(roleId))) return false;

        // Skip ignored channels
        if (channel && auditLog.ignoredChannels?.includes(channel.id)) return false;

        // Success
        return true;
    }

    // Kick
    @On({ event: 'guildMemberRemove' })
    async guildMemberRemove([member]: ArgsOf<'guildMemberRemove'>) {
        if (!await isFeatureEnabled('auditLog', member.guild?.id)) return;

        // Get the audit log channel
        const auditLogs = await prisma.auditLog.findMany({
            where: {
                AuditLogSettings: {
                    settings: {
                        guild: {
                            id: member.guild.id,
                        }
                    }
                },
                kick: true,
                auditLogChannelId: {
                    not: null,
                }
            }
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Get the audit log channel
            if (!auditLog.auditLogChannelId) continue;
            const auditLogChannel = member.guild.channels.cache.get(auditLog.auditLogChannelId) as TextChannel | undefined;
            if (!auditLogChannel) continue;

            // Check if this is valid
            if (!this.isValid(auditLog, {
                member,
            })) continue;

            // Send the message
            await auditLogChannel.send({
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
                    color: Colors.Red,
                    footer: {
                        text: `Member ID: ${member.id}`,
                    },
                    timestamp: new Date().toISOString(),
                }]
            });
        }
    }

    // Join
    @On({ event: 'guildMemberAdd' })
    async guildMemberAdd([member]: ArgsOf<'guildMemberAdd'>) {
        if (!await isFeatureEnabled('auditLog', member.guild?.id)) return;

        // Get the audit log channel
        const auditLogs = await prisma.auditLog.findMany({
            where: {
                AuditLogSettings: {
                    settings: {
                        guild: {
                            id: member.guild.id,
                        }
                    }
                },
                join: true,
                auditLogChannelId: {
                    not: null,
                }
            }
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Get the audit log channel
            if (!auditLog.auditLogChannelId) continue;
            const auditLogChannel = member.guild.channels.cache.get(auditLog.auditLogChannelId) as TextChannel | undefined;
            if (!auditLogChannel) continue;

            // Check if this is valid
            if (!this.isValid(auditLog, {
                member
            })) continue;

            // Send the message
            await auditLogChannel.send({
                embeds: [{
                    author: {
                        name: member.user.username,
                        icon_url: member.user.avatarURL() ?? member.user.defaultAvatarURL,
                    },
                    description: `📥 <@${member.id}> **joined the server**`,
                    thumbnail: {
                        url: member.user.avatarURL({ size: 4096 }) ?? member.user.defaultAvatarURL,
                    },
                    color: Colors.Green,
                    footer: {
                        text: `Member ID: ${member.id}`,
                    },
                    timestamp: new Date().toISOString(),
                }]
            });
        }
    }

    // Ban
    @On({ event: 'guildBanAdd' })
    async guildBanAdd([ban]: ArgsOf<'guildBanAdd'>) {
        if (!await isFeatureEnabled('auditLog', ban.guild.id)) return;

        // Get the audit log channel
        const auditLogs = await prisma.auditLog.findMany({
            where: {
                AuditLogSettings: {
                    settings: {
                        guild: {
                            id: ban.guild.id,
                        }
                    }
                },
                ban: true,
                auditLogChannelId: {
                    not: null,
                }
            }
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Get the audit log channel
            if (!auditLog.auditLogChannelId) continue;
            const auditLogChannel = ban.guild.channels.cache.get(auditLog.auditLogChannelId) as TextChannel | undefined;
            if (!auditLogChannel) continue;

            // Check if this is valid
            if (!this.isValid(auditLog, {
                user: ban.user,
            })) continue;

            // Send the message
            await auditLogChannel.send({
                embeds: [{
                    author: {
                        name: ban.user.username,
                        icon_url: ban.user.avatarURL() ?? ban.user.defaultAvatarURL,
                    },
                    description: `📥 <@${ban.user.id}> **joined the server**`,
                    thumbnail: {
                        url: ban.user.avatarURL({ size: 4096 }) ?? ban.user.defaultAvatarURL,
                    },
                    color: Colors.Red,
                    footer: {
                        text: `Member ID: ${ban.user.id}`,
                    },
                    timestamp: new Date().toISOString(),
                }]
            });
        }
    }

    // Unban
    @On({ event: 'guildBanRemove' })
    async guildBanRemove([ban]: ArgsOf<'guildBanRemove'>) {
    }

    @On({ event: 'guildMemberUpdate' })
    async guildMemberUpdate([oldMember, newMember]: ArgsOf<'guildMemberUpdate'>) {
    }

    @On({ event: 'guildUpdate' })
    async guildUpdate([oldGuild, newGuild]: ArgsOf<'guildUpdate'>) {
    }

    @On({ event: 'roleCreate' })
    async roleCreate([role]: ArgsOf<'roleCreate'>) {
    }

    @On({ event: 'roleDelete' })
    async guildRoleDelete([role]: ArgsOf<'roleDelete'>) {
    }

    @On({ event: 'roleUpdate' })
    async guildRoleUpdate([oldRole, newRole]: ArgsOf<'roleUpdate'>) {
    }

    @On({ event: 'emojiCreate' })
    async guildEmojiCreate([emoji]: ArgsOf<'emojiCreate'>) {
    }

    @On({ event: 'emojiDelete' })
    async guildEmojiDelete([emoji]: ArgsOf<'emojiDelete'>) {
    }

    @On({ event: 'emojiUpdate' })
    async guildEmojiUpdate([oldEmoji, newEmoji]: ArgsOf<'emojiUpdate'>) {
    }

    @On({ event: 'guildIntegrationsUpdate' })
    async guildIntegrationsUpdate([guild]: ArgsOf<'guildIntegrationsUpdate'>) {
    }

    @On({ event: 'channelCreate' })
    async channelCreate([channel]: ArgsOf<'channelCreate'>) {
    }

    @On({ event: 'channelDelete' })
    async channelDelete([channel]: ArgsOf<'channelDelete'>) {
    }

    @On({ event: 'channelUpdate' })
    async channelUpdate([oldChannel, newChannel]: ArgsOf<'channelUpdate'>) {
    }

    @On({ event: 'channelPinsUpdate' })
    async channelPinsUpdate([channel, time]: ArgsOf<'channelPinsUpdate'>) {
    }

    @On({ event: 'inviteCreate' })
    async inviteCreate([invite]: ArgsOf<'inviteCreate'>) {
    }

    @On({ event: 'inviteDelete' })
    async inviteDelete([invite]: ArgsOf<'inviteDelete'>) {
    }

    // messageDelete
    @On({ event: 'messageDelete' })
    async messageDelete([message]: ArgsOf<'messageDelete'>) {
        if (!await isFeatureEnabled('auditLog', message.guild?.id)) return;

        // Skip bot messages
        if (message.author?.bot) return;

        // Skip webhook messages
        if (!message.author) return;

        // Skip system messages
        if (!message.guild) return;

        // Skip DM messages
        if (message.channel.type === ChannelType.DM) return;

        // Get the audit log channel
        const auditLogs = await prisma.auditLog.findMany({
            where: {
                AuditLogSettings: {
                    settings: {
                        guild: {
                            id: message.guild.id,
                        }
                    }
                },
                messageDelete: true,
                auditLogChannelId: {
                    not: null,
                }
            }
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Get the audit log channel
            if (!auditLog.auditLogChannelId) continue;
            const auditLogChannel = message.guild.channels.cache.get(auditLog.auditLogChannelId) as TextChannel | undefined;
            if (!auditLogChannel) continue;

            // Check if this is valid
            if (!this.isValid(auditLog, {
                user: message.author,
                channel: message.channel,
            })) continue;

            // Send the message
            await auditLogChannel.send({
                embeds: [{
                    author: {
                        name: message.author.username,
                        icon_url: message.author.avatarURL() ?? undefined,
                    },
                    description: outdent`
                        🗑️ Message sent by <@${message.author.id}> deleted in ${message.channel}
                        ${message.content ?? ''}
                    `,
                    color: Colors.Red,
                    footer: {
                        text: `Message ID: ${message.id}`
                    },
                    timestamp: new Date().toISOString(),
                }]
            });
        }
    }

    // bulkMessageDelete
    // @TODO: not working even with it enabled
    @On({ event: 'messageDeleteBulk' })
    async messageDeleteBulk([messages]: ArgsOf<'messageDeleteBulk'>) {
        // Get the first message
        const firstMessage = messages.first();

        // Only handle bulk deletes in guilds
        if (!firstMessage?.guild?.id) return;

        // Check this feature is enabled
        if (!await isFeatureEnabled('auditLog', messages.first()?.guild?.id)) return;

        // Get the audit log channel
        const auditLogs = await prisma.auditLog.findMany({
            where: {
                AuditLogSettings: {
                    settings: {
                        guild: {
                            id: firstMessage.guild.id,
                        }
                    }
                },
                bulkMessageDelete: true,
                auditLogChannelId: {
                    not: null,
                }
            }
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Get the audit log channel
            if (!auditLog.auditLogChannelId) continue;
            const auditLogChannel = firstMessage.guild.channels.cache.get(auditLog.auditLogChannelId) as TextChannel | undefined;
            if (!auditLogChannel) continue;

            // Check if this is valid
            if (!this.isValid(auditLog, {
                channel: firstMessage.channel,
            })) continue;

            // Send the message
            // @TODO: Fix the rest of the embed
            await auditLogChannel.send({
                embeds: [{
                    // author: {
                    //     name: firstMessage.author.username,
                    //     icon_url: firstMessage.author.avatarURL() ?? undefined,
                    // },
                    title: `🗑️ ${messages.size} messages deleted in ${firstMessage.channel}`,
                    // description: firstMessage.content ?? '',
                    color: Colors.Red,
                    // footer: {
                    //     text: `Message ID: ${firstMessage.id}`
                    // },
                    timestamp: new Date().toISOString(),
                }]
            });
        }
    }
}
