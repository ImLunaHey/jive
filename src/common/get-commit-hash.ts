import fs from 'fs';

const getHashFromDisk = () => {
    const fileContents = fs.readFileSync('.git/HEAD').toString();
    const rev = fileContents.trim().split(/.*[: ]/).slice(-1)[0];

    if (rev.indexOf('/') === -1) return rev;
    return fs.readFileSync('.git/' + rev).toString().trim();
};

let commitHash: string;
export const getCommitHash = () => {
    if (commitHash) return commitHash;
    commitHash = getHashFromDisk();
    return commitHash;
};
