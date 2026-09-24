import { z } from 'zod';
import { MAX_MONEY } from './rules.js';
import { config } from '../config.js';
export { z };
const text = z.string().trim().min(1).max(200);
export const money = z.number().int().min(1).max(MAX_MONEY);
export const addressSchema = z.object({ name: text, phone: z.string().regex(/^\+?[0-9]{10,15}$/), line1: text, city: text, state: text, postalCode: z.string().regex(/^[0-9]{6}$/) });
// DEMO_MODE also allows plain http:// so admin/products/:id images can point
// at the local dev upload server (services/storage.js) before Cloudinary is
// configured; production always requires HTTPS.
export const imageUrlSchema = z.string().url().refine(v => v.startsWith('https://') || (config.DEMO_MODE && v.startsWith('http://')), 'Image URL must use HTTPS');
const optionList = z.array(z.string().trim().min(1).max(30)).max(10).default([]);
export const productSchema = z.object({ name: text, description: z.string().trim().min(1).max(5000), pricePaise: money, wholesalePaise: money,
  // Optional fields also accept null so an edit can clear them (undefined
  // would leave the stored value unchanged).
  mrpPaise: money.nullable().optional(), stock: z.number().int().min(0).max(1000000), categoryId: text,
  images: z.array(imageUrlSchema).max(5),
  sizes: optionList, colors: optionList,
  // What the size-like option is called in the app, e.g. "Size", "Storage".
  sizeLabel: z.string().trim().min(1).max(30).default('Size'),
  // Optional per-option prices, e.g. { "256GB": { pricePaise, wholesalePaise, mrpPaise } }.
  sizePrices: z.record(z.string(), z.object({ pricePaise: money, wholesalePaise: money, mrpPaise: money.nullable().optional() })).nullable().optional(),
  // Optional per-color photo, e.g. { "Black": "https://...", "White": "https://..." }.
  colorImages: z.record(z.string(), imageUrlSchema).nullable().optional(),
  // What a color adds to the price, e.g. { "Red": 5000 } for 50 rupees more.
  colorExtraPaise: z.record(z.string(), z.number().int().min(0).max(MAX_MONEY)).nullable().optional(),
  // Free-form extra specs, e.g. [{ label: "Capacity", value: "20L" }] -- for
  // anything that doesn't fit a fixed field.
  attributes: z.array(z.object({ label: z.string().trim().min(1).max(50), value: z.string().trim().min(1).max(200) })).max(20).default([]),
  // Refurbished / open-box stock is flagged here; NEW products say nothing.
  condition: z.enum(['NEW', 'REFURBISHED', 'OPEN_BOX', 'USED']).default('NEW'),
  // Wholesale-only stock is added from its own page in the panel and is
  // never shown in the shopping app.
  audience: z.enum(['RETAIL', 'WHOLESALE', 'BOTH']).default('BOTH'),
  conditionNote: z.string().trim().max(200).nullable().optional(),
  deal: z.boolean().default(false),
  // Note: no refundWindowHours. The return window is set once per category
  // and copied onto the product whenever it is saved.
}).refine(v => v.wholesalePaise <= v.pricePaise, 'Wholesale price cannot exceed retail price')
  .refine(v => !v.mrpPaise || v.mrpPaise >= v.pricePaise, 'MRP cannot be lower than the selling price')
  .refine(v => Object.keys(v.sizePrices ?? {}).every(k => v.sizes.includes(k)), 'Option prices must match one of the listed options')
  .refine(v => Object.keys(v.colorExtraPaise ?? {}).every(k => v.colors.includes(k)), 'A color price difference must match one of the listed colors')
  // A bag of 10kg atta priced like the 5kg one is almost always a slip, so
  // an option either has its own price or is deliberately marked as costing
  // the same -- it cannot be left half-filled.
  .refine(v => {
    const priced = Object.keys(v.sizePrices ?? {}).length;
    return priced === 0 || priced === v.sizes.length;
  }, 'Give every option its own price, or leave them all blank to charge the same for each')
  .refine(v => Object.values(v.sizePrices ?? {}).every(o => o.wholesalePaise <= o.pricePaise), 'An option\'s wholesale price cannot exceed its retail price')
  .refine(v => Object.values(v.sizePrices ?? {}).every(o => !o.mrpPaise || o.mrpPaise >= o.pricePaise), 'An option\'s MRP cannot be lower than its selling price');
export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(1).max(1000),
  images: z.array(imageUrlSchema).max(3).default([]),
});
export const limitSchema = z.object({ minPaise: money, maxPaise: money }).refine(v => v.minPaise <= v.maxPaise, 'Minimum must not exceed maximum');
// Wholesale partner KYC, per the client's brief: the super admin fills this
// in when onboarding a vendor (not self-service). Fields are optional so an
// admin can add them later, but each is validated when provided.
const vendorContact = {
  email: z.string().trim().toLowerCase().email().max(200).nullable().optional(),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/).nullable().optional(),
  aadharNumber: z.string().regex(/^[0-9]{12}$/, 'Aadhaar number must be exactly 12 digits').nullable().optional(),
  panNumber: z.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Enter a valid PAN (e.g. ABCDE1234F)').nullable().optional(),
  gstNumber: z.string().trim().toUpperCase().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/, 'Enter a valid 15-character GST number').nullable().optional(),
  // Ticked by the admin once the documents have been checked by hand.
  gstVerified: z.boolean().optional(),
  aadharVerified: z.boolean().optional(),
};
export const vendorCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  // The admin picks these directly -- no auto-generated credentials.
  username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9_.-]+$/, 'Only letters, numbers, dots, hyphens and underscores'),
  password: z.string().min(8).max(100),
  ...vendorContact,
  limits: limitSchema,
});
export const vendorUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  enabled: z.boolean().optional(),
  ...vendorContact,
  limits: limitSchema.optional(),
});
export const vendorPasswordSchema = z.object({ password: z.string().min(8).max(100) });
// Admin-panel staff: the packing team and the sales team.
export const deliveryRuleSchema = z.object({
  belowPaise: money,
  // 0 is allowed: "free below this amount".
  chargePaise: z.number().int().min(0).max(MAX_MONEY),
});
export const blockedPincodeSchema = z.object({
  pincode: z.string().trim().regex(/^[0-9]{6}$/, 'Enter a 6-digit PIN code'),
  reason: z.string().trim().max(200).nullable().optional(),
});
export const staffRole = z.enum(['ADMIN', 'PACKING', 'SALES']);
export const staffCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(100),
  role: staffRole,
});
export const staffUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  role: staffRole.optional(),
  enabled: z.boolean().optional(),
});
// A shopkeeper the sales team signs up; the admin checks the details and
// hands out seller panel credentials.
export const sellerApplicationSchema = z.object({
  shopName: z.string().trim().min(1).max(150),
  ownerName: z.string().trim().min(1).max(100),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/),
  email: z.string().trim().toLowerCase().email().max(200).nullable().optional(),
  address: z.string().trim().min(1).max(500),
  gstNumber: z.string().trim().toUpperCase().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/, 'Enter a valid 15-character GST number').nullable().optional(),
  aadharNumber: z.string().regex(/^[0-9]{12}$/, 'Aadhaar number must be exactly 12 digits').nullable().optional(),
  documents: z.array(imageUrlSchema).max(6).default([]),
});
export const sellerApproveSchema = z.object({
  username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9_.-]+$/, 'Only letters, numbers, dots, hyphens and underscores'),
  password: z.string().min(8).max(100),
  gstVerified: z.boolean().default(false),
  aadharVerified: z.boolean().default(false),
});
// A chat message carries text, attachments, or both -- a wholesaler can send
// a photo of damaged stock with nothing typed.
export const mediaUrlSchema = z.string().url().refine(v => v.startsWith('https://') || (config.DEMO_MODE && v.startsWith('http://')), 'Attachment URL must use HTTPS');
export const vendorMessageSchema = z.object({
  body: z.string().trim().max(1000).default(''),
  attachments: z.array(mediaUrlSchema).max(4).default([]),
}).refine(v => v.body.length > 0 || v.attachments.length > 0, 'Write a message or attach a photo');
// The Home screen's top banner/slider, fully admin-managed.
export const bannerSchema = z.object({
  title: z.string().trim().min(1).max(100),
  subtitle: z.string().trim().max(200).nullable().optional(),
  imageUrl: imageUrlSchema.nullable().optional(),
  // A banner may be a short clip instead of a still.
  videoUrl: mediaUrlSchema.nullable().optional(),
  backgroundColor: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, 'Use a hex color like #13224A').nullable().optional(),
  buttonText: z.string().trim().min(1).max(30).default('Shop Now'),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});
// Coupon codes are matched case-insensitively but stored uppercase.
const couponCode = z.string().trim().toUpperCase().min(3).max(30).regex(/^[A-Z0-9]+$/, 'Only letters and numbers');
export const couponSchema = z.object({
  code: couponCode,
  description: z.string().trim().max(200).default(''),
  discountType: z.enum(['PERCENT', 'FLAT']),
  value: z.number().int().min(1),
  minOrderPaise: money.optional().default(1),
  maxDiscountPaise: money.nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  expiresAt: z.string().datetime().optional(),
  active: z.boolean().default(true),
}).refine(v => v.discountType !== 'PERCENT' || v.value <= 100, 'A percent discount cannot exceed 100');
export const checkoutSchema = z.object({
  items: z.array(z.object({ productId: text, quantity: z.number().int().min(1).max(10000), size: z.string().trim().max(30).optional(), color: z.string().trim().max(30).optional() })).min(1).max(100)
    .refine(items => new Set(items.map(i => `${i.productId}|${i.size ?? ''}|${i.color ?? ''}`)).size === items.length, 'Duplicate products are not allowed'),
  addressId: text.optional(), address: addressSchema.optional(),
  paymentMethod: z.enum(['COD', 'WALLET', 'RAZORPAY', 'DEMO']),
  couponCode: couponCode.optional(),
  checkoutKey: z.string().uuid(),
});
