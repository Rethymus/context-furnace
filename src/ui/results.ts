// DESIGN_SPEC §13–14：结局横幅与结果页（仅五项指标；Copy Result §14.2/D16；重新运行 D33）。
import { averageCutPercent } from '../game/state';
import type { Ending, GameState } from '../game/types';
import { t } from '../i18n';
import { getLocale } from '../i18n';

export interface ResultsCallbacks {
  onRestart(): void;
}

function endingKeys(ending: Ending): { titleKey: Parameters<typeof t>[0]; bodyKey: Parameters<typeof t>[0] } | null {
  switch (ending) {
    case 'A':
      return { titleKey: 'ending.cold.title', bodyKey: 'ending.cold.body' };
    case 'B':
      return { titleKey: 'ending.signal.title', bodyKey: 'ending.signal.body' };
    case 'C':
      return { titleKey: 'ending.stable.title', bodyKey: 'ending.stable.body' };
    case 'D':
      return { titleKey: 'ending.peak.title', bodyKey: 'ending.peak.body' };
    case 'E':
      return { titleKey: 'ending.unplugged.title', bodyKey: 'ending.unplugged.body' };
    default:
      return null;
  }
}

export function endingName(ending: Ending): string {
  switch (ending) {
    case 'A':
      return getLocale() === 'zh-CN' ? '设备停机' : 'Equipment offline';
    case 'B':
      return getLocale() === 'zh-CN' ? '信号失真' : 'Signal lost';
    case 'C':
      return getLocale() === 'zh-CN' ? '稳态运行' : 'Stable run';
    case 'D':
      return getLocale() === 'zh-CN' ? '效率标兵' : 'Peak efficiency';
    case 'E':
      return getLocale() === 'zh-CN' ? '设备已停止工作' : 'Equipment offline';
    default:
      return '';
  }
}

// §13：结局横幅（E 无正文）
export function renderEndingBanner(root: HTMLElement, ending: Ending, compact: boolean): void {
  const keys = endingKeys(ending);
  if (!keys) return;
  const banner = document.createElement('div');
  banner.className = 'ending-banner';
  banner.dataset.testid = 'ending-banner';
  const h2 = document.createElement('h2');
  h2.textContent = t(keys.titleKey);
  banner.appendChild(h2);
  if (!compact) {
    const p = document.createElement('p');
    p.textContent = t(keys.bodyKey);
    banner.appendChild(p);
  }
  root.appendChild(banner);
}

// §14.2 / §85：Copy Result 模板（逐字）
export function buildCopyText(state: GameState): string {
  if (getLocale() === 'zh-CN') {
    return [
      '《断章取火器》CF-01',
      '',
      `最高炉温：${state.peakHeat}`,
      `最终保真：${state.fidelity}`,
      `平均切除：${averageCutPercent(state)}%`,
      `最高增益：${state.highestGain}`,
      `设备状态：${endingName(state.ending)}`,
      '',
      '“本机只负责加工，不负责理解。”',
    ].join('\n');
  }
  return [
    'Context Furnace CF-01',
    '',
    `Peak heat: ${state.peakHeat}`,
    `Final fidelity: ${state.fidelity}`,
    `Average cut: ${averageCutPercent(state)}%`,
    `Highest gain: ${state.highestGain}`,
    `Machine status: ${endingName(state.ending)}`,
    '',
    '“Processing only. Understanding not included.”',
  ].join('\n');
}

// §14.1：结果页仅五项，不显示分数/星级/排名（§84）
export function renderResults(root: HTMLElement, state: GameState, callbacks: ResultsCallbacks): void {
  const wrap = document.createElement('div');
  wrap.className = 'result-card';
  wrap.dataset.testid = 'results';

  const list = document.createElement('ul');
  list.className = 'result-list';
  const rows: Array<[Parameters<typeof t>[0], string]> = [
    ['result.peakHeat', String(state.peakHeat)],
    ['result.finalFidelity', String(state.fidelity)],
    ['result.avgCut', `${averageCutPercent(state)}%`],
    ['result.highestGain', String(state.highestGain)],
    ['result.machineStatus', endingName(state.ending)],
  ];
  for (const [key, value] of rows) {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = t(key);
    const val = document.createElement('span');
    val.textContent = value;
    li.append(label, val);
    list.appendChild(li);
  }
  wrap.appendChild(list);

  const btnRow = document.createElement('div');
  btnRow.className = 'control-row';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'btn';
  copyBtn.dataset.testid = 'copy';
  copyBtn.textContent = t('result.copy');
  const copied = document.createElement('span');
  copied.className = 'copied-chip';
  copied.dataset.testid = 'copied';
  copied.style.display = 'none';
  // D16：成功显示 1.2s；失败静默降级
  copyBtn.addEventListener('click', () => {
    const text = buildCopyText(state);
    const flash = () => {
      copied.textContent = t('copy.copied');
      copied.style.display = '';
      window.setTimeout(() => {
        copied.style.display = 'none';
      }, 1200);
    };
    const fallback = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        flash();
      } catch {
        // D16：剪贴板失败静默
      }
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(flash, fallback);
    } else {
      fallback();
    }
  });

  const restartBtn = document.createElement('button');
  restartBtn.type = 'button';
  restartBtn.className = 'btn btn-dark';
  restartBtn.dataset.testid = 'restart';
  restartBtn.textContent = t('result.restart');
  restartBtn.addEventListener('click', callbacks.onRestart);

  btnRow.append(copyBtn, copied, restartBtn);
  wrap.appendChild(btnRow);
  root.appendChild(wrap);
}
