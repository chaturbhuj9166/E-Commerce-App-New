import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { config } from '../config.js';
import { HttpError } from '../lib/rules.js';
export function tokenFor(role, account) {
  return jwt.sign({ role, version: account.sessionVersion || 0 }, config.JWT_SECRET, { subject: account.id, expiresIn: '8h', audience: 'ntsa', issuer: 'ntsa-api' });
}
export async function auth(req, res, next) {
  try {
    let claims;
    try { claims = jwt.verify(req.headers.authorization?.replace(/^Bearer /, '') || '', config.JWT_SECRET, { audience: 'ntsa', issuer: 'ntsa-api', algorithms: ['HS256'] }); }
    catch { throw new HttpError(401, 'Please sign in again'); }
    // PACKING and SALES are admin-panel staff, so they live in the admin table.
    const model = { CUSTOMER: db.user, ADMIN: db.admin, PACKING: db.admin, SALES: db.admin, VENDOR: db.vendor, SELLER: db.seller }[claims.role];
    const account = model && await model.findUnique({ where: { id: claims.sub } });
    const blocked = account && ((claims.role === 'VENDOR' || claims.role === 'SELLER') && (!account.enabled || account.deleted))
      || (['ADMIN', 'PACKING', 'SALES'].includes(claims.role) && (!account?.enabled || account.role !== claims.role));
    if (!account || (claims.role !== 'CUSTOMER' && account.sessionVersion !== claims.version) || blocked) throw new HttpError(401, 'Account is unavailable');
    req.actor = { id: account.id, role: claims.role, account }; next();
  } catch (e) { next(e); }
}
export const roles = (...allowed) => (req, res, next) => allowed.includes(req.actor.role) ? next() : next(new HttpError(403, 'Access denied'));
