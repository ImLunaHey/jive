import { initCronJobs } from '@reflet/cron';
import { Jobs } from './jobs';

export { Feature } from './feature';
export { Jobs } from './jobs';

// Start background jobs
initCronJobs(Jobs).startAll();
