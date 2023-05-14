import type { Interaction, Message, Partials, Client as DiscordClient } from 'discord.js';
import { Client } from 'discordx';
import { Logger } from '@app/logger';
import { env } from '@app/env';
import { outdent } from 'outdent';

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

    // Create logger instance
    const logger = new Logger({ service: 'discord-client' });

    // Create a discord.js client instance
    const discordXClient = new Client({
        simpleCommand: {
            prefix: prefix ?? '$'
        },
        intents: intents ?? [],
        partials: partials ?? [],
        botGuilds: env.NODE_ENV === 'production' ? undefined : [client => client.guilds.cache.map(guild => guild.id)],
    });

    discordXClient.once('ready', async (client: DiscordClient<true>) => {
        try {
            logger.info('Connected to discord', {
                username: client.user?.username,
            });

            // Make sure all guilds are in cache
            logger.info('Fetching all guilds');
            await client.guilds.fetch();

            // init all application commands
            logger.info('Initializing all application commands');
            await discordXClient.initApplicationCommands();

            const totalMemberCount = client.guilds.cache.reduce((userCount, guild) => userCount + guild.memberCount, 0);
            const totalGuildCount = client.guilds.cache.size;
            const botVerified = client.user.flags?.has('VerifiedBot');
            const botPresence = client.user.presence.status;
            const botStatus = client.user.presence.activities[0]?.name;

            // Log bot info
            console.info(outdent`
                > Total members: ${totalMemberCount.toLocaleString()}
                > Total guilds: ${totalGuildCount.toLocaleString()}
                > Discord Verified: ${botVerified ? 'Yes' : 'No'}
                > Presence: ${botPresence}
                > Status: ${botStatus}`
            );
            logger.info('Bot is ready', {
                totalMemberCount,
                totalGuildCount,
                botVerified,
                botPresence,
                botStatus,
            });
        } catch (error: unknown) {
            logger.error('Failed handling "ready" event.', { error });
        }
    });

    discordXClient.on('interactionCreate', async (interaction: Interaction) => {
        try {
            await discordXClient.executeInteraction(interaction);
        } catch (error: unknown) {
            logger.error('Interaction error', { error });
        }
    });

    discordXClient.on('messageCreate', async (message: Message) => {
        await discordXClient.executeCommand(message);
    });

    discordXClient.on('error', (error: Error) => {
        logger.error('Client error', { error });
    });

    // Save the client for later
    clients.set(name, discordXClient);

    // Give them the newly created client
    return discordXClient;
};
