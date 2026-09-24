import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireThat } from '../lib/rules.js';
import { config } from '../config.js';
import { stampLogo } from './watermark.js';

const EXTENSION = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
// Chat attachments may also be a short clip -- a wholesaler showing damaged
// stock is far clearer on video than in words.
const VIDEO_EXTENSION = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };
export const UPLOAD_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'uploads');

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

/// `watermark` stamps the NTSA logo into the corner before the file is
/// stored -- on for product photos, off for review pictures, profile photos
/// and KYC documents.
export async function uploadImage(file, { watermark = false } = {}) {
  requireThat(file && EXTENSION[file.mimetype], 400, 'Select a JPEG, PNG or WebP image');
  const format = EXTENSION[file.mimetype] === 'jpg' ? 'jpeg' : EXTENSION[file.mimetype];
  const buffer = watermark ? await stampLogo(file.buffer, { format }) : file.buffer;
  const cloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
  if (cloudinaryConfigured) {
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        folder: 'ntsa/products',
        resource_type: 'image',
        allowed_formats: ['jpg', 'png', 'webp'],
      }, (error, result) => error ? reject(error) : resolve({ url: result.secure_url }));
      stream.end(buffer);
    });
  }
  // Dev-only stand-in for Cloudinary until the client provides real
  // credentials: save to disk and serve it back over the API's own origin.
  requireThat(config.DEMO_MODE, 503, 'Cloudinary is not configured');
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${randomUUID()}.${EXTENSION[file.mimetype]}`;
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return { url: `http://localhost:${config.PORT}/uploads/${filename}` };
}
