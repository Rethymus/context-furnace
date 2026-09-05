// TEST_MATRIX §4: src/ must not contain TODO/FIXME/TEMP/PLACEHOLDER/MOCK/STUB/COMING SOON (原规格 §142).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['src'];
const exts = ['.ts', '.html', '.css'];
const banned = /\b(TODO|FIXME|TEMP|PLACEHOLDER|MOCK|STUB|COMING\s+SOON)\b/i;

let files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (exts.some((e) => name.endsWith(e))) files.push(p);
  }
}
for (const r of roots) walk(r);

const hits = [];
for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (banned.test(line)) hits.push(`${f}:${i + 1}: ${line.trim().slice(0, 80)}`);
  });
}

if (hits.length > 0) {
  console.error('PLACEHOLDER LINT FAILED (§142):');
  for (const h of hits) console.error('  ' + h);
  process.exit(1);
}
console.log(`placeholder lint ok (${files.length} files scanned)`);
