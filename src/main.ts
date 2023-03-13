import { start } from '@app/bot';
import { globalLogger } from '@app/logger';

start().catch((error: unknown) => {
    if (!(error instanceof Error)) throw new Error(`Unknown error "${String(error)}"`);
    globalLogger.error('Failed to load bot with "%s"\n%s', error.message, error.stack);
    process.exit(1);
});
