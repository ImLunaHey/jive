import { GuildMember } from 'discord.js';

export const replaceVariables = (message: string, member: GuildMember): string => {
    return message
        .replace(/{{user}}/g, `<@${member.id}>`)
        .replace(/{{user.id}}/g, member.id)
        .replace(/{{user.tag}}/g, member.user.tag)
        .replace(/{{user.username}}/g, member.user.username)
        .replace(/{{user.discriminator}}/g, member.user.discriminator)
        .replace(/{{user.avatar}}/g, member.user.avatarURL() ?? '')
        .replace(/{{user.avatarURL}}/g, member.user.avatarURL() ?? '')
        .replace(/{{user.avatarURL.png}}/g, member.user.avatarURL({ extension: 'png' }) ?? '')
        .replace(/{{user.avatarURL.jpg}}/g, member.user.avatarURL({ extension: 'jpg' }) ?? '')
        .replace(/{{user.avatarURL.jpeg}}/g, member.user.avatarURL({ extension: 'jpeg' }) ?? '')
        .replace(/{{user.avatarURL.webp}}/g, member.user.avatarURL({ extension: 'webp' }) ?? '')
        .replace(/{{guild}}/g, `<@${member.guild.id}>`)
        .replace(/{{guild.id}}/g, member.guild.id)
        .replace(/{{guild.name}}/g, member.guild.name)
        .replace(/{{guild.icon}}/g, member.guild.iconURL() ?? '')
        .replace(/{{guild.iconURL}}/g, member.guild.iconURL() ?? '')
        .replace(/{{guild.iconURL.jpg}}/g, member.guild.iconURL({ extension: 'jpg' }) ?? '')
        .replace(/{{guild.iconURL.png}}/g, member.guild.iconURL({ extension: 'png' }) ?? '')
        .replace(/{{guild.iconURL.jpeg}}/g, member.guild.iconURL({ extension: 'jpeg' }) ?? '')
        .replace(/{{guild.iconURL.webp}}/g, member.guild.iconURL({ extension: 'webp' }) ?? '');
}