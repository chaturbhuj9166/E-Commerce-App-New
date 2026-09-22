import { requireThat } from './rules.js';

// Checks a shopper's size/color pick against the product. `required` makes an
// unpicked option an error (customers); otherwise it's allowed to stay blank.
// Returns the normalized pick, "" for an option the product doesn't have.
export function variantFor(product, size, color, { required = true } = {}) {
  const label = (product.sizeLabel || 'Size').toLowerCase();
  const s = product.sizes.length ? (size || '') : '';
  const c = product.colors.length ? (color || '') : '';
  requireThat(!required || !product.sizes.length || s, 400, `Please select a ${label} for ${product.name}`);
  requireThat(!s || product.sizes.includes(s), 400, `The selected ${label} is not available for ${product.name}`);
  requireThat(!required || !product.colors.length || c, 400, `Please select a color for ${product.name}`);
  requireThat(!c || product.colors.includes(c), 400, `The selected color is not available for ${product.name}`);
  return { size: s, color: c };
}

// Prices for one option; options without an override use the product's own.
export function priceFor(product, size) {
  const o = size ? product.sizePrices?.[size] : null;
  if (!o) return { pricePaise: product.pricePaise, wholesalePaise: product.wholesalePaise, mrpPaise: product.mrpPaise };
  return { pricePaise: o.pricePaise, wholesalePaise: o.wholesalePaise, mrpPaise: o.mrpPaise ?? null };
}

// sizePrices as shoppers may see it: wholesale prices stripped.
export function publicSizePrices(sizePrices) {
  if (!sizePrices) return sizePrices;
  return Object.fromEntries(Object.entries(sizePrices).map(([k, { wholesalePaise, ...rest }]) => [k, rest]));
}
