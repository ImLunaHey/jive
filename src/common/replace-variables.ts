import { Collection, Guild, GuildMember } from 'discord.js';
import { render } from 'squirrelly';

const transformMember = (member: GuildMember) => ({
    id: member.id,
    name: member.user.username,
    displayName: member.displayName,
    discriminator: member.user.discriminator,
    bot: member.user.bot
});

const transformGuild = (guild: Guild) => ({
    id: guild.id,
    name: guild.name,
    iconURL: guild.iconURL(),
    memberCount: guild.memberCount,
    roles: guild.roles.cache.reduce<{ [key: string]: { id: string; name: string; size: number } }>((roles, role) => {
        roles[role.id] = {
            id: role.id,
            name: role.name,
            size: role.members.size
        };
        return roles;
    }, {}),
    channels: guild.channels.cache.reduce<{ [key: string]: { id: string; name: string; size: number } }>((channels, channel) => {
        channels[channel.id] = {
            id: channel.id,
            name: channel.name,
            size: (channel.members as Collection<string, GuildMember>).size
        };
        return channels;
    }, {}),
    members: guild.members.cache.reduce<{ [key: string]: { id: string; name: string; displayName: string; discriminator: string; bot: boolean } }>((members, member) => {
        members[member.id] = transformMember(member);
        return members;
    }, {})
});

export const replaceVariablesForMember = async (message: string, member: GuildMember): Promise<string> => {
    await member.guild.channels.fetch();
    await member.guild.roles.fetch();
    await member.guild.members.fetch();

    return render(message, { guild: transformGuild(member.guild), member: transformMember(member) }, { useWith: true });
};

export const replaceVariablesForGuild = async (message: string, guild: Guild): Promise<string> => {
    await guild.channels.fetch();
    await guild.roles.fetch();
    await guild.members.fetch();

    return render(message, { guild: transformGuild(guild) }, { useWith: true });
};
