export const sleep = (ms: number) => new Promise<void>(resolve => {
    if (ms === 0) resolve();
    else setTimeout(resolve, ms);
});
