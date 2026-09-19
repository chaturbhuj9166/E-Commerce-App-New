import { PrismaClient } from '@prisma/client';
export const db = new PrismaClient();
export async function atomic(work) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try { return await db.$transaction(work, { isolationLevel: 'Serializable', timeout: 15000 }); }
    catch (e) { if (e.code !== 'P2034' || attempt === 3) throw e; }
  }
}
