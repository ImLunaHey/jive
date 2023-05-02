import { client } from '@app/client';
import { channelTypeToName } from '@app/common/channel-type-to-name';
import { db } from '@app/common/database';
import { hexToColour } from '@app/common/hex-to-colour';
import { isFeatureEnabled } from '@app/common/is-feature-enabled';
import { timeLength } from '@app/common/time';
import { globalLogger } from '@app/logger';
import { EmbedBuilder } from '@discordjs/builders';
import type { Channel, EmbedField, Guild, GuildMember, InviteGuild, PartialGuildMember, Role, TextChannel, User } from 'discord.js';
import { ChannelType, Colors } from 'discord.js';
import { type ArgsOf, Discord, On } from 'discordx';
import { outdent } from 'outdent';

const filterOutEveryoneRole = (r: Role) => r.name !== '@everyone';

@Discord()
export class Feature {
    private logger = globalLogger.child({ service: 'AuditLog' });

    constructor() {
        this.logger.info('Initialised');
    }

    isValid(auditLog: {
        ignoreBots: boolean;
        ignoredUsers: string[];
        ignoredRoles: string[];
        ignoredChannels: string[];
    }, { member, user, channel }: {
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

    getAuditLogChannel(guild: Guild | InviteGuild, channelId: string): TextChannel | null {
        if (!channelId) return null;
        const auditLogChannel = client.guilds.cache.get(guild.id)?.channels.cache.get(channelId);
        if (!auditLogChannel) return null;
        if (auditLogChannel.type !== ChannelType.GuildText) return null;
        return auditLogChannel;
    }

    getAuditLogs(guild: Guild | InviteGuild) {
        return db
            .selectFrom('audit_logs')
            .selectAll()
            .where('guildId', '=', guild.id)
            .execute();
    }

    // Leave
    @On({ event: 'guildMemberRemove' })
    async guildMemberRemove([member]: ArgsOf<'guildMemberRemove'>) {
        if (!await isFeatureEnabled('AUDIT_LOG', member.guild?.id)) return;

        // Get the audit logs
        const auditLogs = await this.getAuditLogs(member.guild);

        // Create the embed
        const embed = new EmbedBuilder({
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
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Check if this action is ignored
            if (auditLog.ignoredActions?.includes('LEAVE')) continue;

            // Get the audit log channel
            const auditLogChannel = this.getAuditLogChannel(member.guild, auditLog.channelId);
            if (!auditLogChannel) continue;

            // Check if this is valid
            if (!this.isValid(auditLog, { member })) continue;

            // Send the message
            await auditLogChannel.send({
                embeds: [embed]
            });
        }
    }

    // Join
    @On({ event: 'guildMemberAdd' })
    async guildMemberAdd([member]: ArgsOf<'guildMemberAdd'>) {
        if (!await isFeatureEnabled('AUDIT_LOG', member.guild?.id)) return;

        // Get the audit logs
        const auditLogs = await this.getAuditLogs(member.guild);

        // Create the embed
        const embed = new EmbedBuilder({
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
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Check if this action is ignored
            if (auditLog.ignoredActions?.includes('JOIN')) continue;

            // Get the audit log channel
            const auditLogChannel = this.getAuditLogChannel(member.guild, auditLog.channelId);
            if (!auditLogChannel) continue;

            // Check if this is valid
            if (!this.isValid(auditLog, {
                member
            })) continue;

            // Send the message
            await auditLogChannel.send({
                embeds: [embed]
            });
        }
    }

    // Ban
    @On({ event: 'guildBanAdd' })
    async guildBanAdd([ban]: ArgsOf<'guildBanAdd'>) {
        if (!await isFeatureEnabled('AUDIT_LOG', ban.guild.id)) return;

        // Get the audit logs
        const auditLogs = await this.getAuditLogs(ban.guild);

        // Create the embed
        const embed = new EmbedBuilder({
            author: {
                name: ban.user.tag,
                icon_url: ban.user.avatarURL() ?? ban.user.defaultAvatarURL,
            },
            description: `📥 <@${ban.user.id}> **banned**`,
            thumbnail: {
                url: ban.user.avatarURL({ size: 4096 }) ?? ban.user.defaultAvatarURL,
            },
            color: Colors.Red,
            footer: {
                text: `Member ID: ${ban.user.id}`,
            },
            timestamp: new Date().toISOString(),
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Check if this action is ignored
            if (auditLog.ignoredActions?.includes('BAN')) continue;

            // Get the audit log channel
            const auditLogChannel = this.getAuditLogChannel(ban.guild, auditLog.channelId);
            if (!auditLogChannel) continue;

            // Check if this is valid
            if (!this.isValid(auditLog, {
                user: ban.user,
            })) continue;

            // Send the message
            await auditLogChannel.send({
                embeds: [embed]
            });
        }
    }

    // Unban
    @On({ event: 'guildBanRemove' })
    async guildBanRemove([]: ArgsOf<'guildBanRemove'>) {
        // TODO: Audit log - Unban
    }

    @On({ event: 'guildMemberUpdate' })
    async guildMemberUpdate([oldMember, newMember]: ArgsOf<'guildMemberUpdate'>) {
        if (!await isFeatureEnabled('AUDIT_LOG', newMember.guild.id)) return;

        // Get the audit logs
        const auditLogs = await this.getAuditLogs(newMember.guild);

        // Create the fields
        const fields: EmbedField[] = [];

        // Check if the nickname changed
        if (oldMember.nickname !== newMember.nickname) {
            fields.push({
                name: 'Nickname',
                value: `${oldMember.nickname ?? 'None'} ➔ ${newMember.nickname ?? 'None'}`,
                inline: true,
            });
        }

        // Check if the roles changed
        if (oldMember.roles.cache.filter(filterOutEveryoneRole).size !== newMember.roles.cache.filter(filterOutEveryoneRole).size) {
            fields.push({
                name: 'Roles',
                value: `${oldMember.roles.cache.filter(filterOutEveryoneRole).map(r => `<@&${r.id}>`).join(', ') ?? 'None'} ➔ ${newMember.roles.cache.filter(filterOutEveryoneRole).map(r => `<@&${r.id}>`).join(', ') ?? 'None'}`,
                inline: true,
            });
        }

        // Check if the avatar changed
        if (oldMember.user.avatar !== newMember.user.avatar) {
            fields.push({
                name: 'Avatar',
                value: `[Old](${oldMember.user.avatarURL({ size: 4096 }) ?? oldMember.user.defaultAvatarURL}) ➔ [New](${newMember.user.avatarURL({ size: 4096 }) ?? newMember.user.defaultAvatarURL})`,
                inline: true,
            });
        }

        // Check if the username changed
        if (oldMember.user.username !== newMember.user.username) {
            fields.push({
                name: 'Username',
                value: `${oldMember.user.username} ➔ ${newMember.user.username}`,
                inline: true,
            });
        }

        // Check if the discriminator changed
        if (oldMember.user.discriminator !== newMember.user.discriminator) {
            fields.push({
                name: 'Discriminator',
                value: `${oldMember.user.discriminator} ➔ ${newMember.user.discriminator}`,
                inline: true,
            });
        }

        // Create the embed
        const embed = new EmbedBuilder({
            author: {
                name: newMember.user.tag,
                icon_url: newMember.user.avatarURL() ?? newMember.user.defaultAvatarURL,
            },
            description: `📥 <@${newMember.user.id}> **updated**`,
            fields,
            thumbnail: {
                url: newMember.user.avatarURL({ size: 4096 }) ?? newMember.user.defaultAvatarURL,
            },
            color: Colors.Green,
            footer: {
                text: `Member ID: ${newMember.id}`,
            },
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Check if this action is ignored
            if (auditLog.ignoredActions?.includes('MEMBER_UPDATE')) continue;

            // Get the audit log channel
            const auditLogChannel = this.getAuditLogChannel(newMember.guild, auditLog.channelId);
            if (!auditLogChannel) continue;

            // Check if this is valid
            if (!this.isValid(auditLog, {
                member: newMember,
            })) continue;

            // Send the message
            await auditLogChannel.send({
                embeds: [embed]
            });
        }
    }

    @On({ event: 'guildUpdate' })
    async guildUpdate([oldGuild, newGuild]: ArgsOf<'guildUpdate'>) {
        if (!await isFeatureEnabled('AUDIT_LOG', newGuild.id)) return;

        // Get the audit logs
        const auditLogs = await this.getAuditLogs(newGuild);

        const fields: EmbedField[] = [];

        // Check if the name changed
        if (oldGuild.name !== newGuild.name) {
            fields.push({
                name: 'Name',
                value: `${oldGuild.name} ➔ ${newGuild.name}`,
                inline: true,
            });
        }

        // Check if the icon changed
        if (oldGuild.iconURL() !== newGuild.iconURL()) {
            fields.push({
                name: 'Icon',
                value: `${oldGuild.iconURL() ?? 'None'} ➔ ${newGuild.iconURL() ?? 'None'}`,
                inline: true,
            });
        }

        // Check if the splash changed
        if (oldGuild.splashURL() !== newGuild.splashURL()) {
            fields.push({
                name: 'Splash',
                value: `${oldGuild.splashURL() ?? 'None'} ➔ ${newGuild.splashURL() ?? 'None'}`,
                inline: true,
            });
        }

        // Check if the banner changed
        if (oldGuild.bannerURL() !== newGuild.bannerURL()) {
            fields.push({
                name: 'Banner',
                value: `${oldGuild.bannerURL() ?? 'None'} ➔ ${newGuild.bannerURL() ?? 'None'}`,
                inline: true,
            });
        }

        // Check if the discovery splash changed
        if (oldGuild.discoverySplashURL() !== newGuild.discoverySplashURL()) {
            fields.push({
                name: 'Discovery Splash',
                value: `${oldGuild.discoverySplashURL() ?? 'None'} ➔ ${newGuild.discoverySplashURL() ?? 'None'}`,
                inline: true,
            });
        }

        // Check if the afk channel changed
        if (oldGuild.afkChannelId !== newGuild.afkChannelId) {
            fields.push({
                name: 'AFK Channel',
                value: `${oldGuild.afkChannelId ? `<#${oldGuild.afkChannelId}>` : 'None'} ➔ ${newGuild.afkChannelId ? `<#${newGuild.afkChannelId}>` : 'None'}`,
                inline: true,
            });
        }

        // Check if the afk timeout changed
        if (oldGuild.afkTimeout !== newGuild.afkTimeout) {
            fields.push({
                name: 'AFK Timeout',
                value: `${oldGuild.afkTimeout} ➔ ${newGuild.afkTimeout}`,
                inline: true,
            });
        }

        // Check if the verification level changed
        if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
            fields.push({
                name: 'Verification Level',
                value: `${oldGuild.verificationLevel} ➔ ${newGuild.verificationLevel}`,
                inline: true,
            });
        }

        // Check if the default message notifications changed
        if (oldGuild.defaultMessageNotifications !== newGuild.defaultMessageNotifications) {
            fields.push({
                name: 'Default Message Notifications',
                value: `${oldGuild.defaultMessageNotifications} ➔ ${newGuild.defaultMessageNotifications}`,
                inline: true,
            });
        }

        // Check if the explicit content filter changed
        if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
            fields.push({
                name: 'Explicit Content Filter',
                value: `${oldGuild.explicitContentFilter} ➔ ${newGuild.explicitContentFilter}`,
                inline: true,
            });
        }

        // Check if the mfa level changed
        if (oldGuild.mfaLevel !== newGuild.mfaLevel) {
            fields.push({
                name: 'MFA required',
                value: `${oldGuild.mfaLevel === 1 ? 'true' : 'false'} ➔ ${newGuild.mfaLevel === 1 ? 'true' : 'false'}`,
                inline: true,
            });
        }

        // Check if the owner changed
        if (oldGuild.ownerId !== newGuild.ownerId) {
            fields.push({
                name: 'Owner',
                value: `<@${oldGuild.ownerId}> ➔ <@${newGuild.ownerId}>`,
                inline: true,
            });
        }

        // Check if the description changed
        if (oldGuild.description !== newGuild.description) {
            fields.push({
                name: 'Description',
                value: `${oldGuild.description ?? 'None'} ➔ ${newGuild.description ?? 'None'}`,
                inline: true,
            });
        }

        // Create the embed
        const embed = new EmbedBuilder({
            title: 'Server Updated',
            fields,
            color: Colors.Blue,
            footer: {
                text: `Server ID: ${newGuild.id}`,
            },
            timestamp: new Date().toISOString(),
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Check if this action is ignored
            if (auditLog.ignoredActions?.includes('GUILD_EDIT')) continue;

            // Get the audit log channel
            const auditLogChannel = this.getAuditLogChannel(newGuild, auditLog.channelId);
            if (!auditLogChannel) continue;

            // Send the embed
            await auditLogChannel.send({
                embeds: [embed]
            });
        }
    }

    @On({ event: 'roleCreate' })
    async roleCreate([role]: ArgsOf<'roleCreate'>) {
        if (!await isFeatureEnabled('AUDIT_LOG', role.guild.id)) return;

        // Get the audit logs
        const auditLogs = await this.getAuditLogs(role.guild);

        // Create the embed
        const embed = new EmbedBuilder({
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
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Check if this action is ignored
            if (auditLog.ignoredActions?.includes('ROLE_CREATE')) continue;

            // Get the audit log channel
            const auditLogChannel = this.getAuditLogChannel(role.guild, auditLog.channelId);
            if (!auditLogChannel) continue;

            // Send the embed
            await auditLogChannel.send({
                embeds: [embed],
            });
        }
    }

    @On({ event: 'roleDelete' })
    async guildRoleDelete([role]: ArgsOf<'roleDelete'>) {
        if (!await isFeatureEnabled('AUDIT_LOG', role.guild.id)) return;

        // Get the audit logs
        const auditLogs = await this.getAuditLogs(role.guild);

        // Create the embed
        const embed = new EmbedBuilder({
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
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Check if this action is ignored
            if (auditLog.ignoredActions?.includes('ROLE_DELETE')) continue;

            // Get the audit log channel
            const auditLogChannel = this.getAuditLogChannel(role.guild, auditLog.channelId);
            if (!auditLogChannel) continue;

            // Send the embed
            await auditLogChannel.send({
                embeds: [embed],
            });
        }
    }

    @On({ event: 'roleUpdate' })
    async guildRoleUpdate([oldRole, newRole]: ArgsOf<'roleUpdate'>) {
        if (!await isFeatureEnabled('AUDIT_LOG', newRole.guild.id)) return;

        // Get the audit logs
        const auditLogs = await this.getAuditLogs(newRole.guild);

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

        // Create the embed
        const embed = new EmbedBuilder({
            title: 'Role Updated',
            description: `**${newRole.name}**`,
            fields,
            color: hexToColour(newRole.hexColor),
            footer: {
                text: `Role ID: ${newRole.id}`,
            },
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Check if this action is ignored
            if (auditLog.ignoredActions?.includes('ROLE_EDIT')) continue;

            // Get the audit log channel
            const auditLogChannel = this.getAuditLogChannel(newRole.guild, auditLog.channelId);
            if (!auditLogChannel) continue;

            // Don't send the embed if nothing changed
            if (fields.length === 0) return;

            // Send the embed
            await auditLogChannel.send({
                embeds: [embed],
            });
        }
    }

    @On({ event: 'emojiCreate' })
    async guildEmojiCreate([emoji]: ArgsOf<'emojiCreate'>) {
        if (!emoji.name) return;
        if (!await isFeatureEnabled('AUDIT_LOG', emoji.guild.id)) return;

        // Get the audit logs
        const auditLogs = await this.getAuditLogs(emoji.guild);

        const fields: EmbedField[] = [];

        // Emoji name
        fields.push({
            name: 'Name',
            value: emoji.name,
            inline: true,
        });

        // Emoji animated
        fields.push({
            name: 'Animated',
            value: emoji.animated ? 'Yes ✅' : 'No ❌',
            inline: true,
        });

        // Emoji created at
        fields.push({
            name: 'Created At',
            value: `<t:${Math.floor(emoji.createdAt.getTime() / 1000)}:R>`,
            inline: true,
        });

        // Create the embed
        const embed = new EmbedBuilder({
            title: 'Emoji Created',
            description: `**${emoji.name}**`,
            fields,
            color: Colors.Green,
            footer: {
                text: `Emoji ID: ${emoji.id}`,
            },
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Check if this action is ignored
            if (auditLog.ignoredActions?.includes('EMOJI_CREATE')) continue;

            // Get the audit log channel
            const auditLogChannel = this.getAuditLogChannel(emoji.guild, auditLog.channelId);
            if (!auditLogChannel) continue;

            // Send the embed
            await auditLogChannel.send({
                embeds: [embed],
            });
        }
    }

    @On({ event: 'emojiDelete' })
    async guildEmojiDelete([emoji]: ArgsOf<'emojiDelete'>) {
        if (!emoji.name) return;
        if (!await isFeatureEnabled('AUDIT_LOG', emoji.guild.id)) return;

        // Get the audit logs
        const auditLogs = await this.getAuditLogs(emoji.guild);

        const fields: EmbedField[] = [];

        // Emoji name
        fields.push({
            name: 'Name',
            value: emoji.name,
            inline: true,
        });

        // Emoji animated
        fields.push({
            name: 'Animated',
            value: emoji.animated ? 'Yes ✅' : 'No ❌',
            inline: true,
        });

        // Emoji created at
        fields.push({
            name: 'Created At',
            value: `<t:${Math.floor(emoji.createdAt.getTime() / 1000)}:R>`,
            inline: true,
        });

        // Create the embed
        const embed = new EmbedBuilder({
            title: 'Emoji Deleted',
            description: `**${emoji.name}**`,
            fields,
            color: Colors.Red,
            footer: {
                text: `Emoji ID: ${emoji.id}`,
            },
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Check if this action is ignored
            if (auditLog.ignoredActions?.includes('EMOJI_DELETE')) continue;

            // Get the audit log channel
            const auditLogChannel = this.getAuditLogChannel(emoji.guild, auditLog.channelId);
            if (!auditLogChannel) continue;

            // Send the embed
            await auditLogChannel.send({
                embeds: [embed],
            });
        }
    }

    @On({ event: 'emojiUpdate' })
    async guildEmojiUpdate([]: ArgsOf<'emojiUpdate'>) {
        // TODO: Audit log - Emoji update
    }

    @On({ event: 'channelCreate' })
    async channelCreate([channel]: ArgsOf<'channelCreate'>) {
        if (!await isFeatureEnabled('AUDIT_LOG', channel.guild.id)) return;

        // Get the audit logs
        const auditLogs = await this.getAuditLogs(channel.guild);

        const fields: EmbedField[] = [];

        // Channel name
        fields.push({
            name: 'Name',
            value: channel.name,
            inline: true,
        });

        // Channel type
        fields.push({
            name: 'Type',
            value: channelTypeToName(channel.type),
            inline: true,
        });

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

            // Slow-mode
            fields.push({
                name: 'Slow-mode',
                value: channel.rateLimitPerUser ? `${channel.rateLimitPerUser} seconds` : 'Off',
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

        // Create the embed
        const embed = new EmbedBuilder({
            title: 'Channel Created',
            description: `<#${channel.id}>`,
            fields,
            color: Colors.Green,
            footer: {
                text: `Channel ID: ${channel.id}`,
            },
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Check if this action is ignored
            if (auditLog.ignoredActions?.includes('CHANNEL_CREATE')) continue;

            // Get the audit log channel
            const auditLogChannel = this.getAuditLogChannel(channel.guild, auditLog.channelId);
            if (!auditLogChannel) continue;

            // Send the embed
            await auditLogChannel.send({
                embeds: [embed],
            });
        }
    }

    @On({ event: 'channelUpdate' })
    async channelUpdate([oldChannel, newChannel]: ArgsOf<'channelUpdate'>) {
        // Don't log DM channels
        if (oldChannel.type === ChannelType.DM) return;
        if (newChannel.type === ChannelType.DM) return;

        // Check if the feature is enabled
        if (!await isFeatureEnabled('AUDIT_LOG', oldChannel.guild.id)) return;

        // Get the audit logs
        const auditLogs = await this.getAuditLogs(newChannel.guild);

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
                    name: 'Slow-mode',
                    value: `**Old:** ${oldChannel.rateLimitPerUser ? `${oldChannel.rateLimitPerUser} seconds` : 'Off'}\n**New:** ${newChannel.rateLimitPerUser ? `${newChannel.rateLimitPerUser} seconds` : 'Off'}`,
                    inline: true,
                });
            }
        }

        // // Check if the channel position changed
        // if (oldChannel.rawPosition !== newChannel.rawPosition) {
        //     fields.push({
        //         name: 'Position',
        //         value: `**Old:** ${oldChannel.rawPosition}\n**New:** ${newChannel.rawPosition}`,
        //         inline: true,
        //     });
        // }

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

        // Create the embed
        const embed = new EmbedBuilder({
            title: 'Channel Updated',
            description: `**${newChannel.name}**`,
            color: Colors.Purple,
            fields,
            footer: {
                text: `Channel ID: ${newChannel.id}`,
            },
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Check if this action is ignored
            if (auditLog.ignoredActions?.includes('CHANNEL_EDIT')) continue;

            // Get the audit log channel
            const auditLogChannel = this.getAuditLogChannel(newChannel.guild, auditLog.channelId);
            if (!auditLogChannel) continue;

            // Send the embed
            await auditLogChannel.send({
                embeds: [embed],
            });
        }
    }

    @On({ event: 'channelDelete' })
    async channelDelete([channel]: ArgsOf<'channelDelete'>) {
        // Don't log DM channels
        if (channel.type === ChannelType.DM) return;

        // Check if the feature is enabled
        if (!await isFeatureEnabled('AUDIT_LOG', channel.guild.id)) return;

        // Get the audit logs
        const auditLogs = await this.getAuditLogs(channel.guild);

        // Create the embed fields
        const fields: EmbedField[] = [];

        // Channel type
        fields.push({
            name: 'Type',
            value: channelTypeToName(channel.type),
            inline: true,
        });

        // Category
        fields.push({
            name: 'Category',
            value: channel.name,
            inline: true,
        });

        // Create the embed
        const embed = new EmbedBuilder({
            title: 'Channel Deleted',
            description: `**${channel.name}**`,
            fields,
            color: Colors.Red,
            footer: {
                text: `Channel ID: ${channel.id}`,
            },
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Check if this action is ignored
            if (auditLog.ignoredActions?.includes('CHANNEL_DELETE')) continue;

            // Get the audit log channel
            const auditLogChannel = this.getAuditLogChannel(channel.guild, auditLog.channelId);
            if (!auditLogChannel) continue;

            // Send the embed
            await auditLogChannel.send({
                embeds: [embed],
            });
        }
    }

    @On({ event: 'channelPinsUpdate' })
    async channelPinsUpdate([]: ArgsOf<'channelPinsUpdate'>) {
        // TODO: Audit log - channel pins
    }

    @On({ event: 'inviteCreate' })
    async inviteCreate([invite]: ArgsOf<'inviteCreate'>) {
        if (!invite.guild) return;

        // Check if the feature is enabled
        if (!await isFeatureEnabled('AUDIT_LOG', invite.guild?.id)) return;

        // Get the audit logs
        const auditLogs = await this.getAuditLogs(invite.guild);

        // Create the embed
        const embed = new EmbedBuilder({
            title: 'Invite Created',
            description: `**${invite.code}**`,
            color: Colors.Green,
            fields: [{
                name: 'Creator',
                value: invite.inviter?.toString() || 'Unknown',
            }]
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Check if this action is ignored
            if (auditLog.ignoredActions?.includes('INVITE_CREATE')) continue;

            // Get the audit log channel
            const auditLogChannel = this.getAuditLogChannel(invite.guild, auditLog.channelId);
            if (!auditLogChannel) continue;

            // Send the embed
            await auditLogChannel.send({
                embeds: [embed],
            });
        }
    }

    @On({ event: 'inviteDelete' })
    async inviteDelete([invite]: ArgsOf<'inviteDelete'>) {
        if (!invite.guild) return;

        // Check if the feature is enabled
        if (!await isFeatureEnabled('AUDIT_LOG', invite.guild?.id)) return;

        // Get the audit logs
        const auditLogs = await this.getAuditLogs(invite.guild);

        // Create the embed
        const embed = new EmbedBuilder({
            title: 'Invite Deleted',
            description: `**${invite.code}**`,
            color: Colors.Red,
            fields: [{
                name: 'Creator',
                value: invite.inviter?.toString() || 'Unknown',
            }]
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Check if this action is ignored
            if (auditLog.ignoredActions?.includes('INVITE_DELETE')) continue;

            // Get the audit log channel
            const auditLogChannel = this.getAuditLogChannel(invite.guild, auditLog.channelId);
            if (!auditLogChannel) continue;

            // Send the embed
            await auditLogChannel.send({
                embeds: [embed],
            });
        }
    }

    // messageDelete
    @On({ event: 'messageDelete' })
    async messageDelete([message]: ArgsOf<'messageDelete'>) {
        if (!await isFeatureEnabled('AUDIT_LOG', message.guild?.id)) return;

        // Skip bot messages
        if (message.author?.bot) return;

        // Skip webhook messages
        if (!message.author) return;

        // Skip system messages
        if (!message.guild) return;

        // Skip DM messages
        if (message.channel.type === ChannelType.DM) return;

        // Get the audit logs
        const auditLogs = await this.getAuditLogs(message.guild);

        // Create the embed
        const embed = new EmbedBuilder({
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
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Check if this action is ignored
            if (auditLog.ignoredActions?.includes('MESSAGE_DELETE')) continue;

            // Get the audit log channel
            const auditLogChannel = this.getAuditLogChannel(message.guild, auditLog.channelId);
            if (!auditLogChannel) continue;

            // Check if this is valid
            if (!this.isValid(auditLog, {
                user: message.author,
                channel: message.channel,
            })) continue;

            // Send the message
            await auditLogChannel.send({
                embeds: [embed],
            });
        }
    }

    // bulkMessageDelete
    // TODO: Not working even with it enabled
    @On({ event: 'messageDeleteBulk' })
    async messageDeleteBulk([messages]: ArgsOf<'messageDeleteBulk'>) {
        // Get the first message
        const firstMessage = messages.first();

        // Only handle bulk deletes in guilds
        if (!firstMessage?.guild?.id) return;

        // Check this feature is enabled
        if (!await isFeatureEnabled('AUDIT_LOG', messages.first()?.guild?.id)) return;

        // Get the audit logs
        const auditLogs = await this.getAuditLogs(firstMessage.guild);

        // Create the embed
        // TODO: #2:1h/dev Fix the rest of the embed
        const embed = new EmbedBuilder({
            // author: {
            //     name: firstMessage.author.username,
            //     icon_url: firstMessage.author.avatarURL() ?? undefined,
            // },
            title: `🗑️ ${messages.size} messages deleted in <#${firstMessage.channel.id}>`,
            // description: firstMessage.content ?? '',
            color: Colors.Red,
            // footer: {
            //     text: `Message ID: ${firstMessage.id}`
            // },
            timestamp: new Date().toISOString(),
        });

        // Send the message to the audit log channels
        for (const auditLog of auditLogs) {
            // Check if this action is ignored
            if (auditLog.ignoredActions?.includes('MESSAGE_BULK_DELETE')) continue;

            // Get the audit log channel
            const auditLogChannel = this.getAuditLogChannel(firstMessage.guild, auditLog.channelId);
            if (!auditLogChannel) continue;

            // Check if this is valid
            if (!this.isValid(auditLog, {
                channel: firstMessage.channel,
            })) continue;

            // Send the message
            await auditLogChannel.send({
                embeds: [embed]
            });
        }
    }
}
