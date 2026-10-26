// Usage: node tool/l10n/extract_en.mjs <outDir> [parts=4]
// Writes <outDir>/en_all.json and <outDir>/en_part1..N.json (the English
// strings split into chunks) for translators to work from.
import fs from 'node:fs';
import path from 'node:path';
import { readAllEnglish } from './lib.mjs';

const out = process.argv[2];
const parts = Number(process.argv[3] || 4);
if (!out) { console.error('usage: extract_en.mjs <outDir> [parts]'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
const all = readAllEnglish();
const keys = Object.keys(all);
fs.writeFileSync(path.join(out, 'en_all.json'), JSON.stringify(all, null, 1));
const size = Math.ceil(keys.length / parts);
for (let p = 0; p < parts; p++) {
  const slice = Object.fromEntries(keys.slice(p * size, (p + 1) * size).map(k => [k, all[k]]));
  fs.writeFileSync(path.join(out, `en_part${p + 1}.json`), JSON.stringify(slice, null, 1));
}
console.log(`${keys.length} keys -> ${parts} parts of ~${size} in ${out}`);
