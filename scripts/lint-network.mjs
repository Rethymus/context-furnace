// TEST_MATRIX §4: production code must not contain network APIs (原规格 §133).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['src'];
const exts = ['.ts', '.html', '.css'];
const banned = [/fetch\s*\(/, /XMLHttpRequest/, /WebSocket/, /EventSource/];

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
  const text = readFileSync(f, 'utf8');
  for (const re of banned) {
    if (re.test(text)) hits.push(`${f}: matches ${re}`);
  }
}

if (hits.length > 0) {
  console.error('NETWORK LINT FAILED (§133):');
  for (const h of hits) console.error('  ' + h);
  process.exit(1);
}
console.log(`network lint ok (${files.length} files scanned)`);
