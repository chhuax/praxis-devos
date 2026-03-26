import os from 'os';

export const resolveUserHomeDir = () => process.env.HOME || process.env.USERPROFILE || os.homedir();
