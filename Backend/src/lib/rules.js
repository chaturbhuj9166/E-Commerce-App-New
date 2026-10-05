export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function requireThat(condition, status, message) {
  if (!condition) throw new HttpError(status, message);
}
export const MAX_MONEY = 2_000_000_000;
export function totalFor(items) {
  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPaise, 0);
  requireThat(Number.isSafeInteger(total) && total > 0 && total <= MAX_MONEY, 400, 'Order total is outside the supported range');
  return total; 
}
export function checkLimits(total, limits) {
  requireThat(limits && total >= limits.minPaise && total <= limits.maxPaise, 400, 'Order total must be within your vendor limits');
}
export function eligible(item, order, now = new Date()) {
  return order.status === 'DELIVERED' && !!order.deliveredAt && !!item.refundExpiresAt &&
    new Date(item.refundExpiresAt) > now && !item.refund;
}
export function deadline(deliveredAt, hours) { return new Date(deliveredAt.getTime() + hours * 3600000); }
const DAY = 86400000;
// How many extra days a seller's holiday adds to a delivery promise: the days
// left until their holiday is meant to end, never negative, 0 if not away.
export function holidayExtraDays(seller, now = new Date()) {
  if (!seller?.onHoliday || !seller.holidayStart) return 0;
  const endsAt = new Date(seller.holidayStart).getTime() + (seller.holidayDays || 0) * DAY;
  return Math.max(0, Math.ceil((endsAt - now.getTime()) / DAY));
}
// A shop's products stay on the storefront for a 3-day grace after a holiday
// starts; past that, if the seller hasn't come back, they drop off.
export const HOLIDAY_GRACE_DAYS = 3;
export function holidayGraceCutoff(now = new Date()) { return new Date(now.getTime() - HOLIDAY_GRACE_DAYS * DAY); }
export function nextStatus(current, next) {
  return ({ PLACED: 'PACKED', PACKED: 'SHIPPED', SHIPPED: 'OUT_FOR_DELIVERY' })[current] === next;
}
