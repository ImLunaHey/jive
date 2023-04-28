import fs from 'fs';

const getHashFromDisk = () => {
    try {
        const fileContents = fs.readFileSync('.git/HEAD').toString();
        const rev = fileContents.trim().split(/.*[: ]/).slice(-1)[0];

        if (rev.indexOf('/') === -1) return rev;
        return fs.readFileSync('.git/' + rev).toString().trim();
    } catch { }

    return null;
};

const getHashFromEnv = () => {
    return process.env.RAILWAY_GIT_COMMIT_SHA || null;
}

let commitHash: string;
export const getCommitHash = () => {
    if (commitHash) return commitHash;
    commitHash = (getHashFromEnv() ?? getHashFromDisk() ?? 'unknown').substring(0, 12);
    return commitHash;
};
