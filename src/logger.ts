import winston from 'winston';
import { WinstonTransport as AxiomTransport } from '@axiomhq/axiom-node';
import chalk from 'chalk';
import * as pkg from '@app/../package.json';
import { serializeError } from 'serialize-error';
import { getCommitHash } from '@app/common/get-commit-hash';

export const globalLogger = winston.createLogger({
    level: 'info',
    format: winston.format.json({
        replacer(_key: string, value: unknown) {
            return serializeError(value);
        },
    }),
    defaultMeta: {
        botName: pkg.name,
        pid: process.pid,
        commitHash: getCommitHash(),
    },
    transports: [],
});

const logLevelColours = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    verbose: 'blue',
    debug: 'magenta',
} as const;

const colourLevel = (level: keyof typeof logLevelColours) => {
    const colour = logLevelColours[level];
    return chalk[colour](level);
};

if (process.env.NODE_ENV === 'test') {
    globalLogger.silent = true;
}

if (process.env.AXIOM_TOKEN) {
    globalLogger.add(new AxiomTransport());
}

declare const splatSymbol: unique symbol;

type Meta = {
    [splatSymbol]: unknown[];
};

const formatMeta = (meta: Meta) => {
    const splat = meta[Symbol.for('splat') as typeof splatSymbol];
    if (splat && splat.length) return splat.length === 1 ? JSON.stringify(splat[0]) : JSON.stringify(splat);
    return '';
};

// Add the console logger if we're not running tests and there are no transports
if (process.env.NODE_ENV !== 'test' && globalLogger.transports.length === 0) {
    globalLogger.add(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(({ service, level, message, timestamp, ...meta }) => {
                    return `${new Date(timestamp as string).toLocaleTimeString('en')} [${(service as string) ?? 'app'}] [${colourLevel(level as keyof typeof logLevelColours)}]: ${message as string} ${formatMeta(meta as Meta)}`;
                }),
            ),
        }),
    );
}