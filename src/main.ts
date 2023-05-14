import { start } from '@app/bot';
import { Logger } from '@app/logger';

const logger = new Logger({ service: 'bot' });

const logStats = () => {
    try {
        const memoryData = process.memoryUsage();
        const memoryUsage = {
            rss: memoryData.rss, // -> Resident Set Size - total memory allocated for the process execution`,
            heapTotal: memoryData.heapTotal, // -> total size of the allocated heap`,
            heapUsed: memoryData.heapUsed, // -> actual memory used during the execution`,
            external: memoryData.external, // -> V8 external memory`,
        };
        logger.info('Memory usage', { memoryUsage });
    } catch { }
};

// Log stats on startup
logStats();

// Log stats every minute
setInterval(() => {
    logStats();
}, 60_000);

start().catch((error: unknown) => {
    if (!(error instanceof Error)) throw new Error(`Unknown error "${String(error)}"`);
    logger.error('Failed to load bot', {
        error,
    });
    process.exit(1);
});
