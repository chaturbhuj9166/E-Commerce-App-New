import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { db, atomic } from './db.js';
import { config } from './config.js';
import { z, productSchema, addressSchema, vendorCreateSchema, vendorUpdateSchema, vendorPasswordSchema, vendorMessageSchema, bannerSchema, reviewSchema, couponSchema } from './lib/validation.js';
import { requireThat } from './lib/rules.js';
import { auth, roles, tokenFor } from './services/auth.js';
import { verifyCustomer } from './services/firebase.js';
import { uploadImage } from './services/storage.js';
import { gateway, validSignature } from './services/payments.js';
import { checkout, ownedOrder, publicOrder, orderInclude, ownerWhere, changeStatus, deliveryCode, deliver, requestRefund, reviewRefund } from './services/orders.js';
export const router = Router();
const admin = roles('ADMIN'), customer = roles('CUSTOMER'), buyer = roles('CUSTOMER', 'VENDOR');
const loginLimiter = rateLimit({ windowMs: 15 * 60000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });
const safeVendor = v => { const { passwordHash, sessionVersion, ...safe } = v; return safe; };
async function customerSession(firebase) {
  const user = await db.user.upsert({ where: { firebaseUid: firebase.uid }, update: {}, create: { firebaseUid: firebase.uid, name: firebase.name || '', email: firebase.email, phone: firebase.phone_number, wallet: { create: {} } } });
  return { token: tokenFor('CUSTOMER', user), role: 'CUSTOMER', user };
}
router.post('/auth/login', loginLimiter, async (req, res) => {
  const data = z.object({ username: z.string().min(1).max(200), password: z.string().min(1).max(200), role: z.enum(['ADMIN', 'VENDOR']) }).parse(req.body);
  const account = data.role === 'ADMIN' ? await db.admin.findUnique({ where: { email: data.username.toLowerCase() } }) : await db.vendor.findUnique({ where: { username: data.username } });
  const valid = await bcrypt.compare(data.password, account?.passwordHash || '$2b$10$QqMrTyHMrtVX.UHX.oHJ9OvU5c3ALhIzWiZiOKLjckSLKtNuizHcK');
  requireThat(account && valid && (data.role !== 'VENDOR' || (account.enabled && !account.deleted)), 401, 'Invalid credentials');
  res.json({ token: tokenFor(data.role, account), role: data.role });
});
router.post('/auth/firebase', loginLimiter, async (req, res) => {
  const { idToken } = z.object({ idToken: z.string().min(1).max(10000) }).parse(req.body);
  res.json(await customerSession(await verifyCustomer(idToken)));
});
router.post('/auth/demo', loginLimiter, async (req, res) => {
  requireThat(config.DEMO_MODE, 404, 'Not found');
  // A stand-in for real Firebase phone-OTP verification: since there's no
  // real OTP check yet, the number the shopper types is trusted as-is and
  // maps to its own account, the same way a real phone login would give a
  // different person a different account for a different number.
  const { phone } = z.object({ phone: z.string().trim().regex(/^[0-9]{6,15}$/).optional() }).parse(req.body ?? {});
  const uid = phone ? `local-demo-${phone}` : 'local-demo-customer';
  res.json(await customerSession({ uid, name: '', phone_number: phone }));
});
router.get('/categories', async (req, res) => res.json(await db.category.findMany({ orderBy: { name: 'asc' } })));
router.get('/banners', async (req, res) => res.json(await db.banner.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } })));
router.get('/products', async (req, res) => {
  const q = z.object({ categoryId: z.string().optional(), search: z.string().max(100).optional(), deal: z.enum(['true', 'false']).optional() }).parse(req.query);
  // The search box (and the AI assistant's free-text queries) match against
  // both the name and description, since a shopper describing what they want
  // ("something to carry my laptop") rarely types the exact product name.
  const products = await db.product.findMany({ where: { active: true, categoryId: q.categoryId, deal: q.deal ? q.deal === 'true' : undefined, ...(q.search ? { OR: [{ name: { contains: q.search, mode: 'insensitive' } }, { description: { contains: q.search, mode: 'insensitive' } }] } : {}) }, include: { category: true, reviews: { select: { rating: true } } }, orderBy: { createdAt: 'desc' }, take: 200 });
  res.json(products.map(({ wholesalePaise, reviews, ...p }) => ({ ...p, rating: reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null, reviewCount: reviews.length })));
});
router.get('/products/:id', async (req, res) => {
  const p = await db.product.findFirst({ where: { id: req.params.id, active: true }, include: { category: true, reviews: { select: { rating: true, comment: true, images: true, createdAt: true, user: { select: { name: true } } }, take: 100, orderBy: { createdAt: 'desc' } } } });
  requireThat(p, 404, 'Product not found'); const { wholesalePaise, ...safe } = p; res.json(safe);
});
router.get('/coupons', async (req, res) => res.json(await db.coupon.findMany({ where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: { createdAt: 'desc' } })));
router.use(auth);
router.get('/me', async (req, res) => {
  const { passwordHash, sessionVersion, ...account } = req.actor.account;
  if (req.actor.role === 'VENDOR') account.limits = await db.vendorLimit.findUnique({ where: { vendorId: account.id } });
  res.json({ ...account, role: req.actor.role });
});
router.patch('/me', customer, async (req, res) => {
  const data = z.object({ name: z.string().trim().min(1).max(100).optional(), email: z.string().email().optional(), fcmToken: z.string().max(4096).nullable().optional() }).strict().parse(req.body);
  res.json(await db.user.update({ where: { id: req.actor.id }, data }));
});
router.post('/me/photo', customer, multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } }).single('photo'), async (req, res) => {
  const { url } = await uploadImage(req.file);
  res.json(await db.user.update({ where: { id: req.actor.id }, data: { photoUrl: url } }));
});
// Generic customer-facing image upload, e.g. for attaching a photo to a review.
router.post('/uploads', customer, multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } }).single('image'), async (req, res) => res.status(201).json(await uploadImage(req.file)));
router.get('/addresses', customer, async (req, res) => res.json(await db.address.findMany({ where: { userId: req.actor.id } })));
router.post('/addresses', customer, async (req, res) => res.status(201).json(await db.address.create({ data: { ...addressSchema.parse(req.body), userId: req.actor.id } })));
router.put('/addresses/:id', customer, async (req, res) => {
  const result = await db.address.updateMany({ where: { id: req.params.id, userId: req.actor.id }, data: addressSchema.parse(req.body) });
  requireThat(result.count, 404, 'Address not found'); res.json({ ok: true });
});
router.delete('/addresses/:id', customer, async (req, res) => { await db.address.deleteMany({ where: { id: req.params.id, userId: req.actor.id } }); res.status(204).end(); });
router.get('/wallet', customer, async (req, res) => res.json(await db.wallet.findUnique({ where: { userId: req.actor.id }, include: { transactions: { orderBy: { createdAt: 'desc' }, take: 100 } } })));
router.get('/cart', customer, async (req, res) => res.json(await db.cartItem.findMany({ where: { userId: req.actor.id }, include: { product: { select: { id: true, name: true, pricePaise: true, stock: true, active: true, images: true } } } })));
router.put('/cart/:id', customer, async (req, res) => {
  const { quantity } = z.object({ quantity: z.number().int().min(1).max(10000) }).parse(req.body);
  const p = await db.product.findFirst({ where: { id: req.params.id, active: true } });
  requireThat(p && p.stock >= quantity, 400, 'Product unavailable or insufficient stock');
  res.json(await db.cartItem.upsert({ where: { userId_productId: { userId: req.actor.id, productId: p.id } }, update: { quantity }, create: { userId: req.actor.id, productId: p.id, quantity } }));
});
router.delete('/cart/:id', customer, async (req, res) => { await db.cartItem.deleteMany({ where: { userId: req.actor.id, productId: req.params.id } }); res.status(204).end(); });
router.get('/wishlist', customer, async (req, res) => res.json(await db.wishlist.findMany({ where: { userId: req.actor.id }, include: { product: { select: { id: true, name: true, pricePaise: true, images: true, stock: true, active: true } } } })));
router.put('/wishlist/:id', customer, async (req, res) => {
  requireThat(await db.product.findFirst({ where: { id: req.params.id, active: true } }), 404, 'Product not found');
  const key = { userId: req.actor.id, productId: req.params.id };
  res.json(await db.wishlist.upsert({ where: { userId_productId: key }, update: {}, create: key }));
});
router.delete('/wishlist/:id', customer, async (req, res) => { await db.wishlist.deleteMany({ where: { userId: req.actor.id, productId: req.params.id } }); res.status(204).end(); });
// Lets the app show/hide the "Write a Review" button -- only a customer who
// has received this product may review it (same rule POST enforces below).
router.get('/products/:id/review-eligibility', customer, async (req, res) => {
  const [delivered, existing] = await Promise.all([
    db.orderItem.findFirst({ where: { productId: req.params.id, order: { userId: req.actor.id, status: 'DELIVERED' } } }),
    db.review.findUnique({ where: { userId_productId: { userId: req.actor.id, productId: req.params.id } } }),
  ]);
  res.json({ canReview: !!delivered, hasReviewed: !!existing });
});
router.post('/products/:id/reviews', customer, async (req, res) => {
  const data = reviewSchema.parse(req.body);
  requireThat(await db.orderItem.findFirst({ where: { productId: req.params.id, order: { userId: req.actor.id, status: 'DELIVERED' } } }), 403, 'You must receive this product before reviewing it');
  res.json(await db.review.upsert({ where: { userId_productId: { userId: req.actor.id, productId: req.params.id } }, update: data, create: { ...data, userId: req.actor.id, productId: req.params.id } }));
});
router.get('/orders', async (req, res) => res.json((await db.order.findMany({ where: ownerWhere(req.actor), include: orderInclude, orderBy: { createdAt: 'desc' }, take: 200 })).map(publicOrder)));
router.post('/orders', buyer, async (req, res) => res.status(201).json(await checkout(req.actor, req.body)));
router.get('/orders/:id', async (req, res) => res.json(publicOrder(await ownedOrder(req.actor, req.params.id))));
router.post('/orders/:id/delivery-code', buyer, async (req, res) => res.json(await deliveryCode(req.actor, req.params.id)));
router.post('/orders/:id/refunds', customer, async (req, res) => {
  const { itemId, reason } = z.object({ itemId: z.string(), reason: z.string().trim().min(5).max(1000) }).parse(req.body);
  const order = await ownedOrder(req.actor, req.params.id);
  requireThat(order.items.some(i => i.id === itemId), 404, 'Order item not found');
  res.status(201).json(await requestRefund(req.actor, itemId, reason));
});
router.post('/orders/:id/payment', buyer, async (req, res) => {
  const order = await ownedOrder(req.actor, req.params.id);
  requireThat(order.status === 'PENDING_PAYMENT' && order.paymentMethod === 'RAZORPAY', 400, 'Order is not awaiting payment');
  // Save one gateway order under the same DB lock; repeated requests reuse its ID.
  const result = await atomic(async tx => {
    const current = await ownedOrder(req.actor, order.id, tx);
    requireThat(current.status === 'PENDING_PAYMENT', 409, 'Order is no longer awaiting payment');
    if (current.razorpayOrderId) return current;
    const payment = await gateway().orders.create({ amount: current.totalPaise, currency: 'INR', receipt: current.id });
    return tx.order.update({ where: { id: current.id }, data: { razorpayOrderId: payment.id } });
  });
  res.json({ key: process.env.RAZORPAY_KEY_ID, orderId: result.razorpayOrderId, amount: result.totalPaise, currency: 'INR' });
});
router.post('/orders/:id/payment/verify', buyer, async (req, res) => {
  const data = z.object({ paymentId: z.string().max(100), signature: z.string().max(128) }).parse(req.body);
  const order = await ownedOrder(req.actor, req.params.id);
  requireThat(order.razorpayOrderId && validSignature(order.razorpayOrderId, data.paymentId, data.signature, process.env.RAZORPAY_KEY_SECRET || ''), 400, 'Invalid payment signature');
  const payment = await gateway().payments.fetch(data.paymentId);
  requireThat(payment.order_id === order.razorpayOrderId && Number(payment.amount) === order.totalPaise && payment.currency === 'INR' && payment.status === 'captured', 400, 'Payment has not been captured for this order');
  const result = await atomic(async tx => {
    const current = await ownedOrder(req.actor, order.id, tx);
    if (current.paymentId === data.paymentId) return current;
    requireThat(current.status === 'PENDING_PAYMENT', 409, 'Reservation expired. Contact support for payment reconciliation');
    return tx.order.update({ where: { id: order.id }, data: { status: 'PLACED', paymentId: data.paymentId }, include: orderInclude });
  });
  res.json(publicOrder(result));
});
router.get('/vendor/products', roles('VENDOR'), async (req, res) => res.json(await db.product.findMany({ where: { active: true }, include: { category: true }, orderBy: { name: 'asc' }, take: 200 })));
// The wholesale portal's "message admin" thread -- a vendor only ever sees
// their own messages; the admin side (below) can see and reply to any vendor's.
router.get('/vendor/messages', roles('VENDOR'), async (req, res) => res.json(await db.vendorMessage.findMany({ where: { vendorId: req.actor.id }, orderBy: { createdAt: 'asc' } })));
router.post('/vendor/messages', roles('VENDOR'), async (req, res) => {
  const { body } = vendorMessageSchema.parse(req.body);
  res.status(201).json(await db.vendorMessage.create({ data: { vendorId: req.actor.id, sender: 'VENDOR', body } }));
});
router.use('/admin', admin);
router.get('/admin/products', async (req, res) => res.json(await db.product.findMany({ where: { active: true }, include: { category: true }, orderBy: { createdAt: 'desc' } })));
router.post('/admin/products', async (req, res) => res.status(201).json(await db.product.create({ data: productSchema.parse(req.body) })));
router.put('/admin/products/:id', async (req, res) => res.json(await db.product.update({ where: { id: req.params.id }, data: productSchema.parse(req.body) })));
router.delete('/admin/products/:id', async (req, res) => { await db.product.update({ where: { id: req.params.id }, data: { active: false } }); res.status(204).end(); });
const categorySchema = z.object({ name: z.string().trim().min(1).max(80), icon: z.string().max(50).default('shopping_bag') });
router.post('/admin/categories', async (req, res) => res.status(201).json(await db.category.create({ data: categorySchema.parse(req.body) })));
router.put('/admin/categories/:id', async (req, res) => res.json(await db.category.update({ where: { id: req.params.id }, data: categorySchema.parse(req.body) })));
router.delete('/admin/categories/:id', async (req, res) => { await db.category.delete({ where: { id: req.params.id } }); res.status(204).end(); });
router.post('/admin/images', multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } }).single('image'), async (req, res) => res.status(201).json(await uploadImage(req.file)));
router.get('/admin/banners', async (req, res) => res.json(await db.banner.findMany({ orderBy: { sortOrder: 'asc' } })));
router.post('/admin/banners', async (req, res) => res.status(201).json(await db.banner.create({ data: bannerSchema.parse(req.body) })));
router.put('/admin/banners/:id', async (req, res) => res.json(await db.banner.update({ where: { id: req.params.id }, data: bannerSchema.parse(req.body) })));
router.delete('/admin/banners/:id', async (req, res) => { await db.banner.delete({ where: { id: req.params.id } }); res.status(204).end(); });
router.get('/admin/coupons', async (req, res) => res.json(await db.coupon.findMany({ orderBy: { createdAt: 'desc' } })));
router.post('/admin/coupons', async (req, res) => {
  const data = couponSchema.parse(req.body);
  res.status(201).json(await db.coupon.create({ data: { ...data, expiresAt: data.expiresAt ? new Date(data.expiresAt) : null } }));
});
router.put('/admin/coupons/:id', async (req, res) => {
  const data = couponSchema.parse(req.body);
  res.json(await db.coupon.update({ where: { id: req.params.id }, data: { ...data, expiresAt: data.expiresAt ? new Date(data.expiresAt) : null } }));
});
router.delete('/admin/coupons/:id', async (req, res) => { await db.coupon.delete({ where: { id: req.params.id } }); res.status(204).end(); });
router.get('/admin/vendors', async (req, res) => res.json((await db.vendor.findMany({ where: { deleted: false }, include: { limits: true }, orderBy: { createdAt: 'desc' } })).map(safeVendor)));
router.post('/admin/vendors', async (req, res) => {
  const data = vendorCreateSchema.parse(req.body);
  const vendor = await db.vendor.create({ data: {
    name: data.name, username: data.username, passwordHash: await bcrypt.hash(data.password, 12),
    email: data.email, phone: data.phone, aadharNumber: data.aadharNumber, panNumber: data.panNumber,
    limits: { create: data.limits },
  }, include: { limits: true } });
  res.status(201).json(safeVendor(vendor));
});
router.patch('/admin/vendors/:id', async (req, res) => {
  const data = vendorUpdateSchema.parse(req.body);
  res.json(safeVendor(await db.vendor.update({ where: { id: req.params.id }, data: {
    name: data.name, enabled: data.enabled, email: data.email, phone: data.phone, aadharNumber: data.aadharNumber, panNumber: data.panNumber,
    sessionVersion: { increment: 1 }, ...(data.limits ? { limits: { update: data.limits } } : {}),
  }, include: { limits: true } })));
});
router.post('/admin/vendors/:id/reset-password', async (req, res) => {
  // The admin sets the new password themselves -- nothing is auto-generated
  // or returned, since only the bcrypt hash is ever persisted.
  const { password } = vendorPasswordSchema.parse(req.body);
  await db.vendor.update({ where: { id: req.params.id }, data: { passwordHash: await bcrypt.hash(password, 12), sessionVersion: { increment: 1 } } });
  res.status(204).end();
});
router.delete('/admin/vendors/:id', async (req, res) => { await db.vendor.update({ where: { id: req.params.id }, data: { deleted: true, enabled: false, sessionVersion: { increment: 1 } } }); res.status(204).end(); });
router.get('/admin/vendors/:id/messages', async (req, res) => res.json(await db.vendorMessage.findMany({ where: { vendorId: req.params.id }, orderBy: { createdAt: 'asc' } })));
router.post('/admin/vendors/:id/messages', async (req, res) => {
  const { body } = vendorMessageSchema.parse(req.body);
  res.status(201).json(await db.vendorMessage.create({ data: { vendorId: req.params.id, sender: 'ADMIN', body } }));
});
router.patch('/admin/orders/:id/status', async (req, res) => {
  const { status } = z.object({ status: z.enum(['PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY']) }).parse(req.body);
  res.json(await changeStatus(req.params.id, status));
});
router.post('/admin/orders/:id/deliver', loginLimiter, async (req, res) => {
  const { otp } = z.object({ otp: z.string().regex(/^\d{6}$/) }).parse(req.body);
  res.json(await deliver(req.params.id, otp));
});
router.get('/admin/refunds', async (req, res) => res.json(await db.refund.findMany({ include: { orderItem: { include: { order: true } } }, orderBy: { createdAt: 'desc' }, take: 200 })));
router.patch('/admin/refunds/:id', async (req, res) => {
  const { status } = z.object({ status: z.enum(['APPROVED', 'REJECTED']) }).parse(req.body);
  res.json(await reviewRefund(req.params.id, status));
});
