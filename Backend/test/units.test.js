// Unit tests for the pure helpers. The full HTTP suite runs separately
// against a seeded test database.
import test from 'node:test';
import assert from 'node:assert/strict';
import { watermarkTransformation } from '../src/services/storage.js';
import { variantFor, priceFor, publicSizePrices } from '../src/lib/variants.js';

test('no watermark until a logo is configured', () => {
  assert.equal(watermarkTransformation(undefined), undefined);
  assert.equal(watermarkTransformation(''), undefined);
});

test('watermark sits bottom-right and scales with the photo', () => {
  const [t] = watermarkTransformation('ntsa/brand/logo');
  assert.equal(t.overlay, 'ntsa:brand:logo'); // Cloudinary folder separator
  assert.equal(t.gravity, 'south_east');
  assert.equal(t.flags, 'relative');
  assert.equal(t.width, '0.18');
  assert.ok(t.opacity > 0 && t.opacity <= 100);
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
