import { start } from '@app/bot';
import { globalLogger } from '@app/logger';

const logger = globalLogger.child({ service: 'bot' });

start().catch((error: unknown) => {
    if (!(error instanceof Error)) throw new Error(`Unknown error "${String(error)}"`);
    logger.error('Failed to load bot', {
        error,
    });
    process.exit(1);
});
