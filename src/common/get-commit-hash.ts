import fs from 'node:fs';

const getHashFromDisk = () => {
    try {
        const fileContents = fs.readFileSync('.git/HEAD').toString();
        const revision = fileContents.trim().split(/.*[ :]/).at(-1);

        if (!revision?.includes('/')) return revision;
        return fs.readFileSync(`.git/${revision}`).toString().trim();
    } catch {}

    return null;
};

const getHashFromEnvironment = () => {
    return process.env.RAILWAY_GIT_COMMIT_SHA || null;
}

let commitHash: string;
export const getCommitHash = () => {
    if (commitHash) return commitHash;
    commitHash = (getHashFromEnvironment() ?? getHashFromDisk() ?? 'unknown').slice(0, 12);
    return commitHash;
};
