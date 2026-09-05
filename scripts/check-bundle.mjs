// TEST_MATRIX §4: production assets gzipped total must be <= 250 KB (原规格 §134, favicon excluded).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET = 250 * 1024;
const dir = 'dist';

let total = 0;
function walk(d) {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) walk(p);
    else {
      total += gzipSync(readFileSync(p)).length;
    }
  }
}
walk(dir);

const kb = (total / 1024).toFixed(1);
if (total > BUDGET) {
  console.error(`BUNDLE BUDGET FAILED: ${kb} KB gzip > 250 KB`);
  process.exit(1);
}
console.log(`bundle ok: ${kb} KB gzip (budget 250 KB)`);
