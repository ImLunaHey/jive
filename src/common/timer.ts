import { globalLogger } from '@app/logger';

const parseHrtimeToSeconds = (hrtime: [number, number]) => {
    var seconds = (hrtime[0] + (hrtime[1] / 1e9)).toFixed(3);
    return seconds;
};

export const createTimer = (scope: string) => {
    const startTime = process.hrtime();
    return () => {
        const seconds = parseHrtimeToSeconds(process.hrtime(startTime));
        globalLogger.info(`[${scope}] Took ${seconds} seconds.`, { scope });
    };
};