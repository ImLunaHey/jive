import type { Interaction, Message, Partials } from 'discord.js';
import { Client } from 'discordx';
import { Logger } from '@app/logger';
import { env } from '@app/env';
import { DatabaseError } from '@planetscale/database';
import { serializeError } from 'serialize-error';

const clients = new Map<string, Client>();

const parseDatabaseError = (error: DatabaseError) => {
    try {
        const targetArray = error.body.message.split(': ');

        return {
            type: targetArray[2].split(': ')[0],
            code: targetArray[2].match(/code = (\w+)/)?.[1],
            description: targetArray[2].match(/desc = (.+?) \(errno/)?.[1],
            errno: targetArray[2].match(/\(errno (\d+)\)/)?.[1],
            sqlstate: targetArray[2].match(/\(sqlstate (\w+)\)/)?.[1],
            callerID: targetArray[2].match(/\(CallerID: (.+)\):/)?.[1],
            sql: targetArray[2].match(/Sql: "(.+?)"/)?.[1].replace(/\`/g, "'"),
            bindVars: targetArray[2].match(/BindVars: {(.+?)}/)?.[1],
        };
    } catch { }

    return null;
};

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

    // Create logger instance
    const logger = new Logger({ service: 'discord-client' });

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
        logger.info('Connected to discord', {
            username: client.user?.username,
        });

        // Make sure all guilds are in cache
        logger.info('Fetching all guilds');
        await client.guilds.fetch();

        // init all application commands
        logger.info('Initializing all application commands');
        await client.initApplicationCommands();

        logger.info('Bot is ready', {
            username: client.user?.username,
        });
    });

    client.on('interactionCreate', (interaction: Interaction) => {
        try {
            client.executeInteraction(interaction);
        } catch (error: unknown) {
            logger.error('Interaction error', { error });
        }
    });

    client.on('messageCreate', async (message: Message) => {
        await client.executeCommand(message);
    });

    client.on('error', (error: Error) => {
        logger.error('Client error', error instanceof DatabaseError ? parseDatabaseError(error) : { error });
        console.error('Client error', error instanceof DatabaseError ? { error, parsedError: parseDatabaseError(error) } : serializeError(error));
    });

    // Save the client for later
    clients.set(name, client);

    // Give them the newly created client
    return client;
};

