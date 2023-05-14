import winston, { format, type Logger as WinstonLogger, createLogger } from 'winston';
import { WinstonTransport as AxiomTransport } from '@axiomhq/axiom-node';
import chalk from 'chalk';
import * as pkg from '@app/../package.json';
import { getCommitHash } from '@app/common/get-commit-hash';

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

declare const splatSymbol: unique symbol;

type Meta = {
    [splatSymbol]: unknown[];
};

const formatMeta = (meta: Meta) => {
    const splat = meta[Symbol.for('splat') as typeof splatSymbol];
    if (splat && splat.length) return splat.length === 1 ? JSON.stringify(splat[0]) : JSON.stringify(splat);
    return '';
};

type Options = {
    service: string;
}

export class Logger {
    private logger: WinstonLogger;

    constructor(options: Options) {
        this.logger = createLogger({
            level: 'info',
            format: format.combine(
                format.errors({ stack: true }),
                format.json()
            ),
            defaultMeta: {
                botName: pkg.name,
                pid: process.pid,
                commitHash: getCommitHash(),
                service: options.service,
            },
            transports: [],
        });

        // Don't log while running tests
        // This allows the methods to still be hooked
        // while not messing up the test output
        if (process.env.NODE_ENV === 'test') {
            this.logger.silent = true;
        }

        // Use Axiom for logging if a token is provided
        if (process.env.AXIOM_TOKEN) {
            this.logger.add(new AxiomTransport());
        }

        // Add the console logger if we're not running tests and there are no transports
        if (process.env.NODE_ENV !== 'test' && this.logger.transports.length === 0) {
            this.logger.add(
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.printf(({ service, level, message, timestamp, ...meta }) => {
                            const formattedDate = new Date(timestamp as string).toLocaleTimeString('en');
                            const serviceName = (service as string) ?? 'app';
                            const formattedLevel = colourLevel(level as keyof typeof logLevelColours);
                            const formattedMeta = formatMeta(meta as Meta);
                            return `${formattedDate} [${serviceName}] [${formattedLevel}]: ${message as string} ${formattedMeta}`;
                        }),
                    ),
                }),
            );
        }
    }

    debug(message: string, meta?: Record<string, unknown>) {
        this.logger.debug(message, meta);
    }

    info(message: string, meta?: Record<string, unknown>) {
        this.logger.info(message, meta);
    }

    warn(message: string, meta?: Record<string, unknown>) {
        this.logger.warn(message, meta);
    }

    error(message: string, meta?: { error: unknown, cause?: unknown } & Record<string, unknown>) {
        // If the error isn't an error object make it so
        // This is to prevent issues where something other than an Error is thrown
        // When passing this to transports like Axiom it really needs to be a real Error class
        if (meta?.error && !(meta?.error instanceof Error)) meta.error = new Error(`Unknown Error: ${String(meta.error)}`);
        this.logger.error(message, meta);
    }
}
