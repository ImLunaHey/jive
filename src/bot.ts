import 'reflect-metadata';
import { globalLogger } from '@app/logger';
import { env } from '@app/env';
import pkg from '../package.json';
import { client } from '@app/client';

const { name } = pkg;

export const start = async () => {
    const logger = globalLogger.child({ service: 'bot' });
    logger.info('Starting bot', {
        name,
        env: env.NODE_ENV,
        logLevel: env.LOG_LEVEL,
    });

    // Load all the events, commands and api
    await import('./features/audit-log');
    await import('./features/auto-delete');
    await import('./features/custom-commands');
    await import('./features/debug');
    await import('./features/dynamic-channel-names');
    // await import('./features/economy');
    await import('./features/features');
    await import('./features/invite-tracking');
    await import('./features/leveling');
    await import('./features/looking-for');
    await import('./features/moderation');
    await import('./features/purge');
    await import('./features/reddit');
    await import('./features/safety');
    await import('./features/setup');
    await import('./features/starboard');
    await import('./features/stats');
    await import('./features/verify');
    await import('./features/void');
    await import('./features/welcome');

    // Connect to the discord gateway
    await client.login(env.BOT_TOKEN);
};
