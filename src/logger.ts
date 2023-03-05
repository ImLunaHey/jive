import { env } from '@app/env';
import { Signale } from 'signales';

export const globalLogger = new Signale({
    scope: 'app',
    logLevel: env.LOG_LEVEL,
    disabled: env.NODE_ENV === 'test',
    config: {
        displayTimestamp: true,
        displayDate: false
    }
});