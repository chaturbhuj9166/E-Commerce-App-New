import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireThat } from '../lib/rules.js';
import { config } from '../config.js';

const EXTENSION = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const UPLOAD_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'uploads');

export async function uploadImage(file) {
  requireThat(file && EXTENSION[file.mimetype], 400, 'Select a JPEG, PNG or WebP image');
  const cloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
  if (cloudinaryConfigured) {
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder: 'ntsa/products', resource_type: 'image', allowed_formats: ['jpg', 'png', 'webp'] }, (error, result) => error ? reject(error) : resolve({ url: result.secure_url }));
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
