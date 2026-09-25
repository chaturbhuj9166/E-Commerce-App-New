import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { randomInt } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { db, atomic } from './db.js';
import { config } from './config.js';
import { z, productSchema, addressSchema, vendorCreateSchema, vendorUpdateSchema, vendorPasswordSchema, vendorMessageSchema, bannerSchema, reviewSchema, couponSchema, staffCreateSchema, staffUpdateSchema, sellerApplicationSchema, sellerApproveSchema, blockedPincodeSchema, deliveryRuleSchema, settingsSchema } from './lib/validation.js';
import { requireThat } from './lib/rules.js';
import { variantFor, priceFor, publicSizePrices } from './lib/variants.js';
import { auth, roles, tokenFor } from './services/auth.js';
import { verifyCustomer } from './services/firebase.js';
import { uploadImage, uploadAttachment } from './services/storage.js';
import { gateway, validSignature } from './services/payments.js';
import { checkout, ownedOrder, publicOrder, orderInclude, ownerWhere, changeStatus, cancelOrder, CANCELLABLE_BY_BUYER, deliveryCode, deliver, requestRefund, reviewRefund } from './services/orders.js';
import { streamInvoice, invoiceNumberFor } from './services/invoice.js';
export const router = Router();
const admin = roles('ADMIN'), customer = roles('CUSTOMER'), buyer = roles('CUSTOMER', 'VENDOR');
// Panel staff: packing sees the orders to pack, sales signs up new sellers.
const packing = roles('ADMIN', 'PACKING'), sales = roles('ADMIN', 'SALES');
const panel = roles('ADMIN', 'PACKING', 'SALES');
const loginLimiter = rateLimit({ windowMs: 15 * 60000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });
const safeVendor = v => { const { passwordHash, sessionVersion, ...safe } = v; return safe; };
const safeStaff = a => { const { passwordHash, sessionVersion, ...safe } = a; return safe; };
const notify = (audience, type, title, body, entityId) => db.notification.create({ data: { audience, type, title, body, entityId } });
async function customerSession(firebase) {
  const user = await db.user.upsert({ where: { firebaseUid: firebase.uid }, update: {}, create: { firebaseUid: firebase.uid, name: firebase.name || '', email: firebase.email, phone: firebase.phone_number, wallet: { create: {} } } });
  return { token: tokenFor('CUSTOMER', user), role: 'CUSTOMER', user };
}
// One login endpoint for every panel. Sellers and wholesale partners are
// looked up by the username the admin gave them; panel staff by e-mail.
router.post('/auth/login', loginLimiter, async (req, res) => {
  const data = z.object({ username: z.string().min(1).max(200), password: z.string().min(1).max(200), role: z.enum(['ADMIN', 'VENDOR', 'SELLER']) }).parse(req.body);
  const account = data.role === 'ADMIN' ? await db.admin.findUnique({ where: { email: data.username.toLowerCase() } })
    : data.role === 'SELLER' ? await db.seller.findUnique({ where: { username: data.username } })
    : await db.vendor.findUnique({ where: { username: data.username } });
  const valid = await bcrypt.compare(data.password, account?.passwordHash || '$2b$10$QqMrTyHMrtVX.UHX.oHJ9OvU5c3ALhIzWiZiOKLjckSLKtNuizHcK');
  // A disabled or removed seller/partner is turned away like a wrong password.
  const usable = data.role === 'ADMIN' ? account?.enabled : account?.enabled && !account?.deleted;
  requireThat(account && valid && usable, 401, 'Invalid credentials');
  // Panel staff sign in on the same page; the token carries their own role so
  // packing/sales only ever reach their own endpoints.
  const role = data.role === 'ADMIN' ? account.role : data.role;
  res.json({ token: tokenFor(role, account), role, name: account.name || account.shopName || undefined });
});
router.post('/auth/firebase', loginLimiter, async (req, res) => {
  const { idToken } = z.object({ idToken: z.string().min(1).max(10000) }).parse(req.body);
  res.json(await customerSession(await verifyCustomer(idToken)));
});
// Demo stand-in for Firebase phone-OTP until SMS credentials exist: the OTP
// is generated and checked here, but "delivered" by logging it and returning
// it in the response (DEMO_MODE only) instead of an SMS. In-memory, so it
// assumes a single server instance, which is all DEMO_MODE runs on.
const demoOtps = new Map();
const OTP_TTL_MS = 5 * 60000, OTP_RESEND_MS = 30000, OTP_MAX_ATTEMPTS = 5;
const demoPhone = z.string().trim().regex(/^[6-9][0-9]{9}$/, 'Enter a valid 10-digit mobile number');
router.post('/auth/demo/otp', loginLimiter, async (req, res) => {
  requireThat(config.DEMO_MODE, 404, 'Not found');
  const { phone } = z.object({ phone: demoPhone }).parse(req.body ?? {});
  const existing = demoOtps.get(phone);
  requireThat(!existing || Date.now() - existing.sentAt >= OTP_RESEND_MS, 429, 'Please wait a few seconds before requesting another OTP');
  const otp = String(randomInt(100000, 1000000));
  demoOtps.set(phone, { otp, sentAt: Date.now(), expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
  console.log(`[demo OTP] +91 ${phone}: ${otp}`);
  res.json({ sent: true, expiresInSeconds: OTP_TTL_MS / 1000, resendInSeconds: OTP_RESEND_MS / 1000, demoOtp: otp });
});
router.post('/auth/demo', loginLimiter, async (req, res) => {
  requireThat(config.DEMO_MODE, 404, 'Not found');
  // Each number maps to its own account, the same way a real phone login
  // would. No phone (the Google/Apple buttons) uses one shared demo account.
  const { phone, otp } = z.object({ phone: demoPhone.optional(), otp: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit OTP').optional() }).parse(req.body ?? {});
  if (phone) {
    const entry = demoOtps.get(phone);
    requireThat(entry && entry.expiresAt > Date.now() && entry.attempts < OTP_MAX_ATTEMPTS, 400, 'OTP expired. Please request a new one');
    requireThat(otp, 400, 'Enter the 6-digit OTP');
    if (otp !== entry.otp) { entry.attempts++; requireThat(false, 400, 'Incorrect OTP'); }
    demoOtps.delete(phone);
  }
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
  const products = await db.product.findMany({ where: { active: true, audience: { in: ['RETAIL', 'BOTH'] }, categoryId: q.categoryId, deal: q.deal ? q.deal === 'true' : undefined, ...(q.search ? { OR: [{ name: { contains: q.search, mode: 'insensitive' } }, { description: { contains: q.search, mode: 'insensitive' } }] } : {}) }, include: { category: true, reviews: { select: { rating: true } } }, orderBy: { createdAt: 'desc' }, take: 200 });
  res.json(products.map(({ wholesalePaise, reviews, ...p }) => ({ ...p, sizePrices: publicSizePrices(p.sizePrices), rating: reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null, reviewCount: reviews.length })));
});
router.get('/products/:id', async (req, res) => {
  const p = await db.product.findFirst({ where: { id: req.params.id, active: true, audience: { in: ['RETAIL', 'BOTH'] } }, include: { category: true, reviews: { select: { rating: true, comment: true, images: true, createdAt: true, user: { select: { name: true } } }, take: 100, orderBy: { createdAt: 'desc' } } } });
  requireThat(p, 404, 'Product not found'); const { wholesalePaise, ...safe } = p; res.json({ ...safe, sizePrices: publicSizePrices(safe.sizePrices) });
});
router.get('/coupons', async (req, res) => res.json(await db.coupon.findMany({ where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: { createdAt: 'desc' } })));
// The app shows the delivery charge in the cart before checkout; the server
// works it out again when the order is placed.
router.get('/delivery-rules', async (req, res) => res.json(await db.deliveryRule.findMany({ orderBy: { belowPaise: 'asc' }, select: { id: true, belowPaise: true, chargePaise: true } })));
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
// Saving an address in a blocked area is refused up front, so the shopper
// finds out before they have a cart full of things.
const checkPincode = async postalCode => requireThat(!await db.blockedPincode.findUnique({ where: { pincode: postalCode } }), 400, `We are not delivering to PIN code ${postalCode} right now`);
router.get('/addresses', customer, async (req, res) => res.json(await db.address.findMany({ where: { userId: req.actor.id } })));
router.post('/addresses', customer, async (req, res) => {
  const data = addressSchema.parse(req.body);
  await checkPincode(data.postalCode);
  res.status(201).json(await db.address.create({ data: { ...data, userId: req.actor.id } }));
});
router.put('/addresses/:id', customer, async (req, res) => {
  const data = addressSchema.parse(req.body);
  await checkPincode(data.postalCode);
  const result = await db.address.updateMany({ where: { id: req.params.id, userId: req.actor.id }, data });
  requireThat(result.count, 404, 'Address not found'); res.json({ ok: true });
});
router.delete('/addresses/:id', customer, async (req, res) => { await db.address.deleteMany({ where: { id: req.params.id, userId: req.actor.id } }); res.status(204).end(); });
router.get('/wallet', customer, async (req, res) => res.json(await db.wallet.findUnique({ where: { userId: req.actor.id }, include: { transactions: { orderBy: { createdAt: 'desc' }, take: 100 } } })));
// Each cart line is one product + size + color; unitPaise/mrpPaise are that
// option's price so the app doesn't have to work it out.
router.get('/cart', customer, async (req, res) => {
  const items = await db.cartItem.findMany({ where: { userId: req.actor.id }, include: { product: { select: { id: true, name: true, pricePaise: true, wholesalePaise: true, mrpPaise: true, stock: true, active: true, images: true, sizes: true, colors: true, sizeLabel: true, sizePrices: true, colorExtraPaise: true, category: true } } } });
  res.json(items.map(({ product: { wholesalePaise, sizePrices, ...product }, ...item }) => {
    const { pricePaise, mrpPaise } = priceFor({ ...product, wholesalePaise, sizePrices }, item.size, item.color);
    return { ...item, unitPaise: pricePaise, mrpPaise, product: { ...product, sizePrices: publicSizePrices(sizePrices) } };
  }));
});
const cartKey = z.object({ size: z.string().trim().max(30).optional(), color: z.string().trim().max(30).optional() });
router.put('/cart/:id', customer, async (req, res) => {
  const { quantity, ...pick } = cartKey.extend({ quantity: z.number().int().min(1).max(10000) }).parse(req.body);
  const p = await db.product.findFirst({ where: { id: req.params.id, active: true } });
  requireThat(p && p.stock >= quantity, 400, 'Product unavailable or insufficient stock');
  const { size, color } = variantFor(p, pick.size, pick.color);
  const key = { userId: req.actor.id, productId: p.id, size, color };
  res.json(await db.cartItem.upsert({ where: { userId_productId_size_color: key }, update: { quantity }, create: { ...key, quantity } }));
});
router.delete('/cart/:id', customer, async (req, res) => {
  const { size = '', color = '' } = cartKey.parse(req.query);
  await db.cartItem.deleteMany({ where: { userId: req.actor.id, productId: req.params.id, size, color } }); res.status(204).end();
});
router.get('/wishlist', customer, async (req, res) => res.json(await db.wishlist.findMany({ where: { userId: req.actor.id }, include: { product: { select: { id: true, name: true, pricePaise: true, images: true, stock: true, active: true, sizes: true, colors: true } } } })));
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
// The row every invoice is printed with; a fresh install has none yet, and
// streamInvoice() fills in sensible defaults until the admin sets it up.
async function getSettings() { return db.settings.findUnique({ where: { id: 'singleton' } }); }
// One invoice route for the customer, the wholesale partner and the admin --
// ownedOrder() already scopes each of those correctly. Packing has its own
// route just below, since it does not own orders the same way.
router.get('/orders/:id/invoice', async (req, res) => {
  const order = await ownedOrder(req.actor, req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${invoiceNumberFor(order)}.pdf"`);
  await streamInvoice(order, await getSettings(), res);
});
router.post('/orders/:id/delivery-code', buyer, async (req, res) => res.json(await deliveryCode(req.actor, req.params.id)));
// A shopper or wholesale buyer calling off their own order before it's packed.
router.post('/orders/:id/cancel', buyer, async (req, res) => {
  const { reason } = z.object({ reason: z.string().trim().max(300).optional() }).parse(req.body ?? {});
  const order = await cancelOrder(req.actor, req.params.id, reason);
  const who = req.actor.role === 'VENDOR' ? req.actor.account.name : (req.actor.account.name || 'A customer');
  const short = `#${order.id.slice(0, 10).toUpperCase()}`;
  await Promise.all([
    notify('ADMIN', 'ORDER_CANCELLED', 'Order cancelled', `${who} cancelled order ${short}${reason ? `: ${reason}` : ''}. Stock has been put back.`, order.id),
    notify('PACKING', 'ORDER_CANCELLED', 'Do not pack this order', `Order ${short} was cancelled by the buyer.`, order.id),
  ]);
  res.json(order);
});
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
// ---------- Admin-panel staff (packing + sales) ----------
// Bell notifications for whoever is signed into the panel.
router.get('/notifications', panel, async (req, res) => res.json(await db.notification.findMany({ where: { audience: req.actor.role }, orderBy: { createdAt: 'desc' }, take: 100 })));
router.post('/notifications/read', panel, async (req, res) => {
  const { ids } = z.object({ ids: z.array(z.string()).max(100).optional() }).parse(req.body ?? {});
  await db.notification.updateMany({ where: { audience: req.actor.role, readAt: null, ...(ids ? { id: { in: ids } } : {}) }, data: { readAt: new Date() } });
  res.json({ ok: true });
});
// Image upload for panel staff, e.g. the sales team's GST/Aadhaar photos.
router.post('/panel/images', panel, multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } }).single('image'), async (req, res) => res.status(201).json(await uploadImage(req.file)));

// Packing team: what to pack, and marking it packed.
const packingInclude = { items: true };
router.get('/packing/orders', packing, async (req, res) => {
  const { status = 'PLACED' } = z.object({ status: z.enum(['PLACED', 'PACKED', 'CANCELLED']).optional() }).parse(req.query);
  const orders = await db.order.findMany({ where: { status }, include: { ...packingInclude, user: { select: { name: true, phone: true } }, vendor: { select: { name: true, phone: true } } }, orderBy: { createdAt: 'asc' }, take: 200 });
  res.json(orders.map(({ deliveryOtpHash, deliveryOtpExpiresAt, deliveryOtpAttempts, ...o }) => o));
});
router.get('/packing/orders/:id', packing, async (req, res) => {
  const order = await db.order.findUnique({ where: { id: req.params.id }, include: { ...packingInclude, user: { select: { name: true, phone: true } }, vendor: { select: { name: true, phone: true } } } });
  requireThat(order, 404, 'Order not found');
  const { deliveryOtpHash, deliveryOtpExpiresAt, deliveryOtpAttempts, ...safe } = order;
  res.json(safe);
});
// So the packing team can print or check the same bill that ships with the
// parcel, with the buyer's name and address on it, per the client's brief.
router.get('/packing/orders/:id/invoice', packing, async (req, res) => {
  const order = await db.order.findUnique({ where: { id: req.params.id }, include: packingInclude });
  requireThat(order, 404, 'Order not found');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${invoiceNumberFor(order)}.pdf"`);
  await streamInvoice(order, await getSettings(), res);
});
router.post('/packing/orders/:id/packed', packing, async (req, res) => {
  const order = await changeStatus(req.params.id, 'PACKED');
  const who = req.actor.account.name || req.actor.account.email;
  await notify('ADMIN', 'ORDER_PACKED', 'Order packed', `${who} packed order #${order.id.slice(0, 10).toUpperCase()} (${order.items.length} item(s)) and it is ready to send.`, order.id);
  res.json(order);
});

// Sales team: signs up shopkeepers who want to sell on NTSA.
router.post('/sales/applications', sales, async (req, res) => {
  const data = sellerApplicationSchema.parse(req.body);
  const application = await db.sellerApplication.create({ data: { ...data, submittedById: req.actor.id } });
  const who = req.actor.account.name || req.actor.account.email;
  await notify('ADMIN', 'SELLER_APPLICATION', 'New seller to verify', `${who} added ${application.shopName} (${application.ownerName}). Check the GST/Aadhaar details and approve to create their seller login.`, application.id);
  res.status(201).json(application);
});
router.get('/sales/applications', sales, async (req, res) => res.json(await db.sellerApplication.findMany({
  where: req.actor.role === 'ADMIN' ? {} : { submittedById: req.actor.id },
  include: { seller: { select: { username: true } } }, orderBy: { createdAt: 'desc' }, take: 200,
})));

router.get('/vendor/products', roles('VENDOR'), async (req, res) => res.json(await db.product.findMany({ where: { active: true, audience: { in: ['WHOLESALE', 'BOTH'] } }, include: { category: true }, orderBy: { name: 'asc' }, take: 200 })));
// The wholesale portal's "message admin" thread -- a vendor only ever sees
// their own messages; the admin side (below) can see and reply to any vendor's.
router.get('/vendor/messages', roles('VENDOR'), async (req, res) => res.json(await db.vendorMessage.findMany({ where: { vendorId: req.actor.id }, orderBy: { createdAt: 'asc' } })));
router.post('/vendor/messages', roles('VENDOR'), async (req, res) => {
  const { body, attachments } = vendorMessageSchema.parse(req.body);
  res.status(201).json(await db.vendorMessage.create({ data: { vendorId: req.actor.id, sender: 'VENDOR', body, attachments } }));
});
// A photo or short clip a wholesaler attaches to the thread. Video files are
// much bigger than product photos, so this cap is 25 MB rather than 5.
router.post('/vendor/attachments', roles('VENDOR'), multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 1 } }).single('file'), async (req, res) => res.status(201).json(await uploadAttachment(req.file)));
router.use('/admin', admin);
// The company letterhead invoices are printed with. Upserted as one fixed
// row, so there is always exactly one to read or write.
router.get('/admin/settings', async (req, res) => res.json(await getSettings() ?? { id: 'singleton', companyName: 'NTSA', companyAddress: '', companyGSTIN: null, companyPhone: null, companyEmail: null, logoUrl: null }));
router.put('/admin/settings', async (req, res) => {
  const data = settingsSchema.parse(req.body);
  res.json(await db.settings.upsert({ where: { id: 'singleton' }, update: data, create: { id: 'singleton', ...data } }));
});
// Panel staff accounts (packing / sales). The admin hands out the logins.
router.get('/admin/staff', async (req, res) => res.json((await db.admin.findMany({ orderBy: { createdAt: 'asc' } })).map(safeStaff)));
router.post('/admin/staff', async (req, res) => {
  const data = staffCreateSchema.parse(req.body);
  res.status(201).json(safeStaff(await db.admin.create({ data: { name: data.name, email: data.email, role: data.role, passwordHash: await bcrypt.hash(data.password, 12) } })));
});
router.patch('/admin/staff/:id', async (req, res) => {
  const data = staffUpdateSchema.parse(req.body);
  // Changing a role or disabling an account ends that person's session.
  requireThat(req.params.id !== req.actor.id || (data.enabled !== false && !data.role), 400, 'You cannot disable or change your own account');
  res.json(safeStaff(await db.admin.update({ where: { id: req.params.id }, data: { ...data, sessionVersion: { increment: 1 } } })));
});
router.post('/admin/staff/:id/reset-password', async (req, res) => {
  const { password } = vendorPasswordSchema.parse(req.body);
  await db.admin.update({ where: { id: req.params.id }, data: { passwordHash: await bcrypt.hash(password, 12), sessionVersion: { increment: 1 } } });
  res.status(204).end();
});
router.delete('/admin/staff/:id', async (req, res) => {
  requireThat(req.params.id !== req.actor.id, 400, 'You cannot remove your own account');
  const staff = await db.admin.findUnique({ where: { id: req.params.id } });
  requireThat(staff?.role !== 'ADMIN' || await db.admin.count({ where: { role: 'ADMIN', enabled: true } }) > 1, 400, 'Keep at least one admin account');
  await db.admin.update({ where: { id: req.params.id }, data: { enabled: false, sessionVersion: { increment: 1 } } });
  res.status(204).end();
});

// Delivery charge slabs, e.g. below ₹500 costs ₹30.
router.get('/admin/delivery-rules', async (req, res) => res.json(await db.deliveryRule.findMany({ orderBy: { belowPaise: 'asc' } })));
router.post('/admin/delivery-rules', async (req, res) => {
  const data = deliveryRuleSchema.parse(req.body);
  const existing = await db.deliveryRule.findFirst({ where: { belowPaise: data.belowPaise } });
  requireThat(!existing, 409, 'There is already a slab for that amount; remove it first');
  res.status(201).json(await db.deliveryRule.create({ data }));
});
router.delete('/admin/delivery-rules/:id', async (req, res) => {
  await db.deliveryRule.deleteMany({ where: { id: req.params.id } });
  res.status(204).end();
});

// PIN codes the shop won't deliver to, plus the numbers behind that call.
router.get('/admin/blocked-pincodes', async (req, res) => res.json(await db.blockedPincode.findMany({ orderBy: { createdAt: 'desc' } })));
router.post('/admin/blocked-pincodes', async (req, res) => {
  const data = blockedPincodeSchema.parse(req.body);
  res.status(201).json(await db.blockedPincode.upsert({ where: { pincode: data.pincode }, update: { reason: data.reason ?? null }, create: { pincode: data.pincode, reason: data.reason ?? null } }));
});
router.delete('/admin/blocked-pincodes/:pincode', async (req, res) => {
  await db.blockedPincode.deleteMany({ where: { pincode: req.params.pincode } });
  res.status(204).end();
});
// Orders vs refunds per PIN code, so a block is a decision, not a guess.
router.get('/admin/pincode-stats', async (req, res) => {
  const rows = await db.$queryRaw`
    SELECT o.address->>'postalCode' AS pincode,
           COUNT(DISTINCT o.id)::int AS orders,
           COUNT(DISTINCT r.id)::int AS refunds,
           COUNT(DISTINCT CASE WHEN o.status = 'CANCELLED' THEN o.id END)::int AS cancelled
    FROM orders o
    LEFT JOIN order_items i ON i."orderId" = o.id
    LEFT JOIN refunds r ON r."orderItemId" = i.id
    GROUP BY 1
    HAVING o.address->>'postalCode' IS NOT NULL
    ORDER BY 3 DESC, 2 DESC
    LIMIT 50`;
  res.json(rows);
});

// Seller sign-ups from the sales team: verify, then create their login.
router.get('/admin/seller-applications', async (req, res) => res.json(await db.sellerApplication.findMany({
  include: { submittedBy: { select: { name: true, email: true } }, seller: { select: { id: true, username: true, enabled: true } } },
  orderBy: { createdAt: 'desc' }, take: 200,
})));
router.post('/admin/seller-applications/:id/approve', async (req, res) => {
  const data = sellerApproveSchema.parse(req.body);
  const application = await db.sellerApplication.findUnique({ where: { id: req.params.id }, include: { seller: true } });
  requireThat(application, 404, 'Application not found');
  requireThat(application.status === 'PENDING', 409, 'This application has already been reviewed');
  const seller = await atomic(async tx => {
    const created = await tx.seller.create({ data: {
      shopName: application.shopName, ownerName: application.ownerName, phone: application.phone, email: application.email,
      gstNumber: application.gstNumber, aadharNumber: application.aadharNumber,
      gstVerified: data.gstVerified, aadharVerified: data.aadharVerified,
      username: data.username, passwordHash: await bcrypt.hash(data.password, 12), applicationId: application.id,
    } });
    await tx.sellerApplication.update({ where: { id: application.id }, data: { status: 'APPROVED', reviewedAt: new Date() } });
    return created;
  });
  await notify('SALES', 'SELLER_APPROVED', 'Seller approved', `${application.shopName} is approved and can sign in as "${seller.username}".`, application.id);
  const { passwordHash, sessionVersion, ...safe } = seller;
  res.status(201).json(safe);
});
router.post('/admin/seller-applications/:id/reject', async (req, res) => {
  const { note } = z.object({ note: z.string().trim().min(1).max(500) }).parse(req.body);
  const application = await db.sellerApplication.findUnique({ where: { id: req.params.id } });
  requireThat(application?.status === 'PENDING', 409, 'This application has already been reviewed');
  const updated = await db.sellerApplication.update({ where: { id: req.params.id }, data: { status: 'REJECTED', note, reviewedAt: new Date() } });
  await notify('SALES', 'SELLER_REJECTED', 'Seller rejected', `${application.shopName} was rejected: ${note}`, application.id);
  res.json(updated);
});
router.get('/admin/products', async (req, res) => {
  // 'Products' asks for the shop's own list, 'Wholesale products' for the
  // dealer-only one; without the filter the panel gets everything.
  const { audience } = z.object({ audience: z.enum(['RETAIL', 'WHOLESALE', 'BOTH']).optional() }).parse(req.query);
  const where = { active: true, ...(audience === 'RETAIL' ? { audience: { in: ['RETAIL', 'BOTH'] } } : audience === 'WHOLESALE' ? { audience: { in: ['WHOLESALE', 'BOTH'] } } : {}) };
  res.json(await db.product.findMany({ where, include: { category: true, seller: { select: { shopName: true } } }, orderBy: { createdAt: 'desc' } }));
});
// Prisma won't take a bare null for a Json column; DbNull clears it. The
// return window is not asked for here: it is whatever the chosen category
// allows, copied on so orders and the app keep reading it off the product.
const productData = async body => {
  const data = productSchema.parse(body);
  for (const key of ['colorImages', 'sizePrices', 'colorExtraPaise']) if (data[key] === null) data[key] = Prisma.DbNull;
  const category = await db.category.findUnique({ where: { id: data.categoryId } });
  requireThat(category, 400, 'Choose a category for this product');
  requireThat(data.condition === 'NEW' || category.allowsUsedStock, 400, category.name + ' does not sell refurbished or open-box stock. Tick that on the category first.');
  return { ...data, refundWindowHours: category.refundWindowHours };
};
router.post('/admin/products', async (req, res) => res.status(201).json(await db.product.create({ data: await productData(req.body) })));
router.put('/admin/products/:id', async (req, res) => res.json(await db.product.update({ where: { id: req.params.id }, data: await productData(req.body) })));
router.delete('/admin/products/:id', async (req, res) => { await db.product.update({ where: { id: req.params.id }, data: { active: false } }); res.status(204).end(); });
// The return window is set here, once per category: "anything in Grocery
// can be returned for 2 hours".
const categorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  icon: z.string().max(50).default('shopping_bag'),
  refundWindowHours: z.number().int().min(0).max(720).default(24),
  // Refurbished and open-box only make sense for some things.
  allowsUsedStock: z.boolean().default(false),
});
router.post('/admin/categories', async (req, res) => res.status(201).json(await db.category.create({ data: categorySchema.parse(req.body) })));
router.put('/admin/categories/:id', async (req, res) => {
  const data = categorySchema.parse(req.body);
  // Changing it here changes it for everything in the category; orders
  // already placed keep the window they were bought under.
  const [category] = await db.$transaction([
    db.category.update({ where: { id: req.params.id }, data }),
    db.product.updateMany({ where: { categoryId: req.params.id }, data: { refundWindowHours: data.refundWindowHours } }),
  ]);
  res.json(category);
});
router.delete('/admin/categories/:id', async (req, res) => {
  // Removed products are only deactivated (kept for order history), so they
  // still reference the category; Postgres would reject the delete with a raw
  // RESTRICT error that surfaces as a 500.
  const [active, total] = await Promise.all([
    db.product.count({ where: { categoryId: req.params.id, active: true } }),
    db.product.count({ where: { categoryId: req.params.id } }),
  ]);
  requireThat(!active, 409, `This category still has ${active} product(s). Move or remove them first.`);
  requireThat(!total, 409, 'This category is linked to removed products kept for order history, so it cannot be deleted. Rename it instead.');
  await db.category.delete({ where: { id: req.params.id } }); res.status(204).end();
});
// Product photos are stamped with the NTSA logo on the way in; a banner is
// the shop's own artwork, so the panel sends watermark=false for those.
router.post('/admin/images', multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } }).single('image'), async (req, res) => res.status(201).json(await uploadImage(req.file, { watermark: req.body?.watermark !== 'false' })));
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
    email: data.email, phone: data.phone, aadharNumber: data.aadharNumber, panNumber: data.panNumber, gstNumber: data.gstNumber,
    gstVerified: data.gstVerified ?? false, aadharVerified: data.aadharVerified ?? false,
    limits: { create: data.limits },
  }, include: { limits: true } });
  res.status(201).json(safeVendor(vendor));
});
router.patch('/admin/vendors/:id', async (req, res) => {
  const data = vendorUpdateSchema.parse(req.body);
  res.json(safeVendor(await db.vendor.update({ where: { id: req.params.id }, data: {
    name: data.name, enabled: data.enabled, email: data.email, phone: data.phone, aadharNumber: data.aadharNumber, panNumber: data.panNumber, gstNumber: data.gstNumber,
    gstVerified: data.gstVerified, aadharVerified: data.aadharVerified,
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
  const { body, attachments } = vendorMessageSchema.parse(req.body);
  res.status(201).json(await db.vendorMessage.create({ data: { vendorId: req.params.id, sender: 'ADMIN', body, attachments } }));
});
router.post('/admin/attachments', multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 1 } }).single('file'), async (req, res) => res.status(201).json(await uploadAttachment(req.file)));
router.patch('/admin/orders/:id/status', async (req, res) => {
  const { status } = z.object({ status: z.enum(['PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY']) }).parse(req.body);
  res.json(await changeStatus(req.params.id, status));
});
router.post('/admin/orders/:id/cancel', async (req, res) => {
  const { reason } = z.object({ reason: z.string().trim().min(1).max(300) }).parse(req.body);
  const order = await cancelOrder(req.actor, req.params.id, reason);
  await notify('PACKING', 'ORDER_CANCELLED', 'Do not pack this order', `Order #${order.id.slice(0, 10).toUpperCase()} was cancelled by the admin: ${reason}`, order.id);
  res.json(order);
});
router.post('/admin/orders/:id/deliver', loginLimiter, async (req, res) => {
  const { otp } = z.object({ otp: z.string().regex(/^\d{6}$/) }).parse(req.body);
  res.json(await deliver(req.params.id, otp));
});
// Sellers the admin has approved: their logins are handed out here, so
// they are enabled, disabled and reset here too.
router.get('/admin/sellers', async (req, res) => {
  const sellers = await db.seller.findMany({
    where: { deleted: false },
    include: { _count: { select: { products: { where: { active: true } }, items: true } }, application: { select: { address: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(sellers.map(({ passwordHash, sessionVersion, ...safe }) => safe));
});
router.patch('/admin/sellers/:id', async (req, res) => {
  const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
  // Turning a seller off ends their session as well as their next login.
  const seller = await db.seller.update({ where: { id: req.params.id }, data: { enabled, sessionVersion: { increment: 1 } } });
  const { passwordHash, sessionVersion, ...safe } = seller;
  res.json(safe);
});
router.post('/admin/sellers/:id/password', async (req, res) => {
  const { password } = vendorPasswordSchema.parse(req.body);
  await db.seller.update({ where: { id: req.params.id }, data: { passwordHash: await bcrypt.hash(password, 12), sessionVersion: { increment: 1 } } });
  res.status(204).end();
});
router.get('/admin/refunds', async (req, res) => res.json(await db.refund.findMany({ include: { orderItem: { include: { order: true } } }, orderBy: { createdAt: 'desc' }, take: 200 })));
router.patch('/admin/refunds/:id', async (req, res) => {
  const { status } = z.object({ status: z.enum(['APPROVED', 'REJECTED']) }).parse(req.body);
  res.json(await reviewRefund(req.params.id, status));
});

// ---- The seller panel (its own site; see Frontend/seller) ----
// A shop that sells through NTSA. It only ever sees its own stock and the
// order lines that belong to it -- never another seller's, and never the
// wholesale side.
const seller = roles('SELLER');
const sellerProductData = async (body, sellerId) => ({ ...await productData(body), sellerId });
router.get('/seller/products', seller, async (req, res) => res.json(await db.product.findMany({
  where: { sellerId: req.actor.id, active: true }, include: { category: true }, orderBy: { createdAt: 'desc' },
})));
router.post('/seller/products', seller, async (req, res) => res.status(201).json(await db.product.create({ data: await sellerProductData(req.body, req.actor.id) })));
router.put('/seller/products/:id', seller, async (req, res) => {
  // updateMany scopes the write to this seller, so guessing another shop's
  // product id changes nothing.
  const changed = await db.product.updateMany({ where: { id: req.params.id, sellerId: req.actor.id }, data: await sellerProductData(req.body, req.actor.id) });
  requireThat(changed.count === 1, 404, 'Product not found');
  res.json(await db.product.findUnique({ where: { id: req.params.id }, include: { category: true } }));
});
router.delete('/seller/products/:id', seller, async (req, res) => {
  const changed = await db.product.updateMany({ where: { id: req.params.id, sellerId: req.actor.id }, data: { active: false } });
  requireThat(changed.count === 1, 404, 'Product not found');
  res.status(204).end();
});
// The seller's sales: one row per order line of theirs, with just enough of
// the order to fulfil it. Another seller's lines in the same order are not
// included, and neither is the buyer's full address until it is theirs to
// pack -- the packing team handles delivery.
router.get('/seller/orders', seller, async (req, res) => {
  const items = await db.orderItem.findMany({
    where: { sellerId: req.actor.id },
    include: { order: { select: { id: true, status: true, createdAt: true, paymentMethod: true, vendorId: true } }, product: { select: { images: true } } },
    orderBy: { id: 'desc' }, take: 200,
  });
  res.json(items.map(({ order, product, ...item }) => ({ ...item, image: product.images[0] ?? null, orderId: order.id, status: order.status, placedAt: order.createdAt, buyer: order.vendorId ? 'Wholesale' : 'Customer' })));
});
// What the shop has earned: cancelled orders don't count, and money is only
// counted as earned once the order is delivered.
router.get('/seller/summary', seller, async (req, res) => {
  const items = await db.orderItem.findMany({ where: { sellerId: req.actor.id }, include: { order: { select: { status: true } } } });
  const live = items.filter(i => i.order.status !== 'CANCELLED');
  const value = rows => rows.reduce((sum, i) => sum + i.unitPaise * i.quantity, 0);
  res.json({
    products: await db.product.count({ where: { sellerId: req.actor.id, active: true } }),
    outOfStock: await db.product.count({ where: { sellerId: req.actor.id, active: true, stock: 0 } }),
    orders: new Set(live.map(i => i.orderId)).size,
    piecesSold: live.reduce((sum, i) => sum + i.quantity, 0),
    salesPaise: value(live),
    earnedPaise: value(live.filter(i => i.order.status === 'DELIVERED')),
    awaitingPaise: value(live.filter(i => i.order.status !== 'DELIVERED')),
    cancelledPaise: value(items.filter(i => i.order.status === 'CANCELLED')),
  });
});
// Photos for the seller's own products, watermarked like every other one.
router.post('/seller/images', seller, multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } }).single('image'), async (req, res) => res.status(201).json(await uploadImage(req.file, { watermark: true })));
