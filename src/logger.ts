import winston from 'winston';
import { WinstonTransport as AxiomTransport } from '@axiomhq/axiom-node';
import chalk from 'chalk';
import { name as botName } from '@app/../package.json';

export const globalLogger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: {
        botName,
    },
    transports: [
        // You can pass an option here, if you don't the transport is configured
        // using environment variables like `AXIOM_DATASET` and `AXIOM_TOKEN`
        new AxiomTransport(),
    ],
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

// Add the console logger if we're not in production
if (process.env.NODE_ENV != 'production') {
    globalLogger.add(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(({ service, level, message, timestamp }) => {
                    return `${new Date(timestamp as string).toLocaleTimeString('en')} [${(service as string) ?? 'app'}] [${colourLevel(level as keyof typeof logLevelColours)}]: ${message as string}`;
                }),
            ),
        }),
    );
}
