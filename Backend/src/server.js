import cron from 'node-cron';
import { app } from './app.js';
import { config } from './config.js';
import { db } from './db.js';
import { expireJobs } from './services/orders.js';
await db.$connect();
const job = cron.schedule('*/2 * * * *', () => expireJobs().catch(e => console.error('Expiry job failed:', e.message)), { noOverlap: true });
const server = app.listen(config.PORT, () => console.log(`NTSA API listening on http://localhost:${config.PORT}${config.DEMO_MODE ? ' (LOCAL DEMO)' : ''}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  job.stop(); server.close(async () => { await db.$disconnect(); process.exit(0); });
});
