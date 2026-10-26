// Usage: node tool/l10n/build_lang.mjs <dir> [code ...]
// Merges <dir>/<code>.part*.json into lib/l10n/lang/<code>.dart. With no codes,
// builds every language that has parts in <dir>.
import fs from 'node:fs';
import path from 'node:path';
import { writeLangDart, readAllEnglish, placeholders } from './lib.mjs';

const [dir, ...codes] = process.argv.slice(2);
if (!dir) { console.error('usage: build_lang.mjs <dir> [code ...]'); process.exit(1); }
const english = readAllEnglish();
const all = codes.length ? codes : [...new Set(fs.readdirSync(dir).map(f => f.match(/^([a-z]+)\.part\d+\.json$/)?.[1]).filter(Boolean))].sort();

for (const code of all) {
  const merged = {};
  for (const f of fs.readdirSync(dir).filter(f => f.startsWith(`${code}.part`) && f.endsWith('.json')).sort()) {
    Object.assign(merged, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  }
  // Keep only keys that still exist in English, in English order, with matching placeholders.
  const clean = {};
  let dropped = 0;
  for (const k of Object.keys(english)) {
    const v = merged[k];
    if (typeof v === 'string' && v.trim() && placeholders(v) === placeholders(english[k])) clean[k] = v;
    else if (v !== undefined) dropped++;
  }
  writeLangDart(code, clean);
  console.log(`${code}: ${Object.keys(clean).length}/${Object.keys(english).length} keys${dropped ? `, ${dropped} dropped (bad placeholders)` : ''}`);
}
