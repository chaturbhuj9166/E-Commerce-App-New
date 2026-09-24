import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const db = new PrismaClient();

const imageUrl = id => `https://images.unsplash.com/${id}?w=800&auto=format&fit=crop`;

const REVIEW_COMMENTS = [
  ['Excellent quality, exactly as described. Will buy again.', 5],
  ['Good value for money. Delivery was quick too.', 4],
  ['Works well, does what it says. Happy with the purchase.', 4],
  ['Amazing product! Better than I expected for this price.', 5],
  ['Decent, but packaging could be better.', 3],
  ['Really happy with this. Using it daily now.', 5],
  ['Good product overall, one minor issue but support helped.', 4],
  ['Perfect fit for what I needed. Highly recommend.', 5],
  ['Quality is fine, nothing extraordinary but does the job.', 3],
  ['Superb! Exceeded my expectations.', 5],
  ['Nice product, arrived on time and well packed.', 4],
  ['Satisfied with the purchase. Would order again.', 4],
  ['Great buy for the price point.', 5],
  ['Average experience, works as expected.', 3],
  ['Loved it! My family enjoys it too.', 5],
  ['Solid build quality. No complaints so far.', 4],
  ['Exactly what I was looking for.', 5],
  ['Good, but delivery took a bit longer than expected.', 3],
  ['Impressive quality for the price. Recommended.', 5],
  ['Works fine, matches the product description.', 4],
];

// Every image below was individually verified to be (a) reachable and (b) an
// actual photo of that product/color -- no cross-product placeholders. Where
// `colorImages` is set, the app shows that photo when the shopper picks that
// color (Product Details -> color chips); `images` is the general gallery,
// built only from photos that are genuinely of this product.
const samples = [
  {
    name: 'Everyday Wireless Headphones', category: 'Electronics', pricePaise: 499900, wholesalePaise: 349900, mrpPaise: 799900, deal: true,
    colors: ['Black', 'White', 'Blue'], sizes: [],
    colorImages: { Black: imageUrl('photo-1567928513899-997d98489fbd'), White: imageUrl('photo-1612116454817-2b0841e30eaf'), Blue: imageUrl('photo-1612858250434-b5358e2b3625') },
  },
  {
    name: 'Everyday Canvas Backpack', category: 'Fashion', pricePaise: 149900, wholesalePaise: 99900, mrpPaise: 249900, deal: true,
    colors: ['Black', 'Grey', 'Navy'], sizes: [],
    colorImages: { Black: imageUrl('photo-1594299447935-e5b840f54b9b'), Grey: imageUrl('photo-1550916867-c55efa8f29a0'), Navy: imageUrl('photo-1625013964767-0e4b3c041607') },
  },
  {
    name: 'Minimal Ceramic Mug', category: 'Home & Kitchen', pricePaise: 49900, wholesalePaise: 29900, mrpPaise: 89900, deal: true,
    colors: ['White', 'Black', 'Red'], sizes: [],
    colorImages: { White: imageUrl('photo-1546864558-fb3778ab5521'), Black: imageUrl('photo-1573298846509-eda41bf00803'), Red: imageUrl('photo-1628968434441-d9c1c66dcde7') },
  },
  {
    name: 'Daily Care Essentials', category: 'Beauty', pricePaise: 89900, wholesalePaise: 59900, mrpPaise: 149900, deal: false,
    colors: [], sizes: [], images: [imageUrl('photo-1556229010-6c3f2c9ca5f8')],
  },
  {
    name: 'Classic Running Shoes', category: 'Sports', pricePaise: 299900, wholesalePaise: 199900, mrpPaise: 499900, deal: false,
    colors: ['Black', 'White', 'Red'], sizes: ['6', '7', '8', '9', '10'],
    colorImages: { Black: imageUrl('photo-1653868248894-fd2882c61524'), White: imageUrl('photo-1562687769-3bc08bfc093f'), Red: imageUrl('photo-1542291026-7eec264c27ff') },
  },
  {
    name: 'Portable Bluetooth Speaker', category: 'Electronics', pricePaise: 199900, wholesalePaise: 139900, mrpPaise: 349900, deal: false,
    colors: ['Black', 'Blue', 'Red'], sizes: [],
    colorImages: { Black: imageUrl('photo-1511499271651-073325718d90'), Blue: imageUrl('photo-1692351014024-97edd83a7b5a'), Red: imageUrl('photo-1564975472884-a6e9fd24e967') },
  },
  {
    name: 'Budget Smartphone', category: 'Mobiles', pricePaise: 1299900, wholesalePaise: 999900, mrpPaise: 1599900, deal: false,
    colors: ['Black', 'Blue', 'Silver'], sizes: ['128GB', '256GB'], sizeLabel: 'Storage',
    // Every option carries its own price, so the bigger storage is dearer
    // and nothing is left sitting at the base price by accident.
    sizePrices: {
      '128GB': { pricePaise: 1299900, wholesalePaise: 999900, mrpPaise: 1599900 },
      '256GB': { pricePaise: 1499900, wholesalePaise: 1149900, mrpPaise: 1799900 },
    },
    // A colour can cost a little more too.
    colorExtraPaise: { Silver: 20000 },
    colorImages: { Black: imageUrl('photo-1563452619267-bc16ef6cecec'), Blue: imageUrl('photo-1575571538207-ca427b39def5'), Silver: imageUrl('photo-1565967249821-083c4775e5bc') },
  },
  {
    // No verified free photo of an air fryer specifically in black/white was
    // found (only a paid Unsplash+ one) -- one genuine kitchen-appliance
    // photo is used instead of guessing; add real product photos when ready.
    name: 'Compact Air Fryer 4L', category: 'Appliances', pricePaise: 349900, wholesalePaise: 249900, mrpPaise: 549900, deal: false,
    colors: ['Black', 'White'], sizes: [], images: [imageUrl('photo-1585659722983-3a675dabf23d')],
  },
  {
    name: '3-Seater Fabric Sofa', category: 'Furniture', pricePaise: 2499900, wholesalePaise: 1899900, mrpPaise: 3499900, deal: false,
    colors: ['Grey', 'Beige', 'Blue'], sizes: [],
    colorImages: { Grey: imageUrl('photo-1527772482340-7895c3f2b3f7'), Beige: imageUrl('photo-1523920020520-bc3e5db128b5'), Blue: imageUrl('photo-1613685301586-4f2b15f0ccd4') },
  },
  {
    name: 'Wooden Building Blocks Set', category: 'Toys & Games', pricePaise: 79900, wholesalePaise: 49900, mrpPaise: 129900, deal: false,
    colors: [], sizes: [], images: [imageUrl('photo-1587654780291-39c9404d746b')],
  },
  {
    name: 'Bestselling Fiction Novel', category: 'Books', pricePaise: 39900, wholesalePaise: 24900, mrpPaise: 59900, deal: false,
    colors: [], sizes: [], images: [imageUrl('photo-1544947950-fa07a98d237f')],
  },
  {
    name: 'Digital Kitchen Weighing Scale', category: 'Health', pricePaise: 69900, wholesalePaise: 44900, mrpPaise: 99900, deal: false,
    colors: [], sizes: [], images: [imageUrl('photo-1576678927484-cc907957088c')],
  },
  {
    name: 'Fresh Grocery Combo Pack', category: 'Grocery', pricePaise: 59900, wholesalePaise: 39900, mrpPaise: 79900, deal: false,
    colors: [], sizes: [], images: [imageUrl('photo-1542838132-92c53300491e')],
  },
];

// The dealer-only catalogue: bulk packs of the same stock, sold by the case
// rather than the piece. These only ever show in the wholesale portal, and
// the photo of each one is the photo of the item inside it.
const wholesaleSamples = [
  {
    name: 'Wireless Headphones — Carton of 20', category: 'Electronics', pricePaise: 7999900, wholesalePaise: 5999900, mrpPaise: 15998000,
    description: 'Sealed carton of 20 Everyday Wireless Headphones, mixed colours on request. Dealer rate per carton.',
    images: [imageUrl('photo-1567928513899-997d98489fbd'), imageUrl('photo-1612116454817-2b0841e30eaf')],
  },
  {
    name: 'Canvas Backpack — Bundle of 25', category: 'Fashion', pricePaise: 3299900, wholesalePaise: 2249900, mrpPaise: 6247500,
    description: 'Bundle of 25 Everyday Canvas Backpacks. Pick one colour per bundle.',
    colors: ['Black', 'Grey', 'Navy'],
    colorImages: { Black: imageUrl('photo-1594299447935-e5b840f54b9b'), Grey: imageUrl('photo-1550916867-c55efa8f29a0'), Navy: imageUrl('photo-1625013964767-0e4b3c041607') },
  },
  {
    name: 'Ceramic Mugs — Case of 48', category: 'Home & Kitchen', pricePaise: 1999900, wholesalePaise: 1299900, mrpPaise: 4315200,
    description: 'Case of 48 Minimal Ceramic Mugs, packed with dividers. Dealer rate per case.',
    colors: ['White', 'Black', 'Red'],
    colorImages: { White: imageUrl('photo-1546864558-fb3778ab5521'), Black: imageUrl('photo-1573298846509-eda41bf00803'), Red: imageUrl('photo-1628968434441-d9c1c66dcde7') },
  },
  {
    name: 'Running Shoes — Case of 12', category: 'Sports', pricePaise: 2699900, wholesalePaise: 1799900, mrpPaise: 5998800,
    description: 'Case of 12 pairs of Classic Running Shoes in one size. Choose the size when ordering.',
    colors: ['Black', 'White', 'Red'], sizes: ['6', '7', '8', '9', '10'], sizeLabel: 'Size',
    colorImages: { Black: imageUrl('photo-1653868248894-fd2882c61524'), White: imageUrl('photo-1562687769-3bc08bfc093f'), Red: imageUrl('photo-1542291026-7eec264c27ff') },
  },
  {
    name: 'Bluetooth Speakers — Carton of 15', category: 'Electronics', pricePaise: 2499900, wholesalePaise: 1799900, mrpPaise: 5248500,
    description: 'Carton of 15 Portable Bluetooth Speakers. Dealer rate per carton.',
    colors: ['Black', 'Blue', 'Red'],
    colorImages: { Black: imageUrl('photo-1511499271651-073325718d90'), Blue: imageUrl('photo-1692351014024-97edd83a7b5a'), Red: imageUrl('photo-1564975472884-a6e9fd24e967') },
  },
  {
    name: 'Kitchen Weighing Scales — Box of 30', category: 'Health', pricePaise: 1499900, wholesalePaise: 999900, mrpPaise: 2997000,
    description: 'Box of 30 Digital Kitchen Weighing Scales, individually boxed.',
    images: [imageUrl('photo-1576678927484-cc907957088c')],
  },
  {
    name: 'Grocery Combo — Pallet of 50', category: 'Grocery', pricePaise: 2299900, wholesalePaise: 1699900, mrpPaise: 3995000,
    description: 'Pallet of 50 Fresh Grocery Combo Packs. Same-week dispatch only.',
    images: [imageUrl('photo-1542838132-92c53300491e')],
  },
];

try {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) throw new Error('Set SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of at least 12 characters');
  await db.admin.upsert({ where: { email }, update: {}, create: { email, passwordHash: await bcrypt.hash(password, 12) } });

  // Matches the 12-category grid on the Home screen (REAL-NTSA-1.png) --
  // names must stay in sync with iconForCategory() in the Flutter app
  // (Frontend/customer/lib/widgets/category_icon.dart).
  // Third value is the return window in hours: perishables get a couple of
  // hours, furniture a week. Fourth says whether refurbished / open-box
  // stock belongs here -- a phone or a sofa can be open-box, atta cannot.
  // The admin can change both later; every product inherits its category's
  // window.
  const categories = [
    ['Electronics', 'electronics', 48, true], ['Fashion', 'fashion', 24, false], ['Grocery', 'grocery', 2, false], ['Beauty', 'beauty', 2, false],
    ['Home & Kitchen', 'home_kitchen', 24, false], ['Mobiles', 'mobiles', 24, true], ['Appliances', 'appliances', 48, true], ['Furniture', 'furniture', 168, true],
    ['Toys & Games', 'toys', 24, false], ['Sports', 'sports', 48, false], ['Books', 'books', 24, false], ['Health', 'health', 24, false],
    ['Lawn & Garden', 'lawn_garden', 48, false],
  ];
  for (const [name, icon, refundWindowHours, allowsUsedStock] of categories) {
    await db.category.upsert({ where: { name }, update: { refundWindowHours, allowsUsedStock }, create: { name, icon, refundWindowHours, allowsUsedStock } });
  }

  const productIds = [];
  for (const [index, s] of samples.entries()) {
    const c = await db.category.findUnique({ where: { name: s.category } });
    const id = `sample-${index + 1}`;
    // The gallery is the product's own photo(s): every color's photo when
    // it has colors, otherwise the single photo given explicitly.
    const images = s.colorImages ? Object.values(s.colorImages) : s.images;
    const fields = {
      name: s.name, description: 'Thoughtfully selected for your everyday. Quality you can count on, at a price you will love.',
      categoryId: c.id, pricePaise: s.pricePaise, wholesalePaise: s.wholesalePaise, mrpPaise: s.mrpPaise,
      // Returns are a property of the category now, not of each product.
      refundWindowHours: c.refundWindowHours,
      images, colors: s.colors, sizes: s.sizes, sizeLabel: s.sizeLabel ?? 'Size', sizePrices: s.sizePrices ?? null,
      colorImages: s.colorImages ?? null, colorExtraPaise: s.colorExtraPaise ?? null, deal: s.deal,
      // Shop stock; the dealer-only lots are seeded separately below.
      audience: 'RETAIL',
    };
    await db.product.upsert({ where: { id }, update: fields, create: { id, stock: 100, ...fields } });
    productIds.push({ id, images });
  }

  // Products created before the shop and wholesale catalogues were split
  // showed on both sides. Move them to the shop, once, so the wholesale
  // portal starts from the dealer lots below and nothing else.
  if (await db.product.count({ where: { audience: 'WHOLESALE' } }) === 0) {
    await db.product.updateMany({ where: { audience: 'BOTH' }, data: { audience: 'RETAIL' } });
  }

  for (const [index, s] of wholesaleSamples.entries()) {
    const c = await db.category.findUnique({ where: { name: s.category } });
    const images = s.colorImages ? Object.values(s.colorImages) : s.images;
    const fields = {
      name: s.name, description: s.description, categoryId: c.id,
      pricePaise: s.pricePaise, wholesalePaise: s.wholesalePaise, mrpPaise: s.mrpPaise, refundWindowHours: c.refundWindowHours,
      images, colors: s.colors ?? [], sizes: s.sizes ?? [], sizeLabel: s.sizeLabel ?? 'Size',
      sizePrices: null, colorImages: s.colorImages ?? null, deal: false, audience: 'WHOLESALE',
    };
    const id = `wholesale-${index + 1}`;
    await db.product.upsert({ where: { id }, update: fields, create: { id, stock: 40, ...fields } });
  }

  if (await db.banner.count() === 0) {
    await db.banner.create({ data: { title: 'Great Products\nBetter Living', buttonText: 'Shop Now', backgroundColor: '#13224A', sortOrder: 0 } });
  }

  if (await db.coupon.count() === 0) {
    await db.coupon.createMany({ data: [
      { code: 'NTSA500', description: 'Flat ₹500 off on orders above ₹4,999', discountType: 'FLAT', value: 50000, minOrderPaise: 499900 },
      { code: 'NTSAUPI', description: '10% cashback on UPI payments (up to ₹200)', discountType: 'PERCENT', value: 10, maxDiscountPaise: 20000 },
      { code: 'NTSAFD', description: 'Free delivery on your first order', discountType: 'FLAT', value: 5000, minOrderPaise: 1 },
    ] });
  }

  // ~20 demo reviewers so every product can show a realistic 15-20 reviews.
  // Real reviews still require a DELIVERED order (see POST /products/:id/reviews),
  // so these are seeded directly rather than through the API. Any attached
  // review photo is one of that SAME product's own images, never another
  // product's, so it never shows the wrong item.
  const reviewers = [];
  for (let i = 1; i <= 20; i++) {
    const user = await db.user.upsert({
      where: { firebaseUid: `seed-reviewer-${i}` },
      update: {},
      create: { firebaseUid: `seed-reviewer-${i}`, name: `NTSA Customer ${i}`, email: `reviewer${i}@ntsa.local` },
    });
    reviewers.push(user);
  }
  for (const [pIndex, { id: productId, images }] of productIds.entries()) {
    for (const [rIndex, reviewer] of reviewers.entries()) {
      const [comment, rating] = REVIEW_COMMENTS[(pIndex + rIndex) % REVIEW_COMMENTS.length];
      const withPhoto = rIndex % 4 === 0;
      const fields = { rating, comment, images: withPhoto ? [images[rIndex % images.length]] : [] };
      await db.review.upsert({
        where: { userId_productId: { userId: reviewer.id, productId } },
        update: fields,
        create: { userId: reviewer.id, productId, ...fields },
      });
    }
  }

  if (process.env.DEMO_MODE === 'true') {
    const vendorPassword = 'Wholesale@123';
    await db.vendor.upsert({
      where: { username: 'demo_wholesaler' },
      update: {},
      create: {
        name: 'Demo Wholesale Vendor', username: 'demo_wholesaler', passwordHash: await bcrypt.hash(vendorPassword, 12),
        limits: { create: { minPaise: 1000000, maxPaise: 50000000 } }, // ₹10,000 - ₹5,00,000 per order
      },
    });
    console.log(`Demo wholesaler login -> username: demo_wholesaler / password: ${vendorPassword}`);
  }
  console.log('Seed complete. Existing accounts and products were preserved.');
} finally { await db.$disconnect(); }
