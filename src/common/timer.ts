import { Logger } from '@app/logger';

const parseHrtimeToSeconds = (hrtime: [number, number]) => {
    const seconds = (hrtime[0] + (hrtime[1] / 1e9)).toFixed(3);
    return seconds;
};

export const createTimer = (scope: string) => {
    const startTime = process.hrtime();
    return () => {
        const seconds = parseHrtimeToSeconds(process.hrtime(startTime));
        new Logger({ service: 'Timer' }).info(`[${scope}] Took ${seconds} seconds.`);
    };
};
