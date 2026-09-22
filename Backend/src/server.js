import cron from 'node-cron';
import { app } from './app.js';
import { config } from './config.js';
import { db } from './db.js';
import { expireJobs } from './services/orders.js';
await db.$connect();
const job = cron.schedule('*/2 * * * *', () => expireJobs().catch(e => console.error('Expiry job failed:', e.message)), { noOverlap: true });
// Render's free plan puts the service to sleep after 15 idle minutes, making
// the next visitor wait ~1 minute. Pinging our own public URL (Render sets
// RENDER_EXTERNAL_URL; it goes through Render's proxy so it counts as traffic)
// keeps it awake. Only runs on Render; set KEEP_ALIVE=false there to stop it.
const keepAliveUrl = process.env.KEEP_ALIVE !== 'false' && process.env.RENDER_EXTERNAL_URL;
const keepAlive = keepAliveUrl && cron.schedule('*/10 * * * *', () => fetch(`${keepAliveUrl}/health`).catch(e => console.warn('Keep-alive ping failed:', e.message)));
const server = app.listen(config.PORT, () => console.log(`NTSA API listening on http://localhost:${config.PORT}${config.DEMO_MODE ? ' (LOCAL DEMO)' : ''}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  job.stop(); if (keepAlive) keepAlive.stop(); server.close(async () => { await db.$disconnect(); process.exit(0); });
});
