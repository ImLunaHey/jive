declare module 'simple-duration' {
    export function parse(input: string): number;
    export function stringify(seconds: number, rounding?: string): string;
    export function timeUnits(): {
        y: number;
        d: number;
        h: number;
        m: number;
        s: number;
        ms: number;
        µs: number;
        ns: number;
    };
}
