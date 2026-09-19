import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import { config } from './config.js';
import { db } from './db.js';
import { router } from './routes.js';
import { UPLOAD_DIR } from './services/storage.js';
export const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.CORS_ORIGIN.split(',') }));
app.use(express.json({ limit: '256kb' }));
// Dev-only: serves images saved by services/storage.js when Cloudinary
// isn't configured. Empty (and harmless) once real Cloudinary is set up.
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/api', rateLimit({ windowMs: 60000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));
app.get('/health', async (req, res) => { await db.$queryRaw`SELECT 1`; res.json({ status: 'ok', demo: config.DEMO_MODE }); });
app.use('/api', router);
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((error, req, res, next) => {
  if (error instanceof ZodError) return res.status(400).json({ error: error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') });
  if (error.code === 'P2002') return res.status(409).json({ error: 'This record or request already exists' });
  if (error.code === 'P2003') return res.status(409).json({ error: 'Referenced record is missing or still in use' });
  if (error.code === 'P2025') return res.status(404).json({ error: 'Record not found' });
  if (error.code === 'P2034') return res.status(409).json({ error: 'Concurrent change; please retry' });
  if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Images must be under 5 MB' });
  const status = error.status || 500;
  if (status >= 500) console.error(error.message);
  res.status(status).json({ error: status >= 500 ? 'Service unavailable; check server configuration and retry' : error.message });
});
