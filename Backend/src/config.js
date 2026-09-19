import 'dotenv/config';
import { z } from 'zod';
export const config = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000), DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32), CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DEMO_MODE: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),
}).parse(process.env);
if (config.NODE_ENV === 'production' && (config.DEMO_MODE || config.JWT_SECRET.includes('replace-this'))) {
  throw new Error('Production requires a private JWT secret and DEMO_MODE=false');
}
