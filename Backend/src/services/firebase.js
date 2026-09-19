import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import { HttpError } from '../lib/rules.js';
function app() {
  if (!process.env.FIREBASE_PROJECT_ID) throw new HttpError(503, 'Firebase is not configured');
  return getApps()[0] || initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') }) });
}
export async function verifyCustomer(token) {
  try { return await getAuth(app()).verifyIdToken(token, true); }
  catch (e) { if (e.status) throw e; throw new HttpError(401, 'Invalid or expired Firebase token'); }
}
export async function notifyOrder(user, order) {
  if (!user?.fcmToken || !process.env.FIREBASE_PROJECT_ID) return;
  try { await getMessaging(app()).send({ token: user.fcmToken, notification: { title: 'NTSA order update', body: `Your order is ${order.status.toLowerCase().replaceAll('_', ' ')}` }, data: { orderId: order.id } }); }
  catch { console.warn('FCM notification failed for order', order.id); }
}
