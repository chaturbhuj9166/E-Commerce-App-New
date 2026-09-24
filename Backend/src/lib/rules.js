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
export function nextStatus(current, next) {
  return ({ PLACED: 'PACKED', PACKED: 'SHIPPED', SHIPPED: 'OUT_FOR_DELIVERY' })[current] === next;
}
