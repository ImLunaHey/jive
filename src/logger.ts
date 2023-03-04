import { env } from '@app/env';
import { Signale } from 'signale';

export const logger = new Signale({
    scope: 'app',
    disabled: env.NODE_ENV === 'test',
});