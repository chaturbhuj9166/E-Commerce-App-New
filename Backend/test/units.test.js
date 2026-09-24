// Unit tests for the pure helpers. The full HTTP suite runs separately
// against a seeded test database.
import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { stampLogo } from '../src/services/watermark.js';
import { variantFor, priceFor, publicSizePrices } from '../src/lib/variants.js';

const photo = (width, height) => sharp({ create: { width, height, channels: 3, background: '#dddddd' } }).jpeg().toBuffer();

test('the logo is stamped into the bottom-right corner', async () => {
  const before = await photo(800, 600);
  const after = await stampLogo(before, { format: 'png' });
  const { width, height } = await sharp(after).metadata();
  assert.equal(width, 800);
  assert.equal(height, 600);
  // The plain grey corner should no longer be plain grey.
  // stats() reads the source image, so each region has to be cut out first.
  const region = async box => (await sharp(await sharp(after).extract(box).toBuffer()).stats()).channels;
  const corner = await region({ left: 660, top: 480, width: 120, height: 100 });
  assert.ok(corner.some(c => c.stdev > 5), 'expected the logo to show in the corner');
  // ...while the opposite corner keeps the flat colour it started with.
  const far = await region({ left: 0, top: 0, width: 120, height: 100 });
  assert.ok(far.every(c => c.stdev < 5), 'the rest of the photo must be left alone');
});

test('a thumbnail too small to mark is left as it is', async () => {
  const tiny = await photo(80, 80);
  assert.equal(await stampLogo(tiny), tiny);
});

test('an unreadable upload is passed through rather than failing', async () => {
  const notAnImage = Buffer.from('hello');
  assert.equal(await stampLogo(notAnImage), notAnImage);
});

const shoes = { name: 'Shoes', sizes: ['7', '8'], colors: ['Black'], sizeLabel: 'Size', pricePaise: 299900, wholesalePaise: 199900, mrpPaise: 499900, sizePrices: null };
const phone = { ...shoes, name: 'Phone', sizes: ['128GB', '256GB'], sizeLabel: 'Storage', pricePaise: 1299900, wholesalePaise: 999900, mrpPaise: 1599900,
  sizePrices: { '256GB': { pricePaise: 1499900, wholesalePaise: 1149900, mrpPaise: 1799900 } } };

test('a size and colour must be picked when the product has them', () => {
  assert.throws(() => variantFor(shoes, '', 'Black'), /select a size/i);
  assert.throws(() => variantFor(shoes, '8', ''), /select a color/i);
  assert.throws(() => variantFor(shoes, '13', 'Black'), /not available/i);
  assert.deepEqual(variantFor(shoes, '8', 'Black'), { size: '8', color: 'Black' });
});

test('products without options ignore any pick', () => {
  const plain = { name: 'Book', sizes: [], colors: [], sizeLabel: 'Size' };
  assert.deepEqual(variantFor(plain, '8', 'Black'), { size: '', color: '' });
});

test('an option can carry its own price', () => {
  assert.deepEqual(priceFor(phone, '128GB'), { pricePaise: 1299900, wholesalePaise: 999900, mrpPaise: 1599900 });
  assert.deepEqual(priceFor(phone, '256GB'), { pricePaise: 1499900, wholesalePaise: 1149900, mrpPaise: 1799900 });
  assert.equal(priceFor(shoes, '8').pricePaise, 299900); // falls back to the product price
});

test('shoppers never see wholesale prices for an option', () => {
  const shown = publicSizePrices(phone.sizePrices);
  assert.equal(shown['256GB'].wholesalePaise, undefined);
  assert.equal(shown['256GB'].pricePaise, 1499900);
});
