// M8 批量闸门：教学步进图解（4 幅，透明底墨线）——色板/svgo/gzip/渲染/拼贴单
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import sharp from 'sharp';
import { optimize } from 'svgo';

const PALETTE = ['#26231c', '#55503f', '#b6ab94', '#b44622', '#e48034'];
const NAMES = ['step-1-left-cutter', 'step-2-right-cutter', 'step-3-output', 'step-4-ignite'];

const report = {};
const pngs = [];
for (const name of NAMES) {
  const raw = readFileSync(`m8-batch/candidates/${name}.svg`, 'utf8');
  const svg = optimize(raw, { multipass: true }).data;
  writeFileSync(`m8-batch/out/${name}.svg`, svg);
  const colors = [...new Set(svg.match(/#[0-9a-f]{6}/g) ?? [])];
  const off = colors.filter((c) => !PALETTE.includes(c));
  // 拼贴底衬纸色（图解本体透明，置于便签纸上）
  const png = await sharp({ create: { width: 240, height: 144, channels: 3, background: '#f7f2e2' } })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png().toBuffer();
  writeFileSync(`m8-batch/out/${name}.png`, png);
  report[name] = { rawBytes: Buffer.byteLength(raw), gzipBytes: gzipSync(svg).length, offPalette: off, verdict: off.length === 0 ? 'PASS' : 'FAIL' };
  pngs.push(png);
}
writeFileSync('m8-batch/out/batch-report.json', JSON.stringify(report, null, 2));
console.table(Object.entries(report).map(([k, v]) => ({ file: k, ...v })));

// 拼贴单 1×4
const GUT = 20, CW = 240, CH = 144;
const comps = pngs.map((input, i) => ({ input, left: GUT + i * (CW + GUT), top: GUT }));
await sharp({ create: { width: GUT * 5 + CW * 4, height: CH + GUT * 2, channels: 3, background: '#f7f2e2' } })
  .composite(comps).png().toFile('m8-batch/out/contact-sheet.png');
console.log('sheet: m8-batch/out/contact-sheet.png');
