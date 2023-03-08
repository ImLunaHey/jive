import { Interaction, Message, Partials } from 'discord.js';
import { Client } from 'discordx';
import { globalLogger } from '@app/logger';
import { env } from '@app/env';
import { prisma } from '@app/common/prisma-client';

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
        globalLogger.info('Connected to discord as %s', client.user?.username);

        // Make sure all guilds are in cache
        globalLogger.info('Fetching all guilds');
        await client.guilds.fetch();

        // Add all guilds to the database
        globalLogger.info('Adding all guilds to the database');
        for (const guild of client.guilds.cache.values()) {
            await prisma.guild.upsert({
                where: {
                    id: guild.id,
                },
                update: {},
                create: {
                    id: guild.id
                }
            });
        }

        // init all application commands
        globalLogger.info('Initializing all application commands');
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