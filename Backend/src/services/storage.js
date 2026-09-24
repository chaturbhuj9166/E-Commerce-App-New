import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireThat } from '../lib/rules.js';
import { config } from '../config.js';

const EXTENSION = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
// Chat attachments may also be a short clip -- a wholesaler showing damaged
// stock is far clearer on video than in words.
const VIDEO_EXTENSION = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };
export const UPLOAD_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'uploads');

/// Stamps the NTSA logo into the bottom-right of every product photo, so a
/// seller's picture carries the app's mark. Set CLOUDINARY_WATERMARK_ID to
/// the logo's Cloudinary public id (e.g. "ntsa/brand/logo"); without it,
/// photos upload unchanged.
export function watermarkTransformation(publicId = process.env.CLOUDINARY_WATERMARK_ID) {
  if (!publicId) return undefined;
  return [{
    // The overlay id uses ':' instead of '/' for folders.
    overlay: publicId.replaceAll('/', ':'),
    gravity: 'south_east',
    // 18% of the photo's width, so it scales with any picture size.
    width: '0.18',
    crop: 'scale',
    flags: 'relative',
    opacity: 72,
    x: 14,
    y: 14,
  }];
}

/// A photo or short video attached to a wholesaler<->admin chat message.
/// No watermark here: these are conversation attachments, not shop photos.
export async function uploadAttachment(file) {
  const isVideo = file && VIDEO_EXTENSION[file.mimetype];
  requireThat(file && (EXTENSION[file.mimetype] || isVideo), 400, 'Attach a JPEG, PNG or WebP photo, or an MP4, WebM or MOV video');
  const cloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
  if (cloudinaryConfigured) {
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        folder: 'ntsa/chat',
        resource_type: isVideo ? 'video' : 'image',
      }, (error, result) => error ? reject(error) : resolve({ url: result.secure_url, kind: isVideo ? 'VIDEO' : 'IMAGE' }));
      stream.end(file.buffer);
    });
  }
  requireThat(config.DEMO_MODE, 503, 'Cloudinary is not configured');
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${randomUUID()}.${isVideo ? VIDEO_EXTENSION[file.mimetype] : EXTENSION[file.mimetype]}`;
  await writeFile(path.join(UPLOAD_DIR, filename), file.buffer);
  return { url: `http://localhost:${config.PORT}/uploads/${filename}`, kind: isVideo ? 'VIDEO' : 'IMAGE' };
}

export async function uploadImage(file) {
  requireThat(file && EXTENSION[file.mimetype], 400, 'Select a JPEG, PNG or WebP image');
  const cloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
  if (cloudinaryConfigured) {
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        folder: 'ntsa/products',
        resource_type: 'image',
        allowed_formats: ['jpg', 'png', 'webp'],
        transformation: watermarkTransformation(),
      }, (error, result) => error ? reject(error) : resolve({ url: result.secure_url }));
      stream.end(file.buffer);
    });
  }
  // Dev-only stand-in for Cloudinary until the client provides real
  // credentials: save to disk and serve it back over the API's own origin.
  requireThat(config.DEMO_MODE, 503, 'Cloudinary is not configured');
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${randomUUID()}.${EXTENSION[file.mimetype]}`;
  await writeFile(path.join(UPLOAD_DIR, filename), file.buffer);
  return { url: `http://localhost:${config.PORT}/uploads/${filename}` };
}
