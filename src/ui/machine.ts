// DESIGN_SPEC §2–§8 / §13：主控制器——首页、开机、教学、12 周期循环、结局。
import { AudioEngine } from '../audio/engine';
import { cardForCycle, TUTORIAL_CARD } from '../game/cards';
import {
  DECAY_ACT,
  TOTAL_CYCLES,
  actForCycle,
  maxGainForCycle,
} from '../game/constants';
import { computeRound, hasReserveMessage, selectMachineMessage, type MachineMessageId } from '../game/scoring';
import {
  applyRoundResult,
  createInitialState,
  evaluateEnding,
  hasCoreSelected,
  loadRound,
  setCut,
  setGain,
} from '../game/state';
import { assertTransition, canUnplug } from '../game/transitions';
import type { GameState } from '../game/types';
import { getLocale, initI18n, onLocaleChange, setLocale, t } from '../i18n';
import { createCutTrack, type CutTrackHandle } from './cutter';
import { createGain, type GainHandle } from './gain';
import { createGauge, type Gauge } from './gauges';
import { createObservation, type ObservationHandle } from './observation';
import { renderEndingBanner, renderResults } from './results';
import { effectiveReducedMotion, SettingsPanel, type Settings } from './settings';

// v4.9 M6 结局版画（2026-09-09 所有者授权「LLM 直写 SVG」+「授权执行」）：
// 五结局木刻版画，模型直写 SVG 经子色板闸门（research/ai-pipeline/llm-svg-batch）
// 后入库的优化件。纯视觉层：零文本、零时间线（RM 天然合规）、显式填充色
// （不依赖透明度效果，RT 保持）——与仪表 SVG 同层的 inline 内容件。
const ENDING_WOODCUTS: Record<'a' | 'b' | 'c' | 'd' | 'e', string> = {
  'a': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><path fill="#26231c" d="M0 0h320v200H0z"/><path fill="#38342a" d="M0 150q50-18 96-4 54 16 108 2 58-14 116 4v48H0z"/><path fill="#55503f" d="M40 166q44-12 88-2 40 9 92 0v36H40z"/><path fill="#8d8368" d="M120 178q36-8 74-1v23h-74z"/><path fill="#17150f" d="M212 60h72a8 8 0 0 1 8 8v92h-88V68a8 8 0 0 1 8-8"/><path fill="#0d0c09" d="M230 96h36v30a18 18 0 0 1-36 0z"/><path fill="#38342a" d="M196 160q22-10 52-4t52 2q8 0 4 4H196z"/><path fill="#55503f" d="M210 162q18-6 40-2 20 4 38 2v6h-78z"/><circle cx="238" cy="128" r="2.5" fill="#55503f"/><circle cx="250" cy="124" r="2" fill="#38342a"/><circle cx="260" cy="129" r="1.5" fill="#55503f"/><path fill="none" stroke="#55503f" stroke-linecap="round" stroke-width="2.5" d="M248 56q5-10 0-20-4-8 1-16"/><path fill="none" stroke="#38342a" stroke-linecap="round" stroke-width="2" d="M258 60q6-12 1-22"/><circle cx="60" cy="60" r="1.5" fill="#8d8368"/><circle cx="120" cy="42" r="1" fill="#55503f"/><circle cx="170" cy="70" r="1.5" fill="#8d8368"/><circle cx="90" cy="100" r="1" fill="#d8d0ba"/><circle cx="196" cy="52" r="1" fill="#d8d0ba"/><path stroke="#26231c" stroke-linecap="round" stroke-width="2" d="m56 164 16-2m20 10 14-2m34-10 14-2m22 14 12-1"/></svg>',
  'b': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><path fill="#17150f" d="M0 0h320v200H0z"/><path fill="none" stroke="#38342a" stroke-width="3" d="M24 36h130m34 0h108M24 36v128m0 12h84m24 0h164m0-140v128"/><path fill="none" stroke="#e4decb" stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M32 104q10-34 20 0 8-22 16 0 10-44 20 0 8-18 16 0 10-30 20 0 6-12 12 0"/><path fill="none" stroke="#e4decb" stroke-linecap="round" stroke-width="3.5" d="M164 104q6-10 10-2"/><path stroke="#b3ac97" stroke-linecap="round" stroke-width="3" d="m182 96 8-6"/><path stroke="#b3ac97" stroke-linecap="round" stroke-width="2.5" d="m196 104 10-6"/><path stroke="#8d8368" stroke-linecap="round" stroke-width="2" d="m204 88 8 6"/><circle cx="216" cy="92" r="2.5" fill="#b3ac97"/><circle cx="221" cy="108" r="2.2" fill="#8d8368"/><circle cx="226" cy="84" r="2" fill="#55503f"/><circle cx="231" cy="116" r="2" fill="#b3ac97"/><circle cx="236" cy="74" r="1.8" fill="#8d8368"/><circle cx="240" cy="100" r="1.8" fill="#55503f"/><circle cx="245" cy="90" r="1.6" fill="#8d8368"/><circle cx="248" cy="112" r="1.5" fill="#b3ac97"/><circle cx="251" cy="80" r="1.4" fill="#55503f"/><circle cx="254" cy="104" r="1.4" fill="#8d8368"/><g fill="#55503f"><circle cx="254" cy="96" r="1.5"/><circle cx="260" cy="116" r="1.2"/><circle cx="264" cy="80" r="1.4"/><circle cx="270" cy="102" r="1.6"/><circle cx="274" cy="124" r="1.1"/><circle cx="276" cy="72" r="1.3"/><circle cx="282" cy="94" r="1.5"/><circle cx="286" cy="110" r="1.2"/></g><g fill="#38342a"><circle cx="258" cy="132" r="1.2"/><circle cx="268" cy="140" r="1.4"/><circle cx="280" cy="146" r="1.1"/><circle cx="292" cy="136" r="1.3"/><circle cx="288" cy="64" r="1.2"/><circle cx="272" cy="58" r="1.1"/></g><path fill="none" stroke="#55503f" stroke-width="2" d="m120 148 7 12h-14z"/><path fill="none" stroke="#38342a" stroke-width="2" d="M160 150h11v11h-11z"/><path fill="none" stroke="#55503f" stroke-width="1.8" d="m210 150 5 3v6l-5 3-5-3v-6z"/><circle cx="284" cy="52" r="2" fill="#e4decb"/></svg>',
  'c': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><path fill="#26231c" d="M0 0h320v200H0z"/><g stroke="#38342a" stroke-width="2"><path d="M0 150h320"/><path stroke-width="1.5" d="M0 158h320"/><path d="M0 165h320"/><path stroke-width="1.5" d="M0 173h320"/><path d="M0 181h320"/></g><g fill="#8d8368"><circle cx="212" cy="44" r="2"/><circle cx="236" cy="44" r="2"/><circle cx="260" cy="44" r="2"/><circle cx="284" cy="44" r="2"/><circle cx="212" cy="62" r="1.8"/><circle cx="236" cy="62" r="1.8"/><circle cx="260" cy="62" r="1.8"/><circle cx="284" cy="62" r="1.8"/><circle cx="212" cy="80" r="1.6"/><circle cx="236" cy="80" r="1.6"/><circle cx="260" cy="80" r="1.6"/><circle cx="284" cy="80" r="1.6"/></g><path fill="none" stroke="#d8d0ba" stroke-linecap="round" stroke-width="4" d="M44 118a44 44 0 0 1 88 0"/><path stroke="#55503f" stroke-width="2" d="M44 118h8m80 0h-8M88 74v8m-33 7 5 5m61-5-5 5M66 79l3 6m41-6-3 6"/><path stroke="#d8d0ba" stroke-linecap="round" stroke-width="3" d="m88 118 24-26"/><circle cx="88" cy="118" r="4" fill="#d8d0ba"/><circle cx="88" cy="132" r="3" fill="#2c625a"/><path fill="#17150f" d="M170 150h44v20h-44z"/><path fill="#b44622" d="M178 150q4-12 9-4 3-8 7-1 3-6 6 0 3-5 5 0v5z"/><path fill="#e48034" d="M182 150q2-6 5-2 2-4 4-1v3z"/><path fill="#55503f" d="M170 146h44v4h-44z"/><path fill="#f7f2e2" d="M0 140h150v7H0z"/><path fill="#d8d0ba" d="M0 147h150v3H0z"/><path stroke="#b3ac97" stroke-width="1.5" d="M18 143h12m12 0h12m12 0h12m12 0h12m12 0h12"/></svg>',
  'd': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><path fill="#17150f" d="M0 0h320v200H0z"/><path stroke="#7c2a20" stroke-linecap="round" stroke-width="3" d="M120 120 76 76m34 64-52-12m142-8 44-44m-34 64 52-12"/><path stroke="#a43a2f" stroke-linecap="round" stroke-width="2" d="M128 104 96 56m96 48 32-48m-118 96H44m170 0h62"/><path fill="#262420" d="M118 78h84a8 8 0 0 1 8 8v74H110V86a8 8 0 0 1 8-8"/><path fill="#a43a2f" d="M114 72h92a10 10 0 0 1 10 10v6H104v-6a10 10 0 0 1 10-10"/><path fill="#7c2a20" d="M138 160q6-46 14-26 7-34 15-12 7-24 14-4 7-18 12 0 4-10 7 4v38z"/><path fill="#b44622" d="M146 160q5-32 11-18 5-22 11-8 5-16 10-2 5-12 8 0v28z"/><path fill="#e48034" d="M154 160q4-20 8-10 4-12 8-4 4-8 7-1v15z"/><path fill="#f7f2e2" d="M162 160q3-10 5-4 2-5 4-1v5z"/><path fill="none" stroke="#d8d0ba" stroke-linecap="round" stroke-width="3" d="M252 52a22 22 0 0 1 44 0"/><path stroke="#e48034" stroke-linecap="round" stroke-width="3" d="m274 52 16-18"/><circle cx="274" cy="52" r="3" fill="#d8d0ba"/><g fill="#e48034"><circle cx="140" cy="58" r="2"/><circle cx="158" cy="42" r="1.5"/><circle cx="180" cy="50" r="2.2"/><circle cx="200" cy="36" r="1.6"/><circle cx="126" cy="80" r="1.5"/><circle cx="212" cy="66" r="1.8"/></g><g fill="#b44622"><circle cx="148" cy="72" r="1.5"/><circle cx="190" cy="62" r="1.4"/><circle cx="170" cy="34" r="1.3"/><circle cx="116" cy="100" r="1.4"/></g><path fill="#262420" d="M0 172h320v28H0z"/><path stroke="#a43a2f" stroke-linecap="round" stroke-width="2" d="M30 180h28m204 0h28m-220 8h22m142 0h18"/></svg>',
  'e': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><path fill="#0d0c09" d="M0 0h320v200H0z"/><path stroke="#17150f" stroke-width="2" d="M0 168h320"/><path stroke="#17150f" stroke-width="1.2" d="M0 176h320"/><g transform="rotate(8 190 100)"><path fill="none" stroke="#38342a" stroke-linecap="round" stroke-width="5" d="M28 118q34-10 62 2 26 10 52-4"/><path fill="none" stroke="#55503f" stroke-linecap="round" stroke-width="1.5" d="M28 118q10-3 20-2m-20 2q8 4 18 4"/><path stroke="#55503f" stroke-linecap="round" stroke-width="1.5" d="m142 116 6-4m-4 6 7 2"/><rect width="52" height="38" x="150" y="82" fill="#38342a" rx="10"/><rect width="52" height="6" x="150" y="82" fill="#55503f" rx="3"/><path stroke="#262420" stroke-width="2" d="M158 116h36"/><rect width="7" height="22" x="164" y="62" fill="#55503f" rx="2"/><rect width="7" height="22" x="182" y="62" fill="#55503f" rx="2"/><path fill="#262420" d="M146 96q6-4 8 0v10q-4 4-8 0z"/></g><circle cx="252" cy="48" r="3" fill="#17150f" stroke="#262420" stroke-width="1.5"/><circle cx="266" cy="48" r="3" fill="#17150f" stroke="#262420" stroke-width="1.5"/><circle cx="196" cy="150" r="2.2" fill="#b44622"/><circle cx="196" cy="150" r="4.5" fill="#b44622" opacity=".25"/></svg>',
};


// v5.0 M7 插画常量（2026-09-09 所有者批复 K1–K5；候选库 m7-batch 闸门 PASS 后入库）。
// 全部 LLM 直写 SVG：零文本节点、色板 ⊆ 美术子色板（C12 teal 语义锚）、mw-* 动画类由 motion.css 驱动
const HOME_STANDBY = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><path fill="#26231c" d="M0 0h320v200H0z"/><path fill="none" stroke="#38342a" stroke-width="2" d="M12 168h296"/><path fill="#38342a" d="M96 168V64h128v104z"/><path fill="none" stroke="#8d8368" stroke-width="2.5" d="M96 64h128"/><path fill="#26231c" d="M150 64V34h20v30z"/><path fill="none" stroke="#8d8368" stroke-width="2" d="M146 34h28"/><path fill="#38342a" d="M104 168v-14h12v14zm100 0v-14h12v14z"/><path fill="#17150f" d="M132 92h56v52h-56z"/><path fill="none" stroke="#8d8368" stroke-width="2.5" d="M132 92h56v52h-56z"/><path fill="none" stroke="#55503f" stroke-width="1.5" d="M138 100h44m-44 36h44"/><path fill="none" stroke="#d8d0ba" stroke-linecap="round" stroke-width="3" d="M186 108h8"/><circle cx="160" cy="150" r="3" fill="#d8d0ba"/><path fill="#55503f" d="M140 158h40v4h-40z"/><path fill="none" stroke="#38342a" stroke-linecap="round" stroke-width="2" d="M28 84h24m-32 16h18m-6 16h14m222-32h24m-10 16h18m-26 16h14" class="mw-drift"/><path fill="none" stroke="#8d8368" stroke-width="2.5" d="M242 168v-16h16v16"/><path fill="none" stroke="#8d8368" stroke-width="2" d="M245 156h10"/><path fill="none" stroke="#55503f" stroke-linecap="round" stroke-width="2.5" d="m60 168 8-14m0 0h12"/><circle cx="74" cy="154" r="2" fill="#55503f"/></svg>';

const FURNACE_INTERIOR = '<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 480 120"><path fill="#0d0c09" d="M0 0h480v120H0z"/><path fill="none" stroke="#17150f" stroke-width="2" d="M36 18h44m40-6h38m52 8h46m64-6h40m40 8h42M70 32h36m64 2h44m66-4h38m62 6h44M30 46h40m60 2h44m66-4h40m70 4h44"/><path fill="none" stroke="#17150f" stroke-width="3" d="m0 8 64 34M480 8l-64 34"/><path fill="none" stroke="#17150f" stroke-width="2" d="m0 26 52 28m428-28-52 28"/><path fill="#17150f" d="M204 0h72v14h-72z"/><path fill="none" stroke="#38342a" stroke-width="2" d="M204 14h72"/><path fill="none" stroke="#38342a" stroke-width="4" d="M40 84h400"/><path fill="none" stroke="#17150f" stroke-width="5" d="M64 84v18m64-18v12m64-12v18m64-18v12m64-12v18m64-18v12"/><path fill="none" stroke="#17150f" stroke-width="3" d="M88 90h28m36 0h28m36 0h28m36 0h28m36 0h28"/><path fill="#17150f" d="M120 116q60-22 120 0t120 0v4H120z"/><g class="embers"><circle cx="180" cy="110" r="2.5" fill="#7c2a20" class="mw-pulse"/><circle cx="248" cy="112" r="2" fill="#b44622" class="mw-pulse"/><circle cx="300" cy="110" r="2.5" fill="#7c2a20" class="mw-pulse"/></g><path fill="none" stroke="#38342a" stroke-width="3" d="M0 116h480"/></svg>';

// 每周期一张卡（C01→C12 固定顺序），印章按 cycle 取用
const CARD_SEALS: readonly string[] = [
  // C01 咖啡记忆
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="94" height="94" x="1" y="1" fill="#e4decb" rx="8"/><rect width="84" height="84" x="6" y="6" fill="none" stroke="#26231c" stroke-width="2" rx="5"/><path fill="#26231c" d="M28 56h34l-3 16H31z"/><path fill="none" stroke="#26231c" stroke-linecap="round" stroke-width="2.5" d="M24 76h42"/><path fill="none" stroke="#26231c" stroke-width="2" d="M62 60q7 2 6 7-1 4-7 4"/><path fill="none" stroke="#b6ab94" stroke-width="2" d="M30 58h30"/><path fill="none" stroke="#26231c" stroke-linecap="round" stroke-width="3" d="M38 50q-3-6 1-11m9 11q-3-7 2-12" class="mw-rise"/><path fill="none" stroke="#26231c" stroke-linecap="round" stroke-linejoin="round" stroke-width="3.5" d="m52 36 8-9 7 4 9-12"/><circle cx="76" cy="19" r="4" fill="#b44622"/><circle cx="60" cy="27" r="3" fill="#26231c"/><circle cx="67" cy="31" r="3" fill="#26231c"/></svg>',
  // C02 晚自习
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="94" height="94" x="1" y="1" fill="#e4decb" rx="8"/><rect width="84" height="84" x="6" y="6" fill="none" stroke="#26231c" stroke-width="2" rx="5"/><path fill="#26231c" d="M20 78V40l14-10 14 10v38zm28 0V50h24v28z"/><path fill="none" stroke="#26231c" stroke-linecap="round" stroke-width="2.5" d="M16 78h64"/><path fill="#e48034" d="M27 46h8v9h-8z" class="mw-flicker"/><path fill="#e4decb" stroke="#26231c" stroke-width="1.5" d="M39 46h8v9h-8zM27 60h8v9h-8zm12 0h8v9h-8z"/><path fill="#26231c" d="M54 56h6v7h-6zm10 0h6v7h-6z"/><path fill="none" stroke="#b3ac97" stroke-linecap="round" stroke-width="3" d="M74 22a9 9 0 1 1-9-12"/><path fill="#26231c" d="M43 70h10v8H43z"/></svg>',
  // C03 升级插件
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="94" height="94" x="1" y="1" fill="#e4decb" rx="8"/><rect width="84" height="84" x="6" y="6" fill="none" stroke="#26231c" stroke-width="2" rx="5"/><path fill="#26231c" d="M16 66V34l12-4v4h10v32z"/><path fill="#b6ab94" d="M22 38h22v24H22z"/><path fill="none" stroke="#26231c" stroke-width="1.5" d="M26 44h14m-14 6h14m-14 6h10"/><circle cx="68" cy="62" r="9" fill="none" stroke="#26231c" stroke-width="2.5"/><path fill="none" stroke="#26231c" stroke-linecap="round" stroke-width="3" d="M68 49v-4m0 34v-4M55 62h4m22 0h-4m-18-9 3 3m18 15-3-3m-18 3 3-3m18-15-3 3"/><circle cx="68" cy="62" r="3" fill="#26231c"/><path fill="none" stroke="#b44622" stroke-dasharray="4 4" stroke-linecap="round" stroke-width="2.5" d="M34 30V16" class="mw-march"/><path fill="none" stroke="#b44622" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="m28 21 6-6 6 6"/></svg>',
  // C04 奖金日历
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="94" height="94" x="1" y="1" fill="#e4decb" rx="8"/><rect width="84" height="84" x="6" y="6" fill="none" stroke="#26231c" stroke-width="2" rx="5"/><path fill="none" stroke="#26231c" stroke-width="2.5" d="M24 24h48v52H24z"/><path fill="none" stroke="#26231c" stroke-linecap="round" stroke-width="2.5" d="M40 18v8m16-8v8"/><path fill="#26231c" d="M24 24h48v8H24z"/><path fill="none" stroke="#26231c" stroke-width="1.5" d="M40 32v44m16-44v44M24 46h48M24 60h48"/><path fill="#b6ab94" d="M25 33h14v12H25zm0 14h14v14H25z"/><circle cx="48" cy="67" r="7" fill="#b44622"/><circle cx="48" cy="67" r="3" fill="#e4decb"/><path fill="none" stroke="#26231c" stroke-linecap="round" stroke-width="1.5" d="M34 64q-3 3 0 6" class="mw-pulse"/></svg>',
  // C05 深夜噪声
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="94" height="94" x="1" y="1" fill="#e4decb" rx="8"/><rect width="84" height="84" x="6" y="6" fill="none" stroke="#26231c" stroke-width="2" rx="5"/><path fill="#262420" d="M10 10h76v18H10z"/><circle cx="74" cy="19" r="4" fill="#e4decb"/><circle cx="70" cy="17" r="3.5" fill="#262420"/><path fill="#26231c" d="M12 78V48l10-6 10 6v30zm24 0V52h16v26zm22 0V44l12-8 12 8v34z"/><path fill="#e4decb" stroke="#b44622" stroke-width="2" d="M41 57h7v8h-7z" class="mw-flicker"/><path fill="none" stroke="#b44622" stroke-linecap="round" stroke-width="2" d="M52 58q4 3 0 6m4-9q7 5 0 12" class="mw-pulse"/><path fill="#262420" d="M17 53h6v7h-6zm9 0h6v7h-6zm37-3h6v7h-6zm10 0h6v7h-6z"/><path fill="none" stroke="#26231c" stroke-linecap="round" stroke-width="2.5" d="M10 78h76"/></svg>',
  // C06 原料涨价
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="94" height="94" x="1" y="1" fill="#e4decb" rx="8"/><rect width="84" height="84" x="6" y="6" fill="none" stroke="#26231c" stroke-width="2" rx="5"/><path fill="#26231c" d="M22 80V64h20v16z"/><path fill="none" stroke="#b6ab94" stroke-width="1.5" d="M26 69h12m-12 5h12"/><path fill="#26231c" d="M46 80V58h20v22z"/><path fill="none" stroke="#b6ab94" stroke-width="1.5" d="M50 64h12m-12 6h12m-12 6h8"/><path fill="#26231c" d="M34 58V42h18v16z"/><path fill="none" stroke="#b6ab94" stroke-width="1.5" d="M38 48h10m-10 5h7"/><path fill="none" stroke="#b44622" stroke-dasharray="5 4" stroke-linecap="round" stroke-width="2.5" d="m24 34 20-14 14 6 18-14" class="mw-march"/><path fill="none" stroke="#b44622" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M68 18h8v8"/></svg>',
  // C07 难度分降
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="94" height="94" x="1" y="1" fill="#e4decb" rx="8"/><rect width="84" height="84" x="6" y="6" fill="none" stroke="#26231c" stroke-width="2" rx="5"/><path fill="#26231c" d="M14 80V66h16V52h16V38h16V24h18v56z"/><path fill="none" stroke="#b6ab94" stroke-width="1.5" d="M18 72h8m8-14h8m8-14h8m8-14h10"/><path fill="none" stroke="#b44622" stroke-dasharray="4 3" stroke-linecap="round" stroke-width="2" d="M76 28q-10 2-16 10T44 48" class="mw-march"/><circle cx="41" cy="51" r="5" fill="#b44622"/><circle cx="24" cy="80" r="4" fill="#26231c"/><path fill="none" stroke="#26231c" stroke-linecap="round" stroke-width="2" d="M24 74v-8"/></svg>',
  // C08 高温报警
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="94" height="94" x="1" y="1" fill="#e4decb" rx="8"/><rect width="84" height="84" x="6" y="6" fill="none" stroke="#26231c" stroke-width="2" rx="5"/><circle cx="30" cy="68" r="9" fill="#26231c"/><rect width="8" height="46" x="26" y="18" fill="none" stroke="#26231c" stroke-width="2.5" rx="4"/><path fill="#26231c" d="M28.5 56h3v11h-3z"/><path fill="none" stroke="#b44622" stroke-linecap="round" stroke-width="2.5" d="M22 30h16" class="mw-pulse"/><circle cx="30" cy="30" r="2.5" fill="#b44622"/><path fill="none" stroke="#26231c" stroke-linecap="round" stroke-width="2.5" d="M48 44h36"/><path fill="none" stroke="#b6ab94" stroke-width="1.5" d="M48 52v4m12-4v4m12-4v4m12-4v4"/><path fill="none" stroke="#26231c" stroke-width="1.5" d="M48 58h36"/><path fill="none" stroke="#b6ab94" stroke-width="1.5" d="M48 64v4m12-4v4m12-4v4m12-4v4"/><path fill="none" stroke="#26231c" stroke-linecap="round" stroke-width="2.5" d="M18 80h60"/></svg>',
  // C09 两组误差
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="94" height="94" x="1" y="1" fill="#e4decb" rx="8"/><rect width="84" height="84" x="6" y="6" fill="none" stroke="#26231c" stroke-width="2" rx="5"/><path fill="#26231c" d="M46 30h4v44h-4z"/><path fill="none" stroke="#26231c" stroke-linecap="round" stroke-width="3" d="m16 34 64-6" class="mw-tilt"/><circle cx="48" cy="32" r="4" fill="#b44622"/><path fill="none" stroke="#26231c" stroke-width="1.5" d="m20 35-4 14h16l-4-14m48-6-4 14h16l-4-14"/><path fill="#26231c" d="M14 50h20l-4 6H18zm56-6h20l-4 6H74zm-54 2V36h3v10zm6 0v-8h3v8zm6 0v-9h3v9z"/><path fill="#b44622" d="M72 40v-9h3v9z"/><path fill="#26231c" d="M78 40v-8h3v8zm6 0v-7h3v7z"/><path fill="none" stroke="#26231c" stroke-linecap="round" stroke-width="2.5" d="M34 78h28"/></svg>',
  // C10 投诉回落
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="94" height="94" x="1" y="1" fill="#e4decb" rx="8"/><rect width="84" height="84" x="6" y="6" fill="none" stroke="#26231c" stroke-width="2" rx="5"/><path fill="none" stroke="#26231c" stroke-linecap="round" stroke-width="2.5" d="M20 20v56h58"/><path fill="none" stroke="#26231c" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M20 64q6-2 10-24t10-16 10 12 10 20 12 10"/><circle cx="40" cy="24" r="4.5" fill="#b44622" class="mw-pulse"/><path fill="none" stroke="#b44622" stroke-dasharray="3 3" stroke-width="1.5" d="M40 28v20"/><path fill="none" stroke="#b6ab94" stroke-width="1.5" d="M30 76v4m10-4v4m10-4v4m12-4v4m12-4v4"/><circle cx="30" cy="82" r="1.5" fill="#26231c"/><circle cx="40" cy="82" r="1.5" fill="#26231c"/><circle cx="50" cy="82" r="1.5" fill="#26231c"/><path fill="none" stroke="#26231c" stroke-linecap="round" stroke-width="1.5" d="M62 62h14"/></svg>',
  // C11 东区车位
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="94" height="94" x="1" y="1" fill="#e4decb" rx="8"/><rect width="84" height="84" x="6" y="6" fill="none" stroke="#26231c" stroke-width="2" rx="5"/><path fill="none" stroke="#26231c" stroke-width="2.5" d="M14 26h30v44H14zm36 0h32v44H50z"/><path fill="none" stroke="#26231c" stroke-dasharray="4 4" stroke-width="2" d="M47 22v52"/><path fill="none" stroke="#b6ab94" stroke-width="1.5" d="M19 34v28m9-28v28m9-28v28M14 44h30M14 56h30"/><path fill="#26231c" d="M20 46h7v8h-7z"/><path fill="none" stroke="#b6ab94" stroke-width="1.5" d="M56 34v28m20-28v28M50 44h32M50 56h32"/><path fill="#26231c" d="M57 46h8v8h-8zm9 0h8v8h-8z"/><rect width="9" height="7" x="56" y="30" fill="#b44622" class="mw-flicker" rx="2"/><path fill="none" stroke="#b44622" stroke-width="1.5" d="m58 37-1 3 3-3"/><rect width="9" height="7" x="70" y="30" fill="#b44622" class="mw-flicker" rx="2"/><path fill="none" stroke="#b44622" stroke-width="1.5" d="m72 37-1 3 3-3"/></svg>',
  // C12 冷热双槽
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="94" height="94" x="1" y="1" fill="#e4decb" rx="8"/><rect width="84" height="84" x="6" y="6" fill="none" stroke="#26231c" stroke-width="2" rx="5"/><path fill="#26231c" d="M16 30h26v44H16zm38 0h26v44H54z"/><path fill="#e4decb" d="M21 35h16v8H21z"/><path fill="none" stroke="#b44622" stroke-linecap="round" stroke-width="2" d="M25 64q2-4 0-8t2-8m4 16q2-4 0-8t2-8" class="mw-rise"/><path fill="#e4decb" d="M59 35h16v8H59z"/><path fill="none" stroke="#2c625a" stroke-linecap="round" stroke-width="2" d="M63 64V50m6 14V50"/><path fill="none" stroke="#2c625a" stroke-linecap="round" stroke-width="1.5" d="m61 54 4-4m6 4-4-4"/><rect width="10" height="8" x="24" y="45" fill="#e48034" rx="1"/><path fill="none" stroke="#26231c" stroke-linecap="round" stroke-width="2.5" d="M12 78h72"/></svg>',
];

// §2.2 开机动画 1.15s；§8.3 反馈动画 950ms（时序集中管理）
const BOOT_TOTAL_MS = 1150;
const BOOT_RELAY_MS = 120;
const BOOT_SWEEP_DONE_MS = 470;
const BOOT_FURNACE_MS = 950;
const FEEDBACK_TOTAL_MS = 950;
const FEEDBACK_SINK_MS = 140;
const FEEDBACK_HEAT_DONE_MS = 600;
const FEEDBACK_FIDELITY_DONE_MS = 770;
const UNLOCK_TOAST_MS = 1200; // §27

export class MachineController {
  private state: GameState = createInitialState();
  private readonly audio = new AudioEngine();
  private settingsPanel: SettingsPanel;
  private reduced = false;

  private root: HTMLElement | null = null;
  private lastMachineMessage: MachineMessageId | null = null;
  private lastReserve = false;
  private announcedGain = 0;
  private pendingBootSweep = true;
  private round: Round | null = null;
  private offLocale: (() => void) | null = null;

  constructor() {
    initI18n();
    this.settingsPanel = new SettingsPanel({
      onChange: (s: Settings) => this.applySettings(s),
      onReplayTutorial: () => this.replayTutorial(),
      phase: () => this.state.phase,
    });
  }

  mount(root: HTMLElement): void {
    this.root = root;
    // D29：测试冻结开关（仅测试启用；生产无此参数，无行为差异）
    if (new URLSearchParams(window.location.search).has('freeze')) {
      document.documentElement.dataset.freeze = '1';
    }
    this.applySettings(this.settingsPanel.current);
    this.offLocale = onLocaleChange(() => this.onLocaleSwitched());
    this.phaseTo('HOME_OFF'); // §18.5：BOOT → HOME_OFF（页面加载完成）
    this.renderHome();
  }

  dispose(): void {
    this.offLocale?.();
  }

  private applySettings(s: Settings): void {
    this.reduced = effectiveReducedMotion(s);
    document.documentElement.dataset.motion = this.reduced ? 'reduced' : 'full';
    this.audio.setSettings({ enabled: s.sound === 'on', volume: s.volume });
  }

  private phaseTo(phase: GameState['phase']): void {
    assertTransition(this.state.phase, phase);
    this.state = { ...this.state, phase };
  }

  // ─────────────────────────────── 首页（§6–7） ───────────────────────────────

  private renderHome(): void {
    const root = this.root;
    if (!root) return;
    root.textContent = '';
    const stage = document.createElement('div');
    stage.className = 'stage stage--home';

    const machine = document.createElement('main');
    machine.className = 'machine';
    machine.dataset.testid = 'home';

    const header = document.createElement('div');
    header.className = 'machine-header';
    const model = document.createElement('div');
    model.className = 'model-plate caps';
    model.textContent = t('home.model');
    const tools = document.createElement('div');
    tools.className = 'header-tools';
    tools.appendChild(this.localeToggleBtn());
    tools.appendChild(this.settingsBtn());
    header.append(model, tools);
    machine.appendChild(header);

    // 深炭铭牌（概念板 01：暗色铭牌承载标题）
    const plaque = document.createElement('div');
    plaque.className = 'machine-plaque';
    const plaqueModel = document.createElement('div');
    plaqueModel.className = 'plaque-model caps';
    plaqueModel.textContent = t('home.model');
    const title = document.createElement('h1');
    title.className = 'title-plate';
    title.dataset.testid = 'home-title';
    const subtitle = document.createElement('p');
    subtitle.className = 'home-subtitle caps';
    subtitle.dataset.testid = 'home-subtitle';
    plaque.append(plaqueModel, title, subtitle);
    machine.appendChild(plaque);

    const homeBody = document.createElement('div');
    homeBody.className = 'home-body';
    homeBody.appendChild(plaque);

    const power = document.createElement('button');
    power.type = 'button';
    power.className = 'btn btn-power';
    power.dataset.testid = 'power-on';
    power.textContent = t('home.power');
    power.addEventListener('click', () => this.powerOn());
    homeBody.appendChild(power);

    const motto = document.createElement('p');
    motto.className = 'home-motto';
    motto.dataset.testid = 'home-motto';
    homeBody.appendChild(motto);

    const bootLine = document.createElement('p');
    bootLine.className = 'boot-line caps';
    bootLine.dataset.testid = 'boot-line';
    homeBody.appendChild(bootLine);

    // v5.0 M7 H1 待机版画（aria-hidden 纯视觉；冷炉语义，与结局版画同族）
    const homePlate = document.createElement('div');
    homePlate.className = 'home-plate';
    homePlate.setAttribute('aria-hidden', 'true');
    homePlate.innerHTML = HOME_STANDBY;
    homeBody.appendChild(homePlate);
    machine.appendChild(homeBody);

    stage.appendChild(machine);
    root.appendChild(stage);

    const texts = () => {
      title.textContent = t('home.title');
      subtitle.textContent = t('home.subtitle');
      power.textContent = t('home.power');
      motto.textContent = t('home.motto');
    };
    texts();
    this.homeTexts = texts;
  }

  private homeTexts: (() => void) | null = null;

  private localeToggleBtn(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tool-btn';
    btn.dataset.testid = 'locale-toggle';
    btn.textContent = t('home.localeToggle');
    btn.addEventListener('click', () => {
      setLocale(getLocale() === 'zh-CN' ? 'en-US' : 'zh-CN'); // §66 任意时间切换
    });
    return btn;
  }

  private settingsBtn(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tool-btn';
    btn.dataset.testid = 'settings-btn';
    btn.setAttribute('aria-label', t('settings.title'));
    btn.textContent = '⚙';
    btn.addEventListener('click', () => this.settingsPanel.open());
    return btn;
  }

  // ─────────────────────────────── 开机（§2.2） ───────────────────────────────

  private powerOn(): void {
    this.audio.init(); // §2.2：首次用户手势内创建 AudioContext
    this.phaseTo('BOOTING');
    this.bootAnimation(() => {
      const seen = globalThis.localStorage?.getItem('cf.tutorialSeen') === '1';
      if (seen) {
        this.startRun();
      } else {
        this.startTutorial();
      }
    });
  }

  private bootAnimation(after: () => void): void {
    const root = this.root;
    if (!root) return;
    this.renderHome();
    const power = root.querySelector<HTMLButtonElement>('[data-testid="power-on"]');
    if (power) power.disabled = true;

    if (this.reduced) {
      // §2.3：RM 下状态仅以指示灯/opacity 表达，不做自检扫描
      window.setTimeout(after, 350);
      return;
    }
    // §2.2 时序：0–120ms 继电器；470–720ms 观察窗亮起（纸卡脉冲）；720–950ms 炉光（徽记色）；950–1150ms 校准完成
    window.setTimeout(() => this.audio.relay(), BOOT_RELAY_MS);
    window.setTimeout(() => {
      const card = root.querySelector<HTMLElement>('main.machine');
      if (card) card.classList.add('boot-pulse');
      // v5.0 M7 H2：待机版画随开机点亮（RM/freeze 下无过渡、即时态）
      root.querySelector<HTMLElement>('.home-plate')?.classList.add('plate-lit');
    }, BOOT_SWEEP_DONE_MS);
    window.setTimeout(() => {
      const card = root.querySelector<HTMLElement>('main.machine');
      if (card) card.classList.remove('boot-pulse');
      const motto = root.querySelector<HTMLElement>('[data-testid="home-motto"]');
      if (motto) motto.classList.add('motto-lit');
    }, BOOT_FURNACE_MS);
    window.setTimeout(() => {
      const line = root.querySelector<HTMLElement>('[data-testid="boot-line"]');
      if (line) line.textContent = t('boot.calibrationComplete');
    }, 950);
    window.setTimeout(after, BOOT_TOTAL_MS);
  }

  // ─────────────────────────────── 教学（§3 / D8 / D35） ───────────────────────────────

  private startTutorial(): void {
    this.phaseTo('TUTORIAL');
    this.renderTutorial();
  }

  private tutorialTrack: CutTrackHandle | null = null;
  private tutorialSel = { left: 0, right: 2 };
  private tutorialStep = 0;
  private tutorialEls: {
    hint: HTMLElement;
    output: HTMLElement;
    ignite: HTMLButtonElement;
  } | null = null;

  private renderTutorial(): void {
    const root = this.root;
    if (!root) return;
    root.textContent = '';

    const stage = document.createElement('div');
    stage.className = 'stage';
    const machine = document.createElement('main');
    machine.className = 'machine machine--tutorial';

    const header = document.createElement('div');
    header.className = 'machine-header';
    const model = document.createElement('div');
    model.className = 'model-plate caps';
    model.textContent = t('home.model');
    const tools = document.createElement('div');
    tools.className = 'header-tools';
    tools.appendChild(this.localeToggleBtn());
    tools.appendChild(this.settingsBtn());
    header.append(model, tools);
    machine.appendChild(header);

    const panelWrap = document.createElement('div');
    panelWrap.className = 'machine-panel';
    machine.appendChild(panelWrap);

    const feedPanel = this.panel('panel.feed', 'panel-feed');
    const feedText = document.createElement('p');
    feedText.className = 'feed-text reading';
    feedText.dataset.testid = 'feed';
    feedPanel.body.appendChild(feedText);

    const extractPanel = this.panel('panel.extract', 'panel-extract');
    panelWrap.appendChild(feedPanel.wrap);
    panelWrap.appendChild(extractPanel.wrap);

    const outputPanel = this.panel('panel.output', 'panel-output');
    const output = document.createElement('p');
    output.className = 'output-text reading';
    output.dataset.testid = 'output';
    outputPanel.body.appendChild(output);
    panelWrap.appendChild(outputPanel.wrap);

    const controlRow = document.createElement('div');
    controlRow.className = 'control-row';
    const ignite = document.createElement('button');
    ignite.type = 'button';
    ignite.className = 'btn btn-primary';
    ignite.dataset.testid = 'ignite';
    ignite.textContent = t('btn.ignite');
    ignite.addEventListener('click', () => this.finishTutorial());
    controlRow.appendChild(ignite);
    panelWrap.appendChild(controlRow);

    const hint = document.createElement('div');
    hint.className = 'tutorial-note';
    hint.dataset.testid = 'tutorial-hint';
    // §3 步进指示（纯视觉，无文字；aria-hidden）
    const dots = document.createElement('span');
    dots.className = 'tutorial-dots';
    dots.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 4; i++) {
      const dot = document.createElement('i');
      dot.className = 'tutorial-dot';
      dots.appendChild(dot);
    }
    const hintText = document.createElement('span');
    hintText.className = 'tutorial-note-text';
    hint.append(dots, hintText);
    panelWrap.appendChild(hint);

    stage.appendChild(machine);
    root.appendChild(stage);

    const locale = getLocale();
    const texts = TUTORIAL_CARD.segments.map((s) => (locale === 'zh-CN' ? s.zh : s.en));
    feedText.textContent = texts.join('');

    // 教学选区（D8：本地状态，不影响任何游戏数值）；OUTPUT 实时跟随
    this.tutorialSel = { left: 0, right: TUTORIAL_CARD.segments.length - 1 };
    this.tutorialStep = 0;
    this.tutorialTrack = createCutTrack({
      segmentCount: TUTORIAL_CARD.segments.length,
      getSelection: () => ({ ...this.tutorialSel }),
      setSelection: (left, right) => {
        const prev = { ...this.tutorialSel };
        this.tutorialSel = { left, right };
        // §3 步进引导：左刀已动 → Step2；右刀已动 → Step3，随后进入 Step4（D35 不锁输入）
        if (this.tutorialStep < 1 && left !== prev.left) this.showTutorialStep(1);
        if (this.tutorialStep < 2 && right !== prev.right) {
          this.showTutorialStep(2);
          window.setTimeout(() => {
            if (this.state.phase === 'TUTORIAL' && this.tutorialStep < 3) this.showTutorialStep(3);
          }, 900);
        }
        this.updateTutorialOutput();
      },
      onTick: () => this.audio.cutterTick(1),
    });
    extractPanel.body.appendChild(this.tutorialTrack.root);
    this.tutorialEls = { hint, output, ignite };

    this.showTutorialStep(0);
  }

  // 教学成品预览（§6.5 引号规则；随裁刀实时更新）
  private updateTutorialOutput(): void {
    const els = this.tutorialEls;
    if (!els) return;
    const locale = getLocale();
    const sep = locale === 'zh-CN' ? '' : ' ';
    const joined = TUTORIAL_CARD.segments
      .slice(this.tutorialSel.left, this.tutorialSel.right + 1)
      .map((s) => (locale === 'zh-CN' ? s.zh : s.en))
      .join(sep);
    els.output.textContent = locale === 'zh-CN' ? `「${joined}」` : `“${joined}”`;
  }

  // §3 Step 1–5：高亮引导，不锁输入（D35）；步进由玩家动作驱动
  private showTutorialStep(step: number): void {
    const els = this.tutorialEls;
    if (!els) return;
    this.tutorialStep = Math.min(3, Math.max(0, step));
    const hints = [t('tutorial.step1'), t('tutorial.step2'), t('tutorial.step3'), t('tutorial.step4')];
    const note = els.hint.querySelector('.tutorial-note-text');
    if (note) note.textContent = hints[this.tutorialStep] ?? '';
    const dots = els.hint.querySelectorAll('.tutorial-dot');
    dots.forEach((d, i) => d.classList.toggle('on', i <= this.tutorialStep));
    this.tutorialTrack?.setHighlighted(this.tutorialStep === 0 ? 0 : this.tutorialStep === 1 ? 1 : null);
    els.ignite.classList.toggle('ignite-hint', this.tutorialStep === 3);
    this.updateTutorialOutput();
  }

  private finishTutorial(): void {
    try {
      globalThis.localStorage?.setItem('cf.tutorialSeen', '1'); // §105
    } catch {
      // 无存储时本会话内跳过教学
    }
    this.phaseTo('ROUND_EDITING'); // TUTORIAL → ROUND_EDITING（cycle 1，D8 不影响数值）
    this.loadRound();
  }

  // ─────────────────────────────── 正式周期（§4.1 / §8） ───────────────────────────────

  private startRun(): void {
    this.phaseTo('ROUND_EDITING');
    this.state = { ...this.state, cycle: 1, act: 1 };
    this.loadRound();
  }

  private panel(labelKey: Parameters<typeof t>[0], testid: string, onDark = false): { wrap: HTMLElement; body: HTMLElement; label: HTMLElement } {
    const wrap = document.createElement('section');
    wrap.className = `panel ${testid}${onDark ? ' on-dark' : ''}`; // UI_CONTRACT v3 §4 纸卡/暗面
    wrap.dataset.testid = testid;
    const label = document.createElement('div');
    label.className = 'panel-label caps';
    wrap.appendChild(label);
    const body = document.createElement('div');
    wrap.appendChild(body);
    label.textContent = t(labelKey);
    return { wrap, body, label };
  }

  private loadRound(): void {
    const card = cardForCycle(this.state.cycle);
    this.state = loadRound({ ...this.state }, card);
    this.state = { ...this.state, act: actForCycle(this.state.cycle) };
    this.round = null;

    const root = this.root;
    if (!root) return;
    root.textContent = '';
    const stage = document.createElement('div');
    stage.className = 'stage';
    const machine = document.createElement('main');
    machine.className = 'machine';
    stage.appendChild(machine);
    root.appendChild(stage);

    // HEADER
    const header = document.createElement('div');
    header.className = 'machine-header has-cycle';
    const model = document.createElement('div');
    model.className = 'model-plate caps';
    model.textContent = t('home.model');
    const headerRight = document.createElement('div');
    headerRight.className = 'header-tools';
    const cycle = document.createElement('span');
    cycle.className = 'cycle-plate';
    cycle.dataset.testid = 'cycle-display';
    const tools = document.createElement('div');
    tools.className = 'header-tools';
    tools.appendChild(this.localeToggleBtn());
    tools.appendChild(this.settingsBtn());
    headerRight.append(cycle, tools);
    header.append(model, headerRight);
    machine.appendChild(header);

    // GAUGES（UI_CONTRACT §1.2 弧形进度芯片）
    const heatGauge = createGauge('gauge.heat', 'meter.heat.aria', 'gauge-heat', () => this.reduced);
    const fidelityGauge = createGauge('gauge.fidelity', 'meter.fidelity.aria', 'gauge-fidelity', () => this.reduced);
    heatGauge.root.dataset.testid = 'gauge-heat';
    fidelityGauge.root.dataset.testid = 'gauge-fidelity';
    // §2.2 开机自检扫描：仅本次开机后的第一个周期执行一次
    const applyGaugeValues = (): void => {
      heatGauge.set(this.state.heat);
      fidelityGauge.set(this.state.fidelity);
    };
    if (this.pendingBootSweep) {
      this.pendingBootSweep = false;
      heatGauge.sweepTest(applyGaugeValues);
      fidelityGauge.sweepTest(applyGaugeValues);
    } else {
      applyGaugeValues();
    }

    const loadLine = document.createElement('div');
    loadLine.className = 'load-line caps';
    loadLine.dataset.testid = 'load-line';
    machine.appendChild(loadLine);

    // 机面板（概念板 06：奶油烤漆承载全部工作区）
    const darkPanel = document.createElement('div');
    darkPanel.className = 'machine-panel';
    darkPanel.dataset.testid = 'panel-dark';
    const workspace = document.createElement('div');
    workspace.className = 'workspace';
    const colMain = document.createElement('div');
    colMain.className = 'col-main';
    const colSide = document.createElement('div');
    colSide.className = 'col-side';

    // FEED（左列·纸卡）
    const feedPanel = this.panel('panel.feed', 'panel-feed');
    const feedText = document.createElement('p');
    feedText.className = 'feed-text reading';
    feedText.dataset.testid = 'feed';
    feedPanel.body.appendChild(feedText);

    // v5.0 M7 G3 卡面印章（落款角章，aria-hidden；每周期随卡切换 innerHTML）
    const cardSeal = document.createElement('div');
    cardSeal.className = 'card-seal';
    cardSeal.setAttribute('aria-hidden', 'true');
    feedPanel.body.prepend(cardSeal); // 浮动落款：文字环绕印章（在正文 <p> 之前）
    colMain.appendChild(feedPanel.wrap);

    // EXTRACT（左列·面板上直接承载）
    const extractPanel = this.panel('panel.extract', 'panel-extract', true);
    colMain.appendChild(extractPanel.wrap);

    // OUTPUT（左列·纸卡，红竖条）
    const outputPanel = this.panel('panel.output', 'panel-output');
    const output = document.createElement('p');
    output.className = 'output-text reading';
    output.dataset.testid = 'output';
    outputPanel.body.appendChild(output);
    colMain.appendChild(outputPanel.wrap);

    workspace.append(colMain, colSide);
    darkPanel.appendChild(workspace);
    machine.appendChild(darkPanel);

    // ACTIONS（右列底部）
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn btn-ghost';
    resetBtn.dataset.testid = 'reset';
    resetBtn.textContent = t('btn.reset');
    resetBtn.addEventListener('click', () => {
      if (this.state.phase !== 'ROUND_EDITING') return;
      // D9：RESET CUT 恢复全选（D21：无音效）
      this.state = setCut(this.state, 0, card.segments.length - 1);
      this.refreshSelection();
    });
    const gain = createGain({
      get: () => this.state.gain,
      getMax: () => maxGainForCycle(this.state.cycle),
      set: (v) => {
        this.state = setGain(this.state, v);
        this.updateOutput();
      },
      onClick: () => this.audio.gainClick(),
    });
    gain.root.dataset.testid = 'gain';
    const igniteBtn = document.createElement('button');
    igniteBtn.type = 'button';
    igniteBtn.className = 'btn btn-primary';
    igniteBtn.dataset.testid = 'ignite';
    igniteBtn.textContent = t('btn.ignite');
    igniteBtn.addEventListener('click', () => this.ignite());
    const sideActions = document.createElement('div');
    sideActions.className = 'side-actions';
    sideActions.append(igniteBtn, resetBtn);

    const gaugePair = document.createElement('div');
    gaugePair.className = 'gauge-pair';
    gaugePair.append(heatGauge.root, fidelityGauge.root);
    colSide.append(gaugePair, gain.root, sideActions);

    // OBSERVATION + 炉口视窗（ROUND_BURNING 状态沟通）
    const observation = createObservation(() => this.reduced);
    darkPanel.appendChild(observation.root);

    // v5.0 M7 G1 炉膛内景（观察窗静态深度背景，火焰层之下，aria-hidden）
    const interior = document.createElement('div');
    interior.className = 'furnace-interior';
    interior.setAttribute('aria-motion', '');
    interior.setAttribute('aria-hidden', 'true');
    interior.innerHTML = FURNACE_INTERIOR;
    observation.root.prepend(interior);
    const furnaceCard = document.createElement('div');
    furnaceCard.className = 'furnace-card';
    furnaceCard.dataset.testid = 'furnace-card';
    furnaceCard.setAttribute('aria-hidden', 'true');
    const tape = document.createElement('div');
    tape.className = 'furnace-tape';
    const flame = document.createElement('div');
    flame.className = 'furnace-flame';
    flame.dataset.testid = 'furnace-glow';
    furnaceCard.append(tape, flame);
    furnaceCard.style.display = 'none';
    darkPanel.appendChild(furnaceCard);

    // STATUS
    const status = document.createElement('div');
    status.className = 'status-line';
    status.dataset.testid = 'status';
    darkPanel.appendChild(status);

    // 结局 E 插头（§13：Cycle 09 起，无提示）
    const plug = document.createElement('button');
    plug.type = 'button';
    plug.className = 'plug';
    plug.dataset.testid = 'plug';
    plug.setAttribute('aria-label', t('plug.aria'));
    plug.innerHTML =
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M9 7V3M15 7V3M7 7h10v4a5 5 0 0 1-5 5 5 5 0 0 1-5-5V7zM12 16v5"/></svg>';
    plug.style.display = 'none';
    plug.addEventListener('click', () => this.unplug());
    darkPanel.appendChild(plug);

    stage.appendChild(machine);
    root.appendChild(stage);

    const track = createCutTrack({
      segmentCount: card.segments.length,
      getSelection: () => ({ left: this.state.cutLeft, right: this.state.cutRight }),
      setSelection: (left, right) => {
        this.state = setCut(this.state, left, right);
        this.refreshSelection();
      },
      onTick: (d) => this.audio.cutterTick(d), // §98
    });
    extractPanel.body.appendChild(track.root);

    this.round = {
      card,
      track,
      gain,
      heatGauge,
      fidelityGauge,
      observation,
      flame,
      furnaceCard,
      machineEl: machine,
      output,
      status,
      cycle,
      loadLine,
      ignite: igniteBtn,
      plug,
      feedText,
      texts: { cycle, loadLine },
    };

    // FEED 文本（locale 对应；en 段间补空格，zh 直接连排）
    const locale = getLocale();
    const sep = locale === 'zh-CN' ? '' : ' ';
    feedText.textContent = '';
    card.segments.forEach((seg, i) => {
      const span = document.createElement('span');
      span.className = 'feed-seg';
      span.dataset.index = String(i);
      span.textContent = locale === 'zh-CN' ? seg.zh : seg.en;
      feedText.appendChild(span);
      if (i < card.segments.length - 1 && sep) {
        feedText.appendChild(document.createTextNode(sep));
      }
    });

    this.renderCycleTexts();
    this.refreshSelection();
    this.updateOutput();
    this.updateObservation();
    this.updateFurnace();
    this.announceUnlock();
  }

  private renderCycleTexts(): void {
    const round = this.round;
    if (!round) return;
    round.cycle.textContent = t('cycle.display', { nn: String(this.state.cycle).padStart(2, '0') });
    const loadKey = this.state.act === 1 ? 'load.normal' : this.state.act === 2 ? 'load.high' : 'load.overdrive';
    round.loadLine.textContent = `${t('load.label')}: ${t(loadKey)}`;
    // v4.8 M5 IL-3：Act 铭牌蚀刻的状态钩子（读 GameState，纯渲染，行为零变更）
    round.machineEl.dataset.act = String(this.state.act);

    // v5.0 M7 G3/G4：印章随卡切换（周期转场由既有 mount-rise 整体承载（loadRound 全量重建），
    // 新 <svg> 入场自带 mw-enter 一次性揭示，不加第二层正文动画避免双重运动）
    const sealEl = round.machineEl.querySelector<HTMLElement>('.card-seal');
    if (sealEl) sealEl.innerHTML = CARD_SEALS[this.state.cycle - 1] ?? '';
    // §13 E：插头自 Cycle 09 起出现（无提示）
    round.plug.style.display = this.state.cycle >= 9 ? '' : 'none';
  }

  private refreshSelection(): void {
    this.round?.track.refresh();
    this.updateOutput();
  }

  // §8.1 PREVIEW：OUTPUT 实时更新
  private updateOutput(): void {
    const round = this.round;
    if (!round) return;
    const locale = getLocale();
    const sep = locale === 'zh-CN' ? '' : ' ';
    const segs = round.card.segments
      .slice(this.state.cutLeft, this.state.cutRight + 1)
      .map((s) => (locale === 'zh-CN' ? s.zh : s.en));
    let text: string;
    if (this.state.gain === 0) {
      // §6.5：GAIN 0 原样截取加引号（zh「」/ en 弯引号）
      const joined = segs.join(sep);
      text = locale === 'zh-CN' ? `「${joined}」` : `“${joined}”`;
    } else {
      const template = round.card.gain[this.state.gain as 1 | 2 | 3];
      text = (locale === 'zh-CN' ? template.zh : template.en).replace('{selection}', segs.join(sep));
    }
    round.output.textContent = text;
    const ok = hasCoreSelected(round.card, this.state.cutLeft, this.state.cutRight);
    round.ignite.disabled = !ok; // §17 CORE 硬规则
    round.status.textContent = ok ? '' : t('error.noCore');
    round.status.classList.toggle('status-warn', !ok); // §6.2 警示态
  }

  private updateObservation(): void {
    this.round?.observation.update(this.state.agitation, this.state.polarization, this.state.reduction);
  }

  // D26：炉膛光强随 heat 连续映射
  private updateFurnace(): void {
    const round = this.round;
    if (!round) return;
    round.flame.style.opacity = String(Math.max(0, Math.min(100, this.state.heat)) / 100);
    // v4.8 M5 IL-1：余烬床强度与火焰同一 heat 连续映射（machine.css --ember-level）
    round.furnaceCard.style.setProperty('--ember-level', String(Math.max(0, Math.min(100, this.state.heat)) / 100));
    round.flame.style.animation = '';
    if (!this.reduced && this.state.heat > 0) {
      round.flame.style.animation = 'furnace-flicker 1.6s ease-in-out infinite';
    }
    this.audio.setHeatResonance(this.state.heat >= 90); // §102
  }

  // §27：GAIN 解锁提示（1.2s + 咔）
  private announceUnlock(): void {
    const max = maxGainForCycle(this.state.cycle);
    if (max <= this.announcedGain) return;
    this.announcedGain = max;
    if (max === 0) return;
    const key = max === 1 ? 'gain.unlock1' : max === 2 ? 'gain.unlock2' : 'gain.unlock3';
    this.audio.relay();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.dataset.testid = 'gain-unlock-toast';
    toast.textContent = t(key);
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    window.setTimeout(() => {
      toast.classList.remove('show');
      window.setTimeout(() => toast.remove(), 250);
    }, UNLOCK_TOAST_MS);
    this.round?.gain.refresh();
  }

  // §8.2 / §8.3：IGNITE（不可撤销）+ 950ms 反馈
  private ignite(): void {
    const round = this.round;
    if (!round || this.state.phase !== 'ROUND_EDITING') return;
    if (!hasCoreSelected(round.card, this.state.cutLeft, this.state.cutRight)) return;

    const prev = { heat: this.state.heat, fidelity: this.state.fidelity };
    const decay = DECAY_ACT[actForCycle(this.state.cycle) - 1]!;
    const result = computeRound(
      round.card,
      this.state.cutLeft,
      this.state.cutRight,
      this.state.gain,
      decay,
      { heat: prev.heat, fidelity: prev.fidelity, agitation: this.state.agitation, polarization: this.state.polarization, reduction: this.state.reduction },
    );
    this.state = applyRoundResult(this.state, result);
    this.phaseTo('ROUND_BURNING'); // §8.2：锁定，无 Undo

    round.track.lock();
    round.ignite.disabled = true;
    round.gain.refresh();
    this.audio.ignite(result.heatGain); // §100
    round.machineEl.classList.add('burning');
    round.furnaceCard.style.display = '';

    const heatIntermediate = prev.heat - decay; // 140–300ms 先扣耗散
    const finish = window.setTimeout(() => this.afterBurn(result), FEEDBACK_TOTAL_MS);
    void finish;

    window.setTimeout(() => {
      round.heatGauge.set(heatIntermediate);
      round.flame.style.opacity = String(Math.max(0, heatIntermediate) / 100);
      round.furnaceCard.style.setProperty('--ember-level', String(Math.max(0, heatIntermediate) / 100)); // IL-1
    }, FEEDBACK_SINK_MS);

    window.setTimeout(() => {
      round.heatGauge.set(this.state.heat); // 300–600ms HEAT 上升
      round.flame.style.opacity = String(this.state.heat / 100);
      round.furnaceCard.style.setProperty('--ember-level', String(this.state.heat / 100)); // IL-1
      if (!this.reduced) {
        round.flame.style.animation = 'furnace-flicker 0.4s ease-in-out 3';
      }
    }, FEEDBACK_HEAT_DONE_MS - 100);

    window.setTimeout(() => {
      round.fidelityGauge.set(this.state.fidelity); // 600–770ms FIDELITY 指针
      this.audio.fidelityDamage(result.fidelityDamage); // §101
    }, FEEDBACK_FIDELITY_DONE_MS);

    window.setTimeout(() => {
      this.updateObservation(); // 770–950ms 观察窗改变
      this.updateFurnace();
    }, FEEDBACK_TOTAL_MS - 100);
  }

  private afterBurn(result: ReturnType<typeof computeRound>): void {
    const round = this.round;
    if (round) {
      round.machineEl.classList.remove('burning');
      round.furnaceCard.style.display = 'none';
    }
    this.phaseTo('ROUND_RESULT'); // §18.5：反馈动画完成 → ROUND_RESULT
    const ending = evaluateEnding(this.state);
    if (ending) {
      this.showEnding(ending);
      return;
    }
    // §12 机器反馈（D5）
    this.lastMachineMessage = selectMachineMessage(result.fidelityDamage, result.heatGain);
    this.lastReserve = hasReserveMessage(result.heatGain);
    this.renderMachineMessage();
    this.showNextInput();
  }

  private renderMachineMessage(): void {
    const round = this.round;
    if (!round || !this.lastMachineMessage) return;
    const main = t(`msg.${this.lastMachineMessage}`) as string;
    round.status.textContent = this.lastReserve ? `${main} ${t('msg.highYield')}` : main; // §12 附加行
    round.status.classList.remove('status-warn');
  }

  private showNextInput(): void {
    const round = this.round;
    if (!round) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-dark';
    btn.dataset.testid = 'next';
    btn.style.display = 'block';
    btn.style.margin = '12px auto 0';
    btn.style.minWidth = '200px';
    btn.textContent = t('btn.next');
    btn.addEventListener('click', () => {
      btn.remove();
      this.nextInput();
    });
    round.status.parentElement?.insertBefore(btn, round.status);
  }

  // §8.1 NEXT INPUT → 下一轮或结局
  private nextInput(): void {
    if (this.state.cycle >= TOTAL_CYCLES) {
      const ending = evaluateEnding({ ...this.state, roundsCompleted: this.state.roundsCompleted });
      this.showEnding(ending ?? 'D');
      return;
    }
    this.phaseTo('ROUND_EDITING');
    this.state = { ...this.state, cycle: this.state.cycle + 1, act: actForCycle(this.state.cycle + 1) };
    this.loadRound();
  }

  // ─────────────────────────────── 结局（§13 / D15 / D22） ───────────────────────────────

  private showEnding(ending: 'A' | 'B' | 'C' | 'D' | 'E'): void {
    assertTransition(this.state.phase, 'ENDING');
    this.state = { ...this.state, phase: 'ENDING', ending };

    // 结局语境不残留悬浮提示：toast 挂在 body 上（§27/D16），其 1.2s 退场定时器
    // 可能跨过 phase 卸载边界（如 C09 解锁 toast 退场中拔插头）——确定性优先，即时移除
    document.querySelectorAll('.toast').forEach((t) => t.remove());

    if (ending === 'E') {
      this.audio.relay(); // §13：立即「咔」
    } else {
      this.audio.endingSlide(); // D22：A–D 归零滑落音
    }
    this.audio.stopHum(); // D15：Hum 停止
    this.audio.setHeatResonance(false);

    this.renderEndingScreen(ending);
  }

  private renderEndingScreen(ending: 'A' | 'B' | 'C' | 'D' | 'E'): void {
    const root = this.root;
    if (!root) return;
    root.textContent = '';
    const stage = document.createElement('div');
    stage.className = `stage stage--ending ending-${ending.toLowerCase()}`;
    const machine = document.createElement('main');
    machine.className = 'machine machine--ending';
    stage.appendChild(machine);
    root.appendChild(stage);

    const header = document.createElement('div');
    header.className = 'machine-header';
    const model = document.createElement('div');
    model.className = 'model-plate caps';
    model.textContent = t('home.model');
    const tools = document.createElement('div');
    tools.className = 'header-tools';
    tools.appendChild(this.localeToggleBtn());
    tools.appendChild(this.settingsBtn());
    header.append(model, tools);
    machine.appendChild(header);

    const endWrap = document.createElement('div');
    endWrap.className = 'ending-wrap';
    machine.appendChild(endWrap);

    // v4.9 M6：结局版画板挂载于结算玻璃幕顶部、横幅之上（aria-hidden 纯视觉）
    const plate = document.createElement('div');
    plate.className = 'ending-plate';
    plate.setAttribute('aria-hidden', 'true');
    plate.innerHTML = ENDING_WOODCUTS[ending.toLowerCase() as keyof typeof ENDING_WOODCUTS];
    endWrap.appendChild(plate);

    // §13 E：所有仪表 → 0、火焰熄灭（在收尾画面上体现）
    renderEndingBanner(endWrap, ending, ending === 'E'); // E 无正文（§13）
    const gaugeRow = document.createElement('div');
    gaugeRow.className = 'gauge-row';
    const heatGauge = createGauge('gauge.heat', 'meter.heat.aria', 'gauge-heat', () => this.reduced);
    const fidelityGauge = createGauge('gauge.fidelity', 'meter.fidelity.aria', 'gauge-fidelity', () => this.reduced);
    gaugeRow.append(heatGauge.root, fidelityGauge.root);
    endWrap.appendChild(gaugeRow);

    const resultState: GameState = { ...this.state, heat: ending === 'E' ? 0 : this.state.heat };
    renderResults(endWrap, resultState, { onRestart: () => this.restart() });
    this.applyHomeTextsRef = () => {
      const list = machine.querySelectorAll<HTMLElement>('.result-list li > span:first-child');
      const keys: Array<Parameters<typeof t>[0]> = [
        'result.peakHeat',
        'result.finalFidelity',
        'result.avgCut',
        'result.highestGain',
        'result.machineStatus',
      ];
      list.forEach((el, i) => {
        if (keys[i]) el.textContent = t(keys[i]);
      });
    };
    heatGauge.set(ending === 'E' ? 0 : this.state.heat);
    fidelityGauge.set(ending === 'E' ? 0 : this.state.fidelity);
  }

  private applyHomeTextsRef: (() => void) | null = null;

  // D33：重新运行 = 全量重置（tutorialSeen 保留）
  private restart(): void {
    this.state = createInitialState();
    this.state = { ...this.state, phase: 'HOME_OFF' };
    this.announcedGain = 0;
    this.lastMachineMessage = null;
    this.lastReserve = false;
    this.renderHome();
  }

  // D12：重播教学（HOME_OFF / ENDING）
  private replayTutorial(): void {
    const from = this.state.phase;
    if (from !== 'HOME_OFF' && from !== 'ENDING') return;
    this.state = createInitialState();
    this.announcedGain = 0;
    this.state = { ...this.state, phase: from };
    this.phaseTo('BOOTING');
    this.bootAnimation(() => {
      this.phaseTo('TUTORIAL');
      this.renderTutorial();
    });
  }

  // §13 E：拔插头（仅 ROUND_EDITING / ROUND_RESULT，cycle ≥ 9）
  private unplug(): void {
    if (!canUnplug(this.state.phase, this.state.cycle)) return;
    this.showEnding('E');
  }

  // ─────────────────────────────── 语言切换（§66） ───────────────────────────────

  private onLocaleSwitched(): void {
    this.homeTexts?.();
    this.applyHomeTextsRef?.();
    if (this.state.phase === 'TUTORIAL') {
      this.renderTutorial();
      return;
    }
    if (this.round && (this.state.phase === 'ROUND_EDITING' || this.state.phase === 'ROUND_BURNING' || this.state.phase === 'ROUND_RESULT')) {
      // 仅文字变化：重渲染整轮（state 不变，§66 保 cycle/cut/gain/heat/fidelity）
      const snapshot = { ...this.state };
      this.loadRound();
      this.state = snapshot;
      // 恢复快照中的选区/增益显示
      this.round.track.refresh();
      this.round.gain.refresh();
      if (this.lastMachineMessage) this.renderMachineMessage();
    }
  }
}

interface Round {
  card: ReturnType<typeof cardForCycle>;
  track: CutTrackHandle;
  gain: GainHandle;
  heatGauge: Gauge;
  fidelityGauge: Gauge;
  observation: ObservationHandle;
  flame: HTMLElement;
  furnaceCard: HTMLElement;
  machineEl: HTMLElement;
  output: HTMLElement;
  status: HTMLElement;
  cycle: HTMLElement;
  loadLine: HTMLElement;
  ignite: HTMLButtonElement;
  plug: HTMLButtonElement;
  feedText: HTMLElement;
  texts: { cycle: HTMLElement; loadLine: HTMLElement };
}
