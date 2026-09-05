// TEST_MATRIX §4：localStorage 白名单（§17.3 仅 5 键）+ 0 第三方运行时依赖（§18.2）。
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const WHITELIST = new Set(['cf.locale', 'cf.sound', 'cf.volume', 'cf.motion', 'cf.tutorialSeen']);

// 1) localStorage 键白名单
const srcFiles = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|html|css)$/.test(name)) srcFiles.push(p);
  }
}
walk('src');

const used = new Set();
const storageRe = /\.(getItem|setItem|removeItem)\(\s*['"]([^'"]+)['"]/g;
for (const f of srcFiles) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(storageRe)) used.add(m[2]);
}
const illegal = [...used].filter((k) => !WHITELIST.has(k));
if (illegal.length > 0) {
  console.error(`STORAGE POLICY FAILED (§17.3): illegal keys: ${illegal.join(', ')}`);
  process.exit(1);
}

// 2) 0 第三方运行时依赖
const pkg = JSON.parse(readFileSync(join('package.json'), 'utf8'));
const deps = pkg.dependencies ?? {};
if (Object.keys(deps).length > 0) {
  console.error(`RUNTIME DEPS FAILED (§18.2): ${Object.keys(deps).join(', ')}`);
  process.exit(1);
}

console.log(`policy ok: storage keys=[${[...used].sort().join(', ')}]; runtime dependencies=0`);
