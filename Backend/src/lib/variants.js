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

// What one variant costs. The option (10kg, 256GB, ...) sets the price, and
// the color adds its extra on top -- so 10kg costs more than 5kg, and the red
// one can cost a little more again. An option or color with nothing of its
// own simply uses the product's price.
export function priceFor(product, size, color) {
  const o = size ? product.sizePrices?.[size] : null;
  const extra = (color && product.colorExtraPaise?.[color]) || 0;
  const base = o
    ? { pricePaise: o.pricePaise, wholesalePaise: o.wholesalePaise, mrpPaise: o.mrpPaise ?? null }
    : { pricePaise: product.pricePaise, wholesalePaise: product.wholesalePaise, mrpPaise: product.mrpPaise ?? null };
  if (!extra) return base;
  return {
    pricePaise: base.pricePaise + extra,
    wholesalePaise: base.wholesalePaise + extra,
    mrpPaise: base.mrpPaise === null ? null : base.mrpPaise + extra,
  };
}

// sizePrices as shoppers may see it: wholesale prices stripped.
export function publicSizePrices(sizePrices) {
  if (!sizePrices) return sizePrices;
  return Object.fromEntries(Object.entries(sizePrices).map(([k, { wholesalePaise, ...rest }]) => [k, rest]));
}
