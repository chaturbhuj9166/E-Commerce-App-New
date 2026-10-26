// Photo search: given a shopper's photo, rank the catalog by how much each
// product looks like it.
//
// It runs OpenAI's CLIP model on this server (via Transformers.js / ONNX), so
// there is no paid API and no key. CLIP maps pictures and text into the same
// space, which gives two signals per product:
//   - picture vs the product's own photos  (same item, similar item)
//   - picture vs "a photo of <name>, <category>"  (what it is, even when the
//     catalog photo looks different from the shopper's)
// Product vectors are computed once and kept in memory, keyed by name/category/
// photos so an edited product is re-embedded automatically.
import { AutoProcessor, AutoTokenizer, CLIPVisionModelWithProjection, CLIPTextModelWithProjection, RawImage } from '@huggingface/transformers';

const MODEL = 'Xenova/clip-vit-base-patch32';

/**
 * The model needs roughly 0.5-1 GB of RAM, more than a free Render instance
 * has. So it is on by default everywhere except Render, and can be forced
 * either way with VISUAL_SEARCH=on|off.
 */
export function visualSearchEnabled() {
  const flag = process.env.VISUAL_SEARCH;
  if (flag === 'on') return true;
  if (flag === 'off') return false;
  return !process.env.RENDER_EXTERNAL_URL;
}
// How many of a product's photos to compare against (the first ones show it best).
const PHOTOS_PER_PRODUCT = 2;

let engine = null;
function load() {
  engine ??= Promise.all([
    AutoProcessor.from_pretrained(MODEL),
    AutoTokenizer.from_pretrained(MODEL),
    CLIPVisionModelWithProjection.from_pretrained(MODEL),
    CLIPTextModelWithProjection.from_pretrained(MODEL),
  ]).then(([processor, tokenizer, vision, text]) => ({ processor, tokenizer, vision, text }))
    .catch(e => { engine = null; throw e; });
  return engine;
}

const unit = v => { let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n) || 1; return Array.from(v, x => x / n); };
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

async function toRawImage(image) {
  if (Buffer.isBuffer(image)) return RawImage.fromBlob(new Blob([image]));
  return RawImage.read(image);
}
export async function embedImage(image) {
  const { processor, vision } = await load();
  const { image_embeds } = await vision(await processor(await toRawImage(image)));
  return unit(image_embeds.data);
}
export async function embedText(text) {
  const { tokenizer, text: model } = await load();
  const { text_embeds } = await model(tokenizer([text], { padding: true, truncation: true }));
  return unit(text_embeds.data);
}

const index = new Map(); // productId -> { key, photos: number[][], text: number[] }
const keyOf = p => `${p.name}|${p.category?.name ?? ''}|${(p.images || []).slice(0, PHOTOS_PER_PRODUCT).join(',')}`;

async function indexProduct(p) {
  const key = keyOf(p);
  const hit = index.get(p.id);
  if (hit?.key === key) return hit;
  const photos = [];
  for (const url of (p.images || []).slice(0, PHOTOS_PER_PRODUCT)) {
    // A broken or unreachable photo just means one fewer signal for this product.
    try { photos.push(await embedImage(url)); } catch { /* skip */ }
  }
  const text = await embedText(`a photo of ${p.name}${p.category?.name ? `, ${p.category.name}` : ''}`);
  const entry = { key, photos, text };
  index.set(p.id, entry);
  return entry;
}

/** Embeds the whole catalog ahead of time so the first shopper doesn't wait. */
export async function warmUp(products) {
  await load();
  for (const p of products) await indexProduct(p);
  return index.size;
}

/**
 * Ranks [products] against a shopper's photo (a Buffer). Returns
 * [{ product, score, imageSim }] best first. `score` blends photo-to-photo
 * similarity with how well the product's name matches what the photo shows.
 */
export async function rankByImage(photo, products) {
  const query = await embedImage(photo);
  const rows = [];
  for (const product of products) rows.push({ product, entry: await indexProduct(product) });

  // CLIP's text match is only meaningful relative to the other products, so
  // turn it into a share of 1 across the catalog (softmax at CLIP's scale).
  const textSims = rows.map(r => dot(query, r.entry.text));
  const top = Math.max(...textSims);
  const exps = textSims.map(s => Math.exp(100 * (s - top)));
  const total = exps.reduce((a, b) => a + b, 0) || 1;

  return rows.map((r, i) => {
    const imageSim = r.entry.photos.length ? Math.max(...r.entry.photos.map(v => dot(query, v))) : 0;
    // Photo similarity runs ~0.4 (unrelated) to ~1.0 (same picture).
    const photoScore = Math.min(1, Math.max(0, (imageSim - 0.45) / 0.5));
    return { product: r.product, imageSim, score: 0.7 * photoScore + 0.3 * (exps[i] / total) };
  }).sort((a, b) => b.score - a.score);
}
