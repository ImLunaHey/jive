import { Interaction, Message, Partials } from 'discord.js';
import { Client } from 'discordx';
import { globalLogger } from '@app/logger';
import { env } from '@app/env';

const clients = new Map<string, Client>();

/**
 * Creates or returns a named discord.js client
 */
export const createDiscordClient = (name: string, { intents, partials, prefix }: {
    intents?: number[];
    partials?: Partials[];
    prefix?: string;
}): Client => {
    // If a client already exists with this name then return it
    if (clients.has(name)) return clients.get(name)!;

    // Create a discord.js client instance
    const client = new Client({
        simpleCommand: {
            prefix: prefix ?? '$'
        },
        intents: intents ?? [],
        partials: partials ?? [],
        botGuilds: env.NODE_ENV === 'production' ? undefined : [client => client.guilds.cache.map(guild => guild.id)],
    });

    client.once('ready', async () => {
        // Make sure all guilds are in cache
        await client.guilds.fetch();

        // init all application commands
        await client.initApplicationCommands();

        globalLogger.info('%s is ready', client.user?.username);
    });

    client.on('interactionCreate', (interaction: Interaction) => {
        client.executeInteraction(interaction);
    });

    client.on('messageCreate', (message: Message) => {
        client.executeCommand(message);
    });

    // Save the client for later
    clients.set(name, client);

    // Give them the newly created client
    return client;
};