import 'reflect-metadata';
import { globalLogger } from '@app/logger';
import { env } from '@app/env';
import pkg from '../package.json';
import { client } from '@app/client';

const { name } = pkg;

const main = async () => {
    globalLogger.info('Starting "%s" in "%s" mode.', name, env.NODE_ENV);

    // Load all the events, commands and api
    await import('./features/audit-log');
    await import('./features/auto-roles');
    await import('./features/debug');
    await import('./features/dynamic-channel-names');
    await import('./features/economy');
    await import('./features/invite-tracking');
    await import('./features/leveling');
    await import('./features/moderation');
    await import('./features/void');
    await import('./features/welcome');

    // Connect to the discord gateway
    await client.login(env.BOT_TOKEN);
};

main().catch(async (error: unknown) => {
    if (!(error instanceof Error)) throw new Error(`Unknown error "${error}"`);
    globalLogger.error('Failed to load bot with "%s"\n%s', error.message, error.stack);
});
