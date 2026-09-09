// M7 动画语义类注入：为候选 SVG 的可动元素加 class（mw-*），CSS 侧统一驱动
// 规则：transform/opacity/dashoffset 三属性族；freeze/RM 全局规则自动关断
import { readFileSync, writeFileSync } from 'node:fs';

const EDITS = {
  'home-standby.svg': [
    ['<path fill="none" stroke="#38342a" stroke-width="2" stroke-linecap="round" d="M28 84h24M20 100h18M32 116h14"/>',
     '<path class="mw-drift" fill="none" stroke="#38342a" stroke-width="2" stroke-linecap="round" d="M28 84h24M20 100h18M32 116h14"/>'],
    ['<path fill="none" stroke="#38342a" stroke-width="2" stroke-linecap="round" d="M268 84h24M282 100h18M274 116h14"/>',
     '<path class="mw-drift" fill="none" stroke="#38342a" stroke-width="2" stroke-linecap="round" d="M268 84h24M282 100h18M274 116h14"/>'],
  ],
  'furnace-interior.svg': [
    ['<circle cx="180" cy="110" r="2.5" fill="#7c2a20"/>', '<circle class="mw-pulse" cx="180" cy="110" r="2.5" fill="#7c2a20"/>'],
    ['<circle cx="248" cy="112" r="2" fill="#b44622"/>', '<circle class="mw-pulse" cx="248" cy="112" r="2" fill="#b44622"/>'],
    ['<circle cx="300" cy="110" r="2.5" fill="#7c2a20"/>', '<circle class="mw-pulse" cx="300" cy="110" r="2.5" fill="#7c2a20"/>'],
  ],
  'card-c01-coffee-memory.svg': [
    ['<path fill="none" stroke="#26231c" stroke-width="3" stroke-linecap="round" d="M38 50q-3-6 1-11"/>',
     '<path class="mw-rise" fill="none" stroke="#26231c" stroke-width="3" stroke-linecap="round" d="M38 50q-3-6 1-11"/>'],
    ['<path fill="none" stroke="#26231c" stroke-width="3" stroke-linecap="round" d="M48 50q-3-7 2-12"/>',
     '<path class="mw-rise" fill="none" stroke="#26231c" stroke-width="3" stroke-linecap="round" d="M48 50q-3-7 2-12"/>'],
  ],
  'card-c02-evening-study.svg': [
    ['<rect x="27" y="46" width="8" height="9" fill="#e48034"/>', '<rect class="mw-flicker" x="27" y="46" width="8" height="9" fill="#e48034"/>'],
  ],
  'card-c03-upgrade-files.svg': [
    ['<path fill="none" stroke="#b44622" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="4 4" d="M34 30V16"/>',
     '<path class="mw-march" fill="none" stroke="#b44622" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="4 4" d="M34 30V16"/>'],
  ],
  'card-c04-bonus-calendar.svg': [
    ['<path fill="none" stroke="#26231c" stroke-width="1.5" stroke-linecap="round" d="M34 64q-3 3 0 6"/>',
     '<path class="mw-pulse" fill="none" stroke="#26231c" stroke-width="1.5" stroke-linecap="round" d="M34 64q-3 3 0 6"/>'],
  ],
  'card-c05-night-noise.svg': [
    ['<rect x="41" y="57" width="7" height="8" fill="#e4decb" stroke="#b44622" stroke-width="2"/>',
     '<rect class="mw-flicker" x="41" y="57" width="7" height="8" fill="#e4decb" stroke="#b44622" stroke-width="2"/>'],
    ['<path fill="none" stroke="#b44622" stroke-width="2" stroke-linecap="round" d="M52 58q4 3 0 6M56 55q7 5 0 12"/>',
     '<path class="mw-pulse" fill="none" stroke="#b44622" stroke-width="2" stroke-linecap="round" d="M52 58q4 3 0 6M56 55q7 5 0 12"/>'],
  ],
  'card-c06-material-price.svg': [
    ['<path fill="none" stroke="#b44622" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="5 4" d="M24 34L44 20l14 6 18-14"/>',
     '<path class="mw-march" fill="none" stroke="#b44622" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="5 4" d="M24 34L44 20l14 6 18-14"/>'],
  ],
  'card-c07-harder-test.svg': [
    ['<path fill="none" stroke="#b44622" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 3" d="M76 28q-10 2-16 10t-16 10"/>',
     '<path class="mw-march" fill="none" stroke="#b44622" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 3" d="M76 28q-10 2-16 10t-16 10"/>'],
  ],
  'card-c08-alarm-log.svg': [
    ['<path fill="none" stroke="#b44622" stroke-width="2.5" stroke-linecap="round" d="M22 30h16"/>',
     '<path class="mw-pulse" fill="none" stroke="#b44622" stroke-width="2.5" stroke-linecap="round" d="M22 30h16"/>'],
  ],
  'card-c09-two-groups.svg': [
    ['<path fill="none" stroke="#26231c" stroke-width="3" stroke-linecap="round" d="M16 34l64-6"/>',
     '<path class="mw-tilt" fill="none" stroke="#26231c" stroke-width="3" stroke-linecap="round" d="M16 34l64-6"/>'],
  ],
  'card-c10-complaint-decay.svg': [
    ['<circle cx="40" cy="24" r="4.5" fill="#b44622"/>', '<circle class="mw-pulse" cx="40" cy="24" r="4.5" fill="#b44622"/>'],
  ],
  'card-c11-east-parking.svg': [
    ['<rect x="56" y="30" width="9" height="7" rx="2" fill="#b44622"/>', '<rect class="mw-flicker" x="56" y="30" width="9" height="7" rx="2" fill="#b44622"/>'],
    ['<rect x="70" y="30" width="9" height="7" rx="2" fill="#b44622"/>', '<rect class="mw-flicker" x="70" y="30" width="9" height="7" rx="2" fill="#b44622"/>'],
  ],
  'card-c12-hot-cold-slots.svg': [
    ['<path fill="none" stroke="#b44622" stroke-width="2" stroke-linecap="round" d="M25 64q2-4 0-8t2-8M31 64q2-4 0-8t2-8"/>',
     '<path class="mw-rise" fill="none" stroke="#b44622" stroke-width="2" stroke-linecap="round" d="M25 64q2-4 0-8t2-8M31 64q2-4 0-8t2-8"/>'],
  ],
};

let fails = 0;
for (const [file, pairs] of Object.entries(EDITS)) {
  let src = readFileSync(`m7-batch/candidates/${file}`, 'utf8');
  for (const [from, to] of pairs) {
    if (!src.includes(from)) { console.error('MISS:', file, from.slice(0, 60)); fails++; continue; }
    src = src.replace(from, to);
  }
  writeFileSync(`m7-batch/candidates/${file}`, src);
}
console.log(fails === 0 ? 'animate: all applied' : `animate: ${fails} misses`);
