import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { db, atomic } from '../db.js';
import { config } from '../config.js';
import { checkLimits, deadline, eligible, nextStatus, requireThat, totalFor, MAX_MONEY } from '../lib/rules.js';
import { checkoutSchema } from '../lib/validation.js';
import { variantFor, priceFor } from '../lib/variants.js';
import { notifyOrder } from './firebase.js';
export const orderInclude = { items: { include: { refund: true } } };
export const ownerWhere = actor => actor.role === 'ADMIN' ? {} : actor.role === 'CUSTOMER' ? { userId: actor.id } : { vendorId: actor.id };
export function publicOrder(order) {
  const { deliveryOtpHash, deliveryOtpExpiresAt, deliveryOtpAttempts, ...safe } = order;
  safe.items = safe.items.map(item => ({ ...item, refundEligible: eligible(item, order) }));
  safe.refundEligible = safe.items.some(item => item.refundEligible);
  return safe;
}
export async function ownedOrder(actor, id, client = db) {
  const order = await client.order.findFirst({ where: { id, ...ownerWhere(actor) }, include: orderInclude });
  requireThat(order, 404, 'Order not found'); return order;
}
/// What delivery costs for a given goods total: the tightest slab the order
/// falls under (so a 80-rupee order pays the "below 100" rate, not the
/// "below 500" one). Above every slab, delivery is free.
export async function deliveryChargeFor(goodsPaise, client = db) {
  const rules = await client.deliveryRule.findMany({ where: { belowPaise: { gt: goodsPaise } }, orderBy: { belowPaise: 'asc' }, take: 1 });
  return rules[0]?.chargePaise ?? 0;
}
export async function checkout(actor, input) {
  const data = checkoutSchema.parse(input);
  requireThat(data.paymentMethod !== 'DEMO' || config.DEMO_MODE, 400, 'Demo payments are disabled');
  requireThat(actor.role === 'CUSTOMER' || data.paymentMethod !== 'WALLET', 400, 'Vendor wallet payments are unavailable');
  return atomic(async tx => {
    const existing = await tx.order.findUnique({ where: { checkoutKey: data.checkoutKey }, include: orderInclude });
    if (existing) {
      requireThat(existing.userId === actor.id || existing.vendorId === actor.id, 409, 'Checkout key already used');
      return publicOrder(existing);
    }
    let address = data.address;
    if (actor.role === 'CUSTOMER') {
      address = await tx.address.findFirst({ where: { id: data.addressId || '', userId: actor.id } });
      requireThat(address, 400, 'Select one of your delivery addresses');
    }
    requireThat(address, 400, 'A delivery address is required');
    // Areas blocked for repeated fraud can't be ordered to at all.
    requireThat(!await tx.blockedPincode.findUnique({ where: { pincode: address.postalCode } }), 400, `We are not delivering to PIN code ${address.postalCode} right now`);
    // Wholesale-only stock stays out of the shopping app, and retail-only
    // stock out of the wholesale portal, at checkout as well as in the lists.
    const forSale = actor.role === 'VENDOR' ? ['WHOLESALE', 'BOTH'] : ['RETAIL', 'BOTH'];
    const products = await tx.product.findMany({ where: { id: { in: data.items.map(i => i.productId) }, active: true, audience: { in: forSale } } });
    const items = data.items.map(i => {
      const p = products.find(p => p.id === i.productId);
      requireThat(p && p.stock >= i.quantity, 409, 'A product is unavailable or has insufficient stock');
      // Customers and wholesale buyers alike must pick every option.
      const { size, color } = variantFor(p, i.size, i.color);
      const price = priceFor(p, size);
      return { productId: p.id, quantity: i.quantity, name: p.name, size: size || null, color: color || null, unitPaise: actor.role === 'VENDOR' ? price.wholesalePaise : price.pricePaise, refundWindowHours: p.refundWindowHours };
    });
    const subtotalPaise = totalFor(items);
    if (actor.role === 'VENDOR') {
      const vendor = await tx.vendor.findUnique({ where: { id: actor.id }, include: { limits: true } });
      requireThat(vendor?.enabled && !vendor.deleted, 403, 'Vendor account disabled');
      checkLimits(subtotalPaise, vendor.limits);
    }
    // Wholesale pricing is already discounted, so retail coupons only apply
    // to customer checkouts.
    let discountPaise = 0;
    if (data.couponCode && actor.role === 'CUSTOMER') {
      const coupon = await tx.coupon.findUnique({ where: { code: data.couponCode } });
      requireThat(coupon && coupon.active, 400, 'Invalid or expired coupon');
      requireThat(!coupon.expiresAt || coupon.expiresAt > new Date(), 400, 'This coupon has expired');
      requireThat(coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit, 400, 'This coupon has been fully redeemed');
      requireThat(subtotalPaise >= coupon.minOrderPaise, 400, `This coupon needs a minimum order of ${(coupon.minOrderPaise / 100).toFixed(2)}`);
      discountPaise = coupon.discountType === 'PERCENT' ? Math.floor((subtotalPaise * coupon.value) / 100) : coupon.value;
      if (coupon.maxDiscountPaise) discountPaise = Math.min(discountPaise, coupon.maxDiscountPaise);
      discountPaise = Math.min(discountPaise, subtotalPaise);
      const claimed = await tx.coupon.updateMany({ where: { id: coupon.id, usageLimit: coupon.usageLimit === null ? undefined : { gt: coupon.usedCount } }, data: { usedCount: { increment: 1 } } });
      requireThat(claimed.count === 1, 409, 'This coupon was just redeemed by someone else; please retry');
    }
    // Delivery is charged on what the buyer actually pays for the goods.
    const goodsPaise = subtotalPaise - discountPaise;
    const deliveryPaise = await deliveryChargeFor(goodsPaise, tx);
    const totalPaise = goodsPaise + deliveryPaise;
    for (const item of items) {
      const changed = await tx.product.updateMany({ where: { id: item.productId, active: true, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
      requireThat(changed.count === 1, 409, 'Stock changed; please try again');
    }
    const order = await tx.order.create({ data: {
      ...ownerWhere(actor), address: JSON.parse(JSON.stringify(address)), checkoutKey: data.checkoutKey,
      paymentMethod: data.paymentMethod, totalPaise, deliveryPaise, discountPaise, couponCode: discountPaise > 0 ? data.couponCode : null,
      status: data.paymentMethod === 'RAZORPAY' ? 'PENDING_PAYMENT' : 'PLACED',
      items: { create: items },
    }, include: orderInclude });
    // Ordered items leave the customer's saved cart in the same transaction.
    if (actor.role === 'CUSTOMER') await tx.cartItem.deleteMany({ where: { userId: actor.id, OR: items.map(i => ({ productId: i.productId, size: i.size ?? '', color: i.color ?? '' })) } });
    if (data.paymentMethod === 'WALLET') {
      const wallet = await tx.wallet.findUnique({ where: { userId: actor.id } });
      requireThat(wallet, 400, 'Wallet not found');
      const changed = await tx.wallet.updateMany({ where: { id: wallet.id, balancePaise: { gte: totalPaise } }, data: { balancePaise: { decrement: totalPaise } } });
      requireThat(changed.count === 1, 400, 'Insufficient wallet balance');
      await tx.walletTransaction.create({ data: { walletId: wallet.id, amountPaise: -totalPaise, kind: 'PURCHASE', reference: `purchase:${order.id}` } });
    }
    return publicOrder(order);
  });
}
// Cancelling puts everything back: stock, the coupon's redemption and, for a
// wallet order, the money. A buyer may cancel until it has been packed; the
// admin can still cancel a packed or shipped order that comes back.
export const CANCELLABLE_BY_BUYER = ['PENDING_PAYMENT', 'PLACED'];
export async function cancelOrder(actor, id, reason) {
  const order = await atomic(async tx => {
    const current = actor.role === 'ADMIN'
      ? await tx.order.findUnique({ where: { id }, include: orderInclude })
      : await ownedOrder(actor, id, tx);
    requireThat(current, 404, 'Order not found');
    requireThat(current.status !== 'CANCELLED', 409, 'This order is already cancelled');
    requireThat(current.status !== 'DELIVERED', 400, 'A delivered order cannot be cancelled; ask for a refund instead');
    requireThat(actor.role === 'ADMIN' || CANCELLABLE_BY_BUYER.includes(current.status), 400, 'This order is already being packed; please contact support');
    for (const item of current.items) await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
    if (current.couponCode) await tx.coupon.updateMany({ where: { code: current.couponCode, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
    // A wallet order was paid the moment it was placed, so give it back.
    if (current.paymentMethod === 'WALLET' && current.userId) {
      const wallet = await tx.wallet.findUnique({ where: { userId: current.userId } });
      if (wallet) {
        await tx.wallet.update({ where: { id: wallet.id }, data: { balancePaise: { increment: current.totalPaise } } });
        await tx.walletTransaction.create({ data: { walletId: wallet.id, amountPaise: current.totalPaise, kind: 'REFUND', reference: `cancel:${current.id}` } });
      }
    }
    return tx.order.update({
      where: { id: current.id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: actor.role, cancelReason: reason || null, refundEligible: false },
      include: orderInclude,
    });
  });
  await notifyOrder(order.userId && await db.user.findUnique({ where: { id: order.userId } }), order);
  return publicOrder(order);
}
export async function changeStatus(id, status) {
  const order = await atomic(async tx => {
    const order = await tx.order.findUnique({ where: { id }, include: orderInclude });
    requireThat(order, 404, 'Order not found');
    requireThat(nextStatus(order.status, status), 400, 'Invalid status transition; delivery requires OTP');
    return tx.order.update({ where: { id }, data: { status }, include: orderInclude });
  });
  await notifyOrder(order.userId && await db.user.findUnique({ where: { id: order.userId } }), order);
  return publicOrder(order);
}
function otpHash(id, otp) { return createHmac('sha256', config.JWT_SECRET).update(`${id}:${otp}`).digest('hex'); }
export async function deliveryCode(actor, id) {
  const otp = String(randomInt(100000, 1000000));
  await atomic(async tx => {
    const order = await ownedOrder(actor, id, tx);
    requireThat(order.status === 'OUT_FOR_DELIVERY', 400, 'OTP is available only when out for delivery');
    requireThat(!order.deliveryOtpExpiresAt || order.deliveryOtpExpiresAt <= new Date(), 429, 'An OTP is already active. It expires after 15 minutes');
    await tx.order.update({ where: { id }, data: { deliveryOtpHash: otpHash(id, otp), deliveryOtpExpiresAt: new Date(Date.now() + 15 * 60000), deliveryOtpAttempts: 0 } });
  });
  return { otp, expiresInSeconds: 900 };
}
export async function deliver(id, otp) {
  const result = await atomic(async tx => {
    const order = await tx.order.findUnique({ where: { id }, include: orderInclude });
    requireThat(order && order.status === 'OUT_FOR_DELIVERY', 400, 'Order is not out for delivery');
    requireThat(order.deliveryOtpHash && order.deliveryOtpExpiresAt > new Date() && order.deliveryOtpAttempts < 5, 400, 'OTP expired or locked; ask recipient for a new OTP');
    if (!timingSafeEqual(Buffer.from(order.deliveryOtpHash, 'hex'), Buffer.from(otpHash(id, otp), 'hex'))) {
      await tx.order.update({ where: { id }, data: { deliveryOtpAttempts: { increment: 1 } } });
      return null;
    }
    const deliveredAt = new Date();
    for (const item of order.items) await tx.orderItem.update({ where: { id: item.id }, data: { refundExpiresAt: deadline(deliveredAt, item.refundWindowHours), refundEligible: item.refundWindowHours > 0 } });
    return tx.order.update({ where: { id }, data: { status: 'DELIVERED', deliveredAt, refundEligible: order.items.some(i => i.refundWindowHours > 0), deliveryOtpHash: null, deliveryOtpExpiresAt: null }, include: orderInclude });
  });
  requireThat(result, 400, 'Incorrect delivery OTP');
  await notifyOrder(result.userId && await db.user.findUnique({ where: { id: result.userId } }), result);
  return publicOrder(result);
}
export async function requestRefund(actor, itemId, reason) {
  return atomic(async tx => {
    const item = await tx.orderItem.findUnique({ where: { id: itemId }, include: { order: true, refund: true } });
    requireThat(item?.order.userId === actor.id, 404, 'Order item not found');
    requireThat(eligible(item, item.order), 400, 'Refund window has expired or a request already exists');
    const refund = await tx.refund.create({ data: { orderItemId: itemId, reason } });
    await tx.orderItem.update({ where: { id: itemId }, data: { refundEligible: false } });
    await syncEligibility(tx, item.orderId);
    return refund;
  });
}
export async function syncEligibility(tx, orderId) {
  const count = await tx.orderItem.count({ where: { orderId, refundEligible: true, refundExpiresAt: { gt: new Date() }, refund: null } });
  await tx.order.update({ where: { id: orderId }, data: { refundEligible: count > 0 } });
}
export async function reviewRefund(id, status) {
  return atomic(async tx => {
    const refund = await tx.refund.findUnique({ where: { id }, include: { orderItem: { include: { order: true } } } });
    requireThat(refund, 404, 'Refund not found');
    requireThat(refund.status === 'REQUESTED', 409, 'Refund already reviewed');
    if (status === 'APPROVED') {
      const item = refund.orderItem;
      const wallet = await tx.wallet.findUnique({ where: { userId: item.order.userId } });
      const amountPaise = item.quantity * item.unitPaise;
      requireThat(wallet && wallet.balancePaise + amountPaise <= MAX_MONEY, 409, 'Wallet balance limit reached');
      await tx.wallet.update({ where: { id: wallet.id }, data: { balancePaise: { increment: amountPaise } } });
      await tx.walletTransaction.create({ data: { walletId: wallet.id, amountPaise, kind: 'REFUND', reference: `refund:${id}` } });
    }
    return tx.refund.update({ where: { id }, data: { status, reviewedAt: new Date() } });
  });
}
export async function expireJobs(now = new Date()) {
  await atomic(async tx => {
    await tx.orderItem.updateMany({ where: { refundEligible: true, refundExpiresAt: { lte: now } }, data: { refundEligible: false } });
    await tx.order.updateMany({ where: { refundEligible: true, items: { none: { refundEligible: true } } }, data: { refundEligible: false } });
    // Release unpaid reservations. Serializable transactions prevent payment/expiry races.
    const stale = await tx.order.findMany({ where: { status: 'PENDING_PAYMENT', createdAt: { lt: new Date(now.getTime() - 30 * 60000) } }, include: { items: true } });
    for (const order of stale) {
      for (const item of order.items) await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      // Give the coupon's redemption back too, or a limited coupon slowly
      // burns through on orders that were never paid for.
      if (order.couponCode) await tx.coupon.updateMany({ where: { code: order.couponCode, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
      await tx.order.update({ where: { id: order.id }, data: { status: 'CANCELLED', cancelledAt: now, cancelledBy: 'SYSTEM', cancelReason: 'Payment was not completed in time' } });
    }
  });
}
