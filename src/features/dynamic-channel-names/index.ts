import { initCronJobs } from '@reflet/cron';
import { Jobs } from './jobs';

// Start background jobs
initCronJobs(Jobs).startAll();

export { Feature } from './feature';