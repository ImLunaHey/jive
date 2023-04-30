import type { Interaction, Message, Partials } from 'discord.js';
import { Client } from 'discordx';
import { globalLogger } from '@app/logger';
import { env } from '@app/env';
import { DatabaseError } from '@planetscale/database';

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
    // See: https://github.com/microsoft/TypeScript/issues/13086
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
        globalLogger.info('Connected to discord', {
            username: client.user?.username,
        });

        // Make sure all guilds are in cache
        globalLogger.info('Fetching all guilds');
        await client.guilds.fetch();

        // init all application commands
        globalLogger.info('Initializing all application commands');
        await client.initApplicationCommands();

        globalLogger.info('Bot is ready', {
            username: client.user?.username,
        });
    });

    client.on('interactionCreate', (interaction: Interaction) => {
        try {
            client.executeInteraction(interaction);
        } catch (error: unknown) {
            globalLogger.error('Interaction error', { error });
        }
    });

    client.on('messageCreate', async (message: Message) => {
        await client.executeCommand(message);
    });

    client.on('error', (error: Error) => {
        globalLogger.error('Client error', error instanceof DatabaseError ? {
            error: {
                message: error.body.message,
                code: error.body.code,
            },
        } : { error });
    });

    // Save the client for later
    clients.set(name, client);

    // Give them the newly created client
    return client;
};