import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/// Stamps the NTSA logo into the bottom-right corner of a product photo, so
/// every picture a seller uploads carries the app's mark. Done here with
/// sharp rather than at the image host, so the stored file itself is marked
/// and the local dev uploads look the same as the live ones.
const DEFAULT_LOGO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets', 'watermark.png');

// Share of the photo's width the logo takes, and how far it sits from the
// edge as a share of the width.
const LOGO_WIDTH_RATIO = 0.18;
const MARGIN_RATIO = 0.025;
const OPACITY = 0.72;
// Smaller than the logo itself; stamping it would just make a smudge.
const MIN_PHOTO_WIDTH = 160;

/// The prepared logo is the same for every photo of a given width, so keep
/// the resized-and-faded version rather than redoing it per upload.
const cache = new Map();
let sourceLogo;

async function logoFor(width) {
  if (cache.has(width)) return cache.get(width);
  sourceLogo ??= await readFile(process.env.WATERMARK_FILE || DEFAULT_LOGO);
  const faded = await sharp(sourceLogo)
    .resize({ width, fit: 'inside' })
    .ensureAlpha()
    // Multiplies the logo's alpha channel down to OPACITY.
    .composite([{
      input: Buffer.from([255, 255, 255, Math.round(255 * OPACITY)]),
      raw: { width: 1, height: 1, channels: 4 },
      tile: true,
      blend: 'dest-in',
    }])
    .png()
    .toBuffer();
  cache.set(width, faded);
  return faded;
}

/// Returns the photo with the logo stamped on. Anything that goes wrong --
/// a missing logo file, an image sharp cannot read -- leaves the upload
/// alone rather than failing it; a photo without a mark beats no photo.
export async function stampLogo(buffer, { format } = {}) {
  if (process.env.WATERMARK === 'off') return buffer;
  try {
    const image = sharp(buffer);
    const { width, height } = await image.metadata();
    if (!width || !height || width < MIN_PHOTO_WIDTH) return buffer;
    const logoWidth = Math.max(40, Math.round(width * LOGO_WIDTH_RATIO));
    const logo = await logoFor(logoWidth);
    const { height: logoHeight } = await sharp(logo).metadata();
    const margin = Math.round(width * MARGIN_RATIO);
    // Bottom-right, clamped so a very wide, very short photo still fits.
    const stamped = image.composite([{
      input: logo,
      top: Math.max(0, height - logoHeight - margin),
      left: Math.max(0, width - logoWidth - margin),
    }]);
    return await (format === 'png' ? stamped.png() : format === 'webp' ? stamped.webp() : stamped.jpeg({ quality: 88 })).toBuffer();
  } catch {
    return buffer;
  }
}
