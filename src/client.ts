import { IntentsBitField, Partials } from 'discord.js';
import { createDiscordClient } from './common/discord-client.js';
import pkg from '../package.json';

const { name } = pkg;

export const client = createDiscordClient(name, {
    intents: [
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.MessageContent,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.GuildMember,
        Partials.User
    ],
    prefix: `$${name}`
});
