export const emojiBar = (progress: number, options?: {
    bars?: {
        full: {
            start: string;
            bar: string;
            end: string;
        };
        empty: {
            start: string;
            bar: string;
            end: string;
        };
    };
    maxValue?: number;
    size?: number;
}) => {
    const bars = options?.bars ?? {
        full: {
            start: '<:lb_g:1083768174383726673>',
            bar: '<:l_g:1083768215324340344>',
            end: '<:lb4_g:1083768231346577509>',
        },
        empty: {
            start: '<:lb2_g:1083768151629635604>',
            bar: '<:l2_g:1083768196236050442>',
            end: '<:lb3_g:1083768245489778798>',
        },
    };
    const maxValue = options?.maxValue ?? 100;
    const size = options?.size ?? 5;
    const bar = [];
    const full = Math.round(size * (progress / maxValue > 1 ? 1 : progress / maxValue));
    const empty = size - full > 0 ? size - full : 0;
    for (let index = 1; index <= full; index++) bar.push(bars.full.bar);
    for (let index = 1; index <= empty; index++) bar.push(bars.empty.bar);
    bar[0] = bar[0] == bars.full.bar ? bars.full.start : bars.empty.start;
    bar[bar.length - 1] = bar.at(-1) === bars.full.bar ? bars.full.end : bars.empty.end;
    return bar.join('');
};
