import Razorpay from 'razorpay';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { requireThat } from '../lib/rules.js';
export function gateway() {
  requireThat(process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') && process.env.RAZORPAY_KEY_SECRET, 503, 'Razorpay test credentials are not configured');
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
}
export function validSignature(orderId, paymentId, signature, secret) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
