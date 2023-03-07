import { globalLogger } from '@app/logger';
import { Collection, Colors, Guild, GuildMember, MessageCreateOptions } from 'discord.js';
import { readFileSync } from 'fs';
import { NodeVM } from 'vm2';

// This is the compiled version of the Squirrelly library, which is used to render the templates.
// Without it being compiled, it wouldn't be possible to run it in a sandbox.
const getSquirrelly = readFileSync('./squirrelly.js', 'utf8');

const renderTemplate = (template: string, data: Record<string, unknown>): string => {
    // Create a new locked-down VM
    const vm = new NodeVM({
        timeout: 2_000, // After 2s the script will be terminated
        allowAsync: false, // Disable async functions
        eval: true, // Enable eval (required for Squirrelly)
        wasm: false, // Disable WebAssembly
        require: false, // Disable require
        nesting: false, // Disable nesting
        console: 'off', // Disable console
        sandbox: { // The variables that are available in the script
            process: {
                env: {
                    NODE_ENV: process.env.NODE_ENV // Give access to just the NODE_ENV variable
                }
            }
        },
    });

    // Freeze the template and data to prevent them from being modified
    vm.freeze({ template, data }, 'args');

    // Run the script
    const result = vm.run(`
        ${getSquirrelly}
        const Sqrl = getSquirrelly();
        Sqrl.defaultConfig.autoEscape = false;

        Sqrl.filters.define('reverse', (data) => {
            if (typeof data === 'string') return data.split('').reverse().join('');
            if (Array.isArray(data)) return data.reverse();
            return data;
        });
        
        Sqrl.filters.define('random', (data) => {
            if (Array.isArray(data)) return data[Math.floor(Math.random() * data.length)];
            if (typeof data === 'string') return data[Math.floor(Math.random() * data.length)];
            return data;
        });

        let output;

        try {
            output = String(Sqrl.render(args.template, args.data, { useWith: true }));
        } catch {
            output = 'Failed to render message, please contact <@784365843810222080>.';
        }

        module.exports = output;
    `);

    if (typeof result !== 'string') {
        globalLogger.scope('replaceVariables').error('Failed to render message, recieved non-string result.');
        return 'Failed to render message, please contact <@784365843810222080>.';
    }

    return result;
};

const transformMember = (member: GuildMember) => ({
    id: member.id,
    tag: `<@${member.id}>`,
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
    try {
        await member.guild.channels.fetch();
        await member.guild.roles.fetch();
        await member.guild.members.fetch();

        return renderTemplate(message, { guild: transformGuild(member.guild), member: transformMember(member) });
    } catch {
        return 'Failed to render message, please contact <@784365843810222080>.';
    }
};

export const replaceVariablesForGuild = async (message: string, guild: Guild): Promise<string> => {
    try {
        await guild.channels.fetch();
        await guild.roles.fetch();
        await guild.members.fetch();

        return renderTemplate(message, { guild: transformGuild(guild) });
    } catch {
        return 'Failed to render message, please contact <@784365843810222080>.';
    }
};

export const templateResultToMessage = (result: string): MessageCreateOptions => {
    try {
        return JSON.parse(result);
    } catch {
        return {
            embeds: [{
                title: 'Failed to render message',
                description: 'Please contact <@784365843810222080>.',
                color: Colors.Red,
            }]
        };
    }
};