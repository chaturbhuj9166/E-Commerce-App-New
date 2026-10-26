// Usage: node tool/l10n/check.mjs <dir> <langCode> [parts=4]
// Checks <dir>/<code>.part1..N.json against <dir>/en_part1..N.json:
//   - every English key is present, with no extra keys
//   - every value is a non-empty string
//   - {placeholders} are identical to the English text
// Prints warnings for values that look untranslated or far too long. Exits 1
// when any hard error is found.
import fs from 'node:fs';
import path from 'node:path';
import { placeholders } from './lib.mjs';

const [dir, code, partsArg] = process.argv.slice(2);
const parts = Number(partsArg || 4);
if (!dir || !code) { console.error('usage: check.mjs <dir> <langCode> [parts]'); process.exit(1); }

let errors = 0, warnings = 0, total = 0;
const seen = [];
for (let p = 1; p <= parts; p++) {
  const enFile = path.join(dir, `en_part${p}.json`);
  const trFile = path.join(dir, `${code}.part${p}.json`);
  if (!fs.existsSync(trFile)) { console.log(`ERROR missing file ${path.basename(trFile)}`); errors++; continue; }
  let en, tr;
  try { en = JSON.parse(fs.readFileSync(enFile, 'utf8')); } catch (e) { console.log(`ERROR cannot read ${enFile}: ${e.message}`); errors++; continue; }
  try { tr = JSON.parse(fs.readFileSync(trFile, 'utf8')); } catch (e) { console.log(`ERROR ${path.basename(trFile)} is not valid JSON: ${e.message}`); errors++; continue; }
  for (const k of Object.keys(en)) {
    total++;
    const v = tr[k];
    if (typeof v !== 'string' || !v.trim()) { console.log(`ERROR ${code}.part${p} missing/empty: ${k}`); errors++; continue; }
    if (placeholders(v) !== placeholders(en[k])) { console.log(`ERROR ${code}.part${p} placeholders differ in ${k}: english {${placeholders(en[k])}} vs {${placeholders(v)}}`); errors++; }
    if (v === en[k] && en[k].length > 28 && code !== 'en') { console.log(`WARN  ${code} ${k} looks untranslated`); warnings++; }
    if (v.length > en[k].length * 3.2 + 12) { console.log(`WARN  ${code} ${k} is much longer than English (${v.length} vs ${en[k].length})`); warnings++; }
    seen.push(k);
  }
  for (const k of Object.keys(tr)) if (!(k in en)) { console.log(`ERROR ${code}.part${p} has an unknown key: ${k}`); errors++; }
}
console.log(`${code}: ${total} keys checked, ${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
