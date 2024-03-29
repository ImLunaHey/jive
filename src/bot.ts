import 'reflect-metadata';
import { Logger } from '@app/logger';
import { environment } from '@app/environment';
import package_ from '../package.json';
import { client } from '@app/client';

const { name } = package_;

export const start = async () => {
    const logger = new Logger({ service: 'bot' });
    logger.info('Starting bot', {
        name,
        env: environment.NODE_ENV,
        logLevel: environment.LOG_LEVEL,
    });

    // Load all the events, commands and api
    await import('./features/audit-log');
    await import('./features/auto-delete');
    await import('./features/bot');
    await import('./features/custom-commands');
    await import('./features/debug');
    await import('./features/dynamic-channel-names');
    await import('./features/faq');
    // await import('./features/economy');
    await import('./features/games');
    await import('./features/invite-tracking');
    await import('./features/leveling');
    await import('./features/looking-for');
    await import('./features/moderation');
    await import('./features/purge');
    await import('./features/reddit');
    await import('./features/safety');
    await import('./features/starboard');
    await import('./features/stats');
    await import('./features/tools');
    await import('./features/verify');
    await import('./features/void');
    await import('./features/welcome');

    // Connect to the discord gateway
    await client.login(environment.BOT_TOKEN);
};
