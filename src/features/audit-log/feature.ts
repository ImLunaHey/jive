import { hexToColour } from '@app/common/hex-to-colour';
import { isFeatureEnabled } from '@app/common/is-feature-enabled';
import { prisma } from '@app/common/prisma-client';
import { timeLength } from '@app/common/time';
import { globalLogger } from '@app/logger';
import { AuditLog } from '@prisma/client';
import { Channel, ChannelType, Colors, EmbedField, GuildHubType, GuildMember, PartialGuildMember, TextChannel, User } from 'discord.js';
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
    // Leave
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
                        name: member.user.tag,
                        icon_url: member.user.avatarURL() ?? member.user.defaultAvatarURL,
                    },
                    description: `📤 <@${member.id}> **left the server**`,
                    fields: [{
                        name: 'Account Created',
                        value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
                        inline: true,
                    }, {
                        name: 'Joined Server',
                        value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown',
                        inline: true,
                    }, {
                        name: 'Left Server',
                        value: `<t:${Math.floor(new Date().getTime() / 1000)}:R>`,
                        inline: true,
                    }, {
                        name: 'Time here',
                        value: member.joinedTimestamp ? timeLength(new Date(member.joinedTimestamp)) : 'Unknown',
                        inline: true,
                    }, {
                        name: 'Roles',
                        value: member.roles.cache.size > 1 ? member.roles.cache.filter(role => role.id !== member.guild.id).map(role => `<@&${role.id}>`).join(' ') : 'None',
                    }],
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
                        name: member.user.tag,
                        icon_url: member.user.avatarURL() ?? member.user.defaultAvatarURL,
                    },
                    description: `📥 <@${member.id}> **joined the server**`,
                    fields: [{
                        name: 'Account Created',
                        value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
                    }],
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
                        name: ban.user.tag,
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
        if (!await isFeatureEnabled('auditLog', role.guild.id)) return;

        // Get the audit log channel
        const auditLogs = await prisma.auditLog.findMany({
            where: {
                AuditLogSettings: {
                    settings: {
                        guild: {
                            id: role.guild.id,
                        }
                    }
                },
                roleCreate: true,
                auditLogChannelId: {
                    not: null,
                }
            }
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Get the audit log channel
            if (!auditLog.auditLogChannelId) continue;
            const auditLogChannel = role.guild.channels.cache.get(auditLog.auditLogChannelId) as TextChannel | undefined;
            if (!auditLogChannel) continue;

            // Send the embed
            await auditLogChannel.send({
                embeds: [{
                    title: 'Role Created',
                    description: `**${role.name}**`,
                    fields: [{
                        name: 'Color',
                        value: role.hexColor,
                        inline: true,
                    }, {
                        name: 'Mentionable',
                        value: role.mentionable ? 'Yes ✅' : 'No ❌',
                        inline: true,
                    }, {
                        name: 'Hoisted',
                        value: role.hoist ? 'Yes ✅' : 'No ❌',
                        inline: true,
                    }, {
                        name: 'Position',
                        value: String(role.position),
                        inline: true,
                    }, {
                        name: 'Permissions',
                        value: role.permissions.toArray().join(', '),
                        inline: true,
                    }, {
                        name: 'Managed',
                        value: role.managed ? 'Yes ✅' : 'No ❌',
                        inline: true,
                    }, {
                        name: 'Created At',
                        value: `<t:${Math.floor(role.createdAt.getTime() / 1000)}:R>`,
                        inline: true,
                    }],
                    color: hexToColour(role.hexColor),
                    footer: {
                        text: `Role ID: ${role.id}`,
                    },
                }],
            });
        }
    }

    @On({ event: 'roleDelete' })
    async guildRoleDelete([role]: ArgsOf<'roleDelete'>) {
        if (!await isFeatureEnabled('auditLog', role.guild.id)) return;

        // Get the audit log channel
        const auditLogs = await prisma.auditLog.findMany({
            where: {
                AuditLogSettings: {
                    settings: {
                        guild: {
                            id: role.guild.id,
                        }
                    }
                },
                roleDelete: true,
                auditLogChannelId: {
                    not: null,
                }
            }
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Get the audit log channel
            if (!auditLog.auditLogChannelId) continue;
            const auditLogChannel = role.guild.channels.cache.get(auditLog.auditLogChannelId) as TextChannel | undefined;
            if (!auditLogChannel) continue;

            // Send the embed
            await auditLogChannel.send({
                embeds: [{
                    title: 'Role Deleted',
                    description: `**${role.name}**`,
                    fields: [{
                        name: 'Color',
                        value: role.hexColor,
                        inline: true,
                    }, {
                        name: 'Mentionable',
                        value: role.mentionable ? 'Yes ✅' : 'No ❌',
                        inline: true,
                    }, {
                        name: 'Hoisted',
                        value: role.hoist ? 'Yes ✅' : 'No ❌',
                        inline: true,
                    }, {
                        name: 'Position',
                        value: String(role.position),
                        inline: true,
                    }, {
                        name: 'Permissions',
                        value: role.permissions.toArray().join(', '),
                        inline: true,
                    }, {
                        name: 'Managed',
                        value: role.managed ? 'Yes ✅' : 'No ❌',
                        inline: true,
                    }, {
                        name: 'Created At',
                        value: `<t:${Math.floor(role.createdAt.getTime() / 1000)}:R>`,
                        inline: true,
                    }, {
                        name: 'Deleted At',
                        value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
                        inline: true,
                    }],
                    color: hexToColour(role.hexColor),
                    footer: {
                        text: `Role ID: ${role.id}`,
                    },
                }],
            });
        }
    }

    @On({ event: 'roleUpdate' })
    async guildRoleUpdate([oldRole, newRole]: ArgsOf<'roleUpdate'>) {
        if (!await isFeatureEnabled('auditLog', newRole.guild.id)) return;

        // Get the audit log channel
        const auditLogs = await prisma.auditLog.findMany({
            where: {
                AuditLogSettings: {
                    settings: {
                        guild: {
                            id: newRole.guild.id,
                        }
                    }
                },
                roleUpdate: true,
                auditLogChannelId: {
                    not: null,
                }
            }
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Get the audit log channel
            if (!auditLog.auditLogChannelId) continue;
            const auditLogChannel = newRole.guild.channels.cache.get(auditLog.auditLogChannelId) as TextChannel | undefined;
            if (!auditLogChannel) continue;

            const fields: EmbedField[] = [];

            // Check if the role name changed
            if (oldRole.name !== newRole.name) {
                fields.push({
                    name: 'Name',
                    value: `**Old:** ${oldRole.name}\n**New:** ${newRole.name}`,
                    inline: true,
                });
            }

            // Check if the role color changed
            if (oldRole.hexColor !== newRole.hexColor) {
                fields.push({
                    name: 'Color',
                    value: `**Old:** ${oldRole.hexColor}\n**New:** ${newRole.hexColor}`,
                    inline: true,
                });
            }

            // Check if the role mentionable changed
            if (oldRole.mentionable !== newRole.mentionable) {
                fields.push({
                    name: 'Mentionable',
                    value: `**Old:** ${oldRole.mentionable ? 'Yes ✅' : 'No ❌'}\n**New:** ${newRole.mentionable ? 'Yes ✅' : 'No ❌'}`,
                    inline: true,
                });
            }

            // Check if the role hoist changed
            if (oldRole.hoist !== newRole.hoist) {
                fields.push({
                    name: 'Hoisted',
                    value: `**Old:** ${oldRole.hoist ? 'Yes ✅' : 'No ❌'}\n**New:** ${newRole.hoist ? 'Yes ✅' : 'No ❌'}`,
                    inline: true,
                });
            }

            // Check if the role position changed
            if (oldRole.position !== newRole.position) {
                fields.push({
                    name: 'Position',
                    value: `**Old:** ${oldRole.position}\n**New:** ${newRole.position}`,
                    inline: true,
                });
            }

            // Check if the role permissions changed
            if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
                fields.push({
                    name: 'Permissions',
                    value: `**Old:** ${oldRole.permissions.toArray().join(', ')}\n**New:** ${newRole.permissions.toArray().join(', ')}`,
                    inline: true,
                });
            }

            // Check if the role managed changed
            if (oldRole.managed !== newRole.managed) {
                fields.push({
                    name: 'Managed',
                    value: `**Old:** ${oldRole.managed ? 'Yes ✅' : 'No ❌'}\n**New:** ${newRole.managed ? 'Yes ✅' : 'No ❌'}`,
                    inline: true,
                });
            }

            // Don't send the embed if nothing changed
            if (fields.length === 0) return;

            // Send the embed
            await auditLogChannel.send({
                embeds: [{
                    title: 'Role Updated',
                    description: `**${newRole.name}**`,
                    fields,
                    color: hexToColour(newRole.hexColor),
                    footer: {
                        text: `Role ID: ${newRole.id}`,
                    },
                }],
            });
        }
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
        if (!await isFeatureEnabled('auditLog', channel.guild.id)) return;

        // Get the audit log channel
        const auditLogs = await prisma.auditLog.findMany({
            where: {
                AuditLogSettings: {
                    settings: {
                        guild: {
                            id: channel.guild.id,
                        },
                    },
                },
                channelCreate: true,
                auditLogChannelId: {
                    not: null,
                },
            },
        });

        const fields: EmbedField[] = [];

        // Text channels
        if (channel.type === ChannelType.GuildText) {
            // Topic
            fields.push({
                name: 'Topic',
                value: channel.topic || 'None',
                inline: true,
            });

            // NSFW
            fields.push({
                name: 'NSFW',
                value: channel.nsfw ? 'Yes ✅' : 'No ❌',
                inline: true,
            });

            // Slowmode
            fields.push({
                name: 'Slowmode',
                value: `${channel.rateLimitPerUser} seconds`,
                inline: true,
            });
        }

        // Category
        fields.push({
            name: 'Category',
            value: channel.parent ? channel.parent.name : 'None',
            inline: true,
        });

        // Permissions
        fields.push({
            name: 'Permissions',
            value: channel.permissionOverwrites.cache.map((permission) => {
                const role = channel.guild.roles.cache.get(permission.id);
                if (role) return `${role.name}: ${permission.allow.toArray().join(', ')}`;
                return `${permission.id}: ${permission.allow.toArray().join(', ')}`;
            }).join('\n'),
            inline: true,
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Get the audit log channel
            if (!auditLog.auditLogChannelId) continue;
            const auditLogChannel = channel.guild.channels.cache.get(auditLog.auditLogChannelId) as TextChannel | undefined;
            if (!auditLogChannel) continue;

            // Send the embed
            await auditLogChannel.send({
                embeds: [{
                    title: 'Channel Created',
                    description: `**${channel.name}**`,
                    fields,
                    color: Colors.Green,
                    footer: {
                        text: `Channel ID: ${channel.id}`,
                    },
                }],
            });
        }
    }

    @On({ event: 'channelDelete' })
    async channelDelete([channel]: ArgsOf<'channelDelete'>) {
        // Don't log DM channels
        if (channel.type === ChannelType.DM) return;

        // Check if the feature is enabled
        if (!await isFeatureEnabled('auditLog', channel.guild.id)) return;

        // Get the audit log channel
        const auditLogs = await prisma.auditLog.findMany({
            where: {
                AuditLogSettings: {
                    settings: {
                        guild: {
                            id: channel.guild.id,
                        },
                    },
                },
                channelDelete: true,
                auditLogChannelId: {
                    not: null,
                },
            },
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Get the audit log channel
            if (!auditLog.auditLogChannelId) continue;
            const auditLogChannel = channel.guild.channels.cache.get(auditLog.auditLogChannelId) as TextChannel | undefined;
            if (!auditLogChannel) continue;

            // Send the embed
            await auditLogChannel.send({
                embeds: [{
                    title: 'Channel Deleted',
                    description: `**${channel.name}**`,
                    color: Colors.Red,
                    footer: {
                        text: `Channel ID: ${channel.id}`,
                    },
                }],
            });
        }
    }

    @On({ event: 'channelUpdate' })
    async channelUpdate([oldChannel, newChannel]: ArgsOf<'channelUpdate'>) {
        // Don't log DM channels
        if (oldChannel.type === ChannelType.DM) return;
        if (newChannel.type === ChannelType.DM) return;

        // Check if the feature is enabled
        if (!await isFeatureEnabled('auditLog', oldChannel.guild.id)) return;

        // Get the audit log channel
        const auditLogs = await prisma.auditLog.findMany({
            where: {
                AuditLogSettings: {
                    settings: {
                        guild: {
                            id: oldChannel.guild.id,
                        },
                    },
                },
                channelUpdate: true,
                auditLogChannelId: {
                    not: null,
                },
            },
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Get the audit log channel
            if (!auditLog.auditLogChannelId) continue;
            const auditLogChannel = oldChannel.guild.channels.cache.get(auditLog.auditLogChannelId) as TextChannel | undefined;
            if (!auditLogChannel) continue;

            // Create the embed fields
            const fields: EmbedField[] = [];

            // Check if the channel name changed
            if (oldChannel.name !== newChannel.name) {
                fields.push({
                    name: 'Name',
                    value: `**Old:** ${oldChannel.name}\n**New:** ${newChannel.name}`,
                    inline: true,
                });
            }

            // Text channels
            if (oldChannel.type === ChannelType.GuildText && newChannel.type === ChannelType.GuildText) {
                // Check if the channel topic changed
                if (oldChannel.topic !== newChannel.topic) {
                    fields.push({
                        name: 'Topic',
                        value: `**Old:** ${oldChannel.topic || 'None'}\n**New:** ${newChannel.topic || 'None'}`,
                        inline: true,
                    });
                }

                // Check if the channel nsfw changed
                if (oldChannel.nsfw !== newChannel.nsfw) {
                    fields.push({
                        name: 'NSFW',
                        value: `**Old:** ${oldChannel.nsfw ? 'Yes ✅' : 'No ❌'}\n**New:** ${newChannel.nsfw ? 'Yes ✅' : 'No ❌'}`,
                        inline: true,
                    });
                }

                // Check if the channel rate limit changed
                if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
                    fields.push({
                        name: 'Slowmode',
                        value: `**Old:** ${oldChannel.rateLimitPerUser}\n**New:** ${newChannel.rateLimitPerUser}`,
                        inline: true,
                    });
                }
            }

            // Check if the channel position changed
            if (oldChannel.rawPosition !== newChannel.rawPosition) {
                fields.push({
                    name: 'Position',
                    value: `**Old:** ${oldChannel.rawPosition}\n**New:** ${newChannel.rawPosition}`,
                    inline: true,
                });
            }

            // Check if the channel parent changed
            if (oldChannel.parentId !== newChannel.parentId) {
                fields.push({
                    name: 'Category',
                    value: `**Old:** ${oldChannel.parent?.name || 'None'}\n**New:** ${newChannel.parent?.name || 'None'}`,
                    inline: true,
                });
            }

            // Check if the channel permissions changed
            if (oldChannel.permissionOverwrites.cache.size !== newChannel.permissionOverwrites.cache.size) {
                fields.push({
                    name: 'Permissions',
                    value: `**Old:** ${oldChannel.permissionOverwrites.cache.size}\n**New:** ${newChannel.permissionOverwrites.cache.size}`,
                    inline: true,
                });
            }

            // Voice channels
            if (oldChannel.type === ChannelType.GuildVoice && newChannel.type === ChannelType.GuildVoice) {
                // Check if the channel bitrate changed
                if (oldChannel.bitrate !== newChannel.bitrate) {
                    fields.push({
                        name: 'Bitrate',
                        value: `**Old:** ${oldChannel.bitrate}\n**New:** ${newChannel.bitrate}`,
                        inline: true,
                    });
                }

                // Check if the channel user limit changed
                if (oldChannel.userLimit !== newChannel.userLimit) {
                    fields.push({
                        name: 'User Limit',
                        value: `**Old:** ${oldChannel.userLimit}\n**New:** ${newChannel.userLimit}`,
                        inline: true,
                    });
                }
            }

            // Send the embed
            await auditLogChannel.send({
                embeds: [{
                    title: 'Channel Updated',
                    description: `**${newChannel.name}**`,
                    color: Colors.Purple,
                    fields,
                    footer: {
                        text: `Channel ID: ${newChannel.id}`,
                    },
                }],
            });
        }
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
                        name: message.author.tag,
                        icon_url: message.author.avatarURL() ?? undefined,
                    },
                    description: outdent`
                        🗑️ Message sent by <@${message.author.id}> deleted in <#${message.channel.id}>
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
