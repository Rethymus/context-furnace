// M7 批量闸门：色板校验 → svgo → gzip 计量 → 渲染 → 分族拼贴单（卡面印章 / 场景件）
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import sharp from 'sharp';
import { optimize } from 'svgo';

const ART_WARM = [
  '#17150f', '#26231c', '#38342a', '#55503f', '#8d8368', '#d8d0ba',
  '#b6ab94', '#d5c9ab', '#f7f2e2', '#22201a', '#262420', '#e4decb',
  '#a43a2f', '#c0503f', '#e48034', '#b44622', '#7c2a20',
  '#0d0c09', '#b3ac97',
];
const WITH_TEAL = [...ART_WARM, '#2c625a']; // 冷语义锚（C12 双槽）

const MANIFEST = {
  // 卡面印章（纸上墨刻）
  'card-c01-coffee-memory.svg': ART_WARM,
  'card-c02-evening-study.svg': ART_WARM,
  'card-c03-upgrade-files.svg': ART_WARM,
  'card-c04-bonus-calendar.svg': ART_WARM,
  'card-c05-night-noise.svg': ART_WARM,
  'card-c06-material-price.svg': ART_WARM,
  'card-c07-harder-test.svg': ART_WARM,
  'card-c08-alarm-log.svg': ART_WARM,
  'card-c09-two-groups.svg': ART_WARM,
  'card-c10-complaint-decay.svg': ART_WARM,
  'card-c11-east-parking.svg': ART_WARM,
  'card-c12-hot-cold-slots.svg': WITH_TEAL,
  // 场景件
  'home-standby.svg': ART_WARM,
  'furnace-interior.svg': ART_WARM,
};

const dir = 'm7-batch/candidates';
const report = {};
const cards = [];
const scenes = [];

for (const [name, palette] of Object.entries(MANIFEST)) {
  const raw = readFileSync(`${dir}/${name}`, 'utf8');
  const svg = optimize(raw, { multipass: true }).data;
  writeFileSync(`m7-batch/out/${name}`, svg);
  const fills = [...new Set(svg.match(/(?<=fill=")#[0-9a-f]{6}/g) ?? [])];
  const strokes = [...new Set(svg.match(/(?<=stroke=")#[0-9a-f]{6}/g) ?? [])];
  const off = [...fills, ...strokes].filter((c) => !palette.includes(c));
  const isCard = name.startsWith('card-');
  const w = isCard ? 200 : 460;
  const png = await sharp(Buffer.from(svg)).resize({ width: w }).png().toBuffer();
  writeFileSync(`m7-batch/out/${name.replace('.svg', '.png')}`, png);
  report[name] = {
    rawBytes: Buffer.byteLength(raw),
    gzipBytes: gzipSync(svg).length,
    elements: (svg.match(/<(path|rect|line|circle)/g) ?? []).length,
    offPalette: off,
    verdict: off.length === 0 ? 'PASS' : 'FAIL',
  };
  (isCard ? cards : scenes).push({ name, png, w });
}

writeFileSync('m7-batch/out/batch-report.json', JSON.stringify(report, null, 2));
console.table(Object.entries(report).map(([k, v]) => ({ file: k, ...v })));

const label = (text, w) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="24"><text x="2" y="17" font-family="Consolas, monospace" font-size="14" fill="#b3ac97">${text}</text></svg>`
);

// 拼贴单 A：12 枚印章 4×3
{
  const CW = 200, CH = 200, LB = 24, GUT = 20;
  const cols = 4, rows = Math.ceil(cards.length / cols);
  const W = cols * CW + (cols + 1) * GUT, H = rows * (CH + LB) + (rows + 1) * GUT;
  const comps = [];
  cards.forEach((c, i) => {
    const x = GUT + (i % cols) * (CW + GUT);
    const y = GUT + Math.floor(i / cols) * (CH + LB + GUT);
    comps.push({ input: c.png, left: x, top: y });
    comps.push({ input: label(c.name.replace('card-', '').replace('.svg', ''), CW), left: x, top: y + CH + 2 });
  });
  await sharp({ create: { width: W, height: H, channels: 3, background: '#17150f' } })
    .composite(comps).png().toFile('m7-batch/out/contact-sheet-cards.png');
}

// 拼贴单 B：home + furnace 两行
{
  const CW = 460, GUT = 24, LB = 26;
  const rows = scenes.map((s) => 460 * (s.w === 460 ? 1 : 0));
  const h1 = Math.round((460 * 200) / 320), h2 = Math.round((460 * 120) / 480);
  const H = GUT * 3 + (LB + h1) + (LB + h2);
  const comps = [
    { input: scenes[0].png, left: GUT, top: GUT },
    { input: label('home-standby (320x200)', CW), left: GUT, top: GUT + h1 + 4 },
    { input: scenes[1].png, left: GUT, top: GUT * 2 + LB + h1 },
    { input: label('furnace-interior (480x120, slice)', CW), left: GUT, top: GUT * 2 + LB + h1 + h2 + 4 },
  ];
  await sharp({ create: { width: CW + GUT * 2, height: H, channels: 3, background: '#17150f' } })
    .composite(comps).png().toFile('m7-batch/out/contact-sheet-scenes.png');
}
console.log('sheets: m7-batch/out/contact-sheet-cards.png / contact-sheet-scenes.png');
