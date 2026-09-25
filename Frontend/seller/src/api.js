// In dev, Vite's own proxy (vite.config.js) forwards a relative /api path to
// the local backend. In production there's no such proxy, so VITE_API_URL
// must point straight at the deployed backend -- a static site's own
// Redirect/Rewrite rules only reliably handle GET navigation, not POST
// bodies, so routing API calls through one silently breaks every write.
const API_BASE = import.meta.env.VITE_API_URL || '/api';
export async function api(path, options = {}) {
  const token = sessionStorage.getItem('ntsa-token');
  const form = options.body instanceof FormData;
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...(!form ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }, body: options.body ? (form ? options.body : JSON.stringify(options.body)) : undefined });
  } catch {
    throw new Error('Could not reach the NTSA server. Check your connection and try again.');
  }
  if (response.status === 204) return null;
  // A non-JSON body (e.g. a proxy/rate-limit page, or the dev server
  // restarting mid-request) would otherwise surface as a cryptic
  // "Unexpected end of JSON input" -- read as text first so we can give a
  // clear message instead.
  const raw = await response.text();
  let data = null;
  if (raw) {
    try { data = JSON.parse(raw); } catch {
      throw new Error(response.ok ? 'Unexpected response from the server. Please try again.' : `Server error (${response.status}). Please try again in a moment.`);
    }
  }
  if (!response.ok) throw new Error(data?.error || 'Request failed');
  return data;
}
export const money = amount => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format((amount || 0) / 100);
export function paise(value) {
  if (!/^\d+(\.\d{1,2})?$/.test(String(value))) throw new Error('Enter a positive amount with at most two decimal places');
  const [whole, fraction = ''] = String(value).split('.'); return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
// A free, offline nudge so a product doesn't land in the wrong category --
// no AI call, just a keyword match against what each category usually
// holds. It only ever suggests; the admin or seller still picks.
const CATEGORY_KEYWORDS = {
  'Electronics': ['speaker', 'headphone', 'earphone', 'earbud', 'camera', 'laptop', 'charger', 'cable', 'television', ' tv', 'bluetooth', 'router', 'power bank', 'smartwatch', 'projector', 'trimmer'],
  'Fashion': ['shirt', 'kurta', 'saree', 'jeans', 'dress', 'jacket', 'shoe', 'sandal', 't-shirt', 'tshirt', 'handbag', 'wallet', 'belt', 'sunglasses', 'cap ', 'sock', 'kurti', 'lehenga'],
  'Grocery': ['atta', 'rice', 'dal ', 'cooking oil', 'sugar', ' tea ', 'coffee', 'spice', 'masala', 'snack', 'biscuit', 'flour', 'pulses', 'grocery', 'pickle', 'ghee'],
  'Beauty': ['cream', 'lotion', 'shampoo', 'soap', 'makeup', 'lipstick', 'perfume', 'face wash', 'moisturizer', 'serum', 'sunscreen', 'nail polish', 'kajal'],
  'Home & Kitchen': ['mug', 'plate', 'bottle', 'cookware', 'frying pan', 'kettle', 'storage box', 'container', 'curtain', 'bedsheet', 'pillow', 'kitchen', 'utensil', 'dinner set'],
  'Mobiles': ['smartphone', 'mobile phone', ' phone', 'sim card', 'screen guard', 'back cover', 'android', 'iphone'],
  'Appliances': ['air fryer', 'mixer', 'grinder', 'refrigerator', 'fridge', 'washing machine', 'microwave', 'iron', 'ceiling fan', 'cooler', 'heater', 'geyser', ' ac ', 'air conditioner', 'vacuum cleaner'],
  'Furniture': ['sofa', 'chair', 'dining table', 'wardrobe', 'cabinet', 'bookshelf', 'study desk', 'mattress', 'stool', 'bed frame'],
  'Toys & Games': [' toy', 'board game', 'puzzle', 'doll', 'building block', 'lego', 'remote control car', 'action figure'],
  'Sports': ['cricket bat', 'football', 'racket', 'bicycle', 'dumbbell', 'yoga mat', 'gym', 'fitness band', 'running shoe', 'sports shoe'],
  'Books': ['novel', 'textbook', 'notebook', 'diary', 'magazine', 'storybook'],
  'Health': ['weighing scale', 'thermometer', 'bp monitor', 'vitamin', 'supplement', 'face mask', 'sanitizer', 'first aid'],
  'Lawn & Garden': ['plant pot', 'seeds', 'garden', 'lawn mower', 'garden hose', 'fertilizer', 'gardening', 'flower pot'],
};
export function suggestCategory(text, categories) {
  const t = ` ${(text || '').toLowerCase()} `;
  if (!t.trim()) return null;
  let bestName = null, bestScore = 0;
  for (const [name, words] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = words.filter(w => t.includes(w)).length;
    if (score > bestScore) { bestScore = score; bestName = name; }
  }
  if (!bestName) return null;
  const category = categories.find(c => c.name === bestName);
  return category ? { id: category.id, name: category.name } : null;
}
