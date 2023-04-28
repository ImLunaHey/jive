import { Jobs } from '@app/features/stats/jobs';
import { initCronJobs } from '@reflet/cron';

// Start background jobs
initCronJobs(Jobs).startAll();

export { Feature } from './feature';
