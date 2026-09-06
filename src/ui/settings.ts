// DESIGN_SPEC §17.1：设置（仅五项 + About，D31）；D3 Escape 关闭；D12 重播教学时机。
import { getLocale, onLocaleChange, setLocale, t } from '../i18n';
import type { Phase } from '../game/types';

export type MotionSetting = 'system' | 'full' | 'reduced';
export type SoundSetting = 'on' | 'off';

export interface Settings {
  sound: SoundSetting; // cf.sound
  volume: number; // cf.volume 0–100 默认 70
  motion: MotionSetting; // cf.motion
}

export interface SettingsCallbacks {
  onChange(settings: Settings): void;
  onReplayTutorial(): void;
  phase(): Phase;
}

function load(): Settings {
  try {
    const sound = globalThis.localStorage?.getItem('cf.sound');
    const volume = globalThis.localStorage?.getItem('cf.volume');
    const motion = globalThis.localStorage?.getItem('cf.motion');
    return {
      sound: sound === 'off' ? 'off' : 'on',
      volume: volume === null ? 70 : Math.max(0, Math.min(100, Number(volume) || 0)),
      motion: motion === 'reduced' || motion === 'full' ? motion : 'system',
    };
  } catch {
    return { sound: 'on', volume: 70, motion: 'system' };
  }
}

function persist(s: Settings): void {
  try {
    globalThis.localStorage?.setItem('cf.sound', s.sound);
    globalThis.localStorage?.setItem('cf.volume', String(s.volume));
    globalThis.localStorage?.setItem('cf.motion', s.motion);
  } catch {
    // 存储不可用时仅本会话生效
  }
}

// §2.3：motion=system 跟随 prefers-reduced-motion
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function effectiveReducedMotion(s: Settings): boolean {
  return s.motion === 'reduced' || (s.motion === 'system' && prefersReducedMotion());
}

export class SettingsPanel {
  private settings: Settings;
  private backdrop: HTMLDivElement | null = null;
  private rows: HTMLElement | null = null;
  private title: HTMLElement | null = null;
  private about: HTMLElement | null = null;
  private offLocale: (() => void) | null = null;
  private onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.close(); // D3
  };

  constructor(private callbacks: SettingsCallbacks) {
    this.settings = load();
  }

  get current(): Settings {
    return this.settings;
  }

  update(partial: Partial<Settings>): void {
    this.settings = { ...this.settings, ...partial };
    persist(this.settings);
    this.callbacks.onChange(this.settings);
    this.renderRows();
  }

  open(): void {
    if (this.backdrop) return;
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.dataset.testid = 'settings-dialog';
    const dialog = document.createElement('div');
    dialog.className = 'dialog mat-paper-thick'; // UI_CONTRACT §4.3 厚纸面材质
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-label', t('settings.title'));
    backdrop.appendChild(dialog);
    this.backdrop = backdrop;

    this.title = document.createElement('h2');
    dialog.appendChild(this.title);

    this.rows = document.createElement('div');
    dialog.appendChild(this.rows);

    this.about = document.createElement('p');
    this.about.className = 'about-text';
    dialog.appendChild(this.about);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', '×');
    closeBtn.addEventListener('click', () => this.close());
    dialog.appendChild(closeBtn);

    this.offLocale = onLocaleChange(() => this.renderRows());
    this.renderRows();

    document.body.appendChild(backdrop);
    document.addEventListener('keydown', this.onKeydown);
    closeBtn.focus();
  }

  close(): void {
    const backdrop = this.backdrop;
    if (!backdrop) return;
    this.backdrop = null;
    this.rows = null;
    document.removeEventListener('keydown', this.onKeydown);
    this.offLocale?.();
    this.offLocale = null;
    // D3：即时卸载。曾尝试 220ms 退场动画 + 定时器卸载，但渲染节流（并行负载下的
    // WebKit 移动仿真）会把定时器拖到秒级以上，浮层滞留 DOM——确定性优先，见 UI_CONTRACT §4.6
    backdrop.remove();
  }

  private renderRows(): void {
    const rows = this.rows;
    if (!rows || !this.title || !this.about) return;
    this.title.textContent = t('settings.title');
    this.about.textContent = t('about.text');
    rows.textContent = '';

    // §17.1-1 语言
    rows.appendChild(
      this.row(t('settings.language'), (row) => {
        const select = document.createElement('select');
        for (const [value, label] of [
          ['zh-CN', t('settings.language.zh')],
          ['en-US', t('settings.language.en')],
        ] as const) {
          const opt = document.createElement('option');
          opt.value = value;
          opt.textContent = label;
          select.appendChild(opt);
        }
        select.value = getLocale();
        select.setAttribute('aria-label', t('settings.language'));
        select.addEventListener('change', () => {
          if (select.value === 'zh-CN' || select.value === 'en-US') setLocale(select.value);
        });
        row.appendChild(select);
      }),
    );

    // §17.1-2 声音
    rows.appendChild(
      this.row(t('settings.sound'), (row) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn';
        btn.dataset.testid = 'sound-toggle';
        btn.textContent = this.settings.sound === 'on' ? t('settings.on') : t('settings.off');
        btn.addEventListener('click', () => {
          this.update({ sound: this.settings.sound === 'on' ? 'off' : 'on' });
        });
        row.appendChild(btn);
      }),
    );

    // §17.1-3 音量（0–100，默认 70）
    rows.appendChild(
      this.row(t('settings.volume'), (row) => {
        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0';
        input.max = '100';
        input.step = '1';
        input.value = String(this.settings.volume);
        input.dataset.testid = 'volume';
        input.setAttribute('aria-label', t('settings.volume'));
        input.addEventListener('input', () => {
          this.update({ volume: Number(input.value) });
        });
        row.appendChild(input);
      }),
    );

    // §17.1-4 动效
    rows.appendChild(
      this.row(t('settings.motion'), (row) => {
        const select = document.createElement('select');
        select.dataset.testid = 'motion-select';
        for (const [value, key] of [
          ['system', 'settings.motion.system'],
          ['full', 'settings.motion.full'],
          ['reduced', 'settings.motion.reduced'],
        ] as const) {
          const opt = document.createElement('option');
          opt.value = value;
          opt.textContent = t(key);
          select.appendChild(opt);
        }
        select.value = this.settings.motion;
        select.setAttribute('aria-label', t('settings.motion'));
        select.addEventListener('change', () => {
          this.update({ motion: select.value as MotionSetting });
        });
        row.appendChild(select);
      }),
    );

    // §17.1-5 重播教学（D12：仅 HOME_OFF / ENDING 可用）
    rows.appendChild(
      this.row(t('settings.replayTutorial'), (row) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn';
        btn.dataset.testid = 'replay-tutorial';
        btn.textContent = t('settings.replayTutorial');
        const phase = this.callbacks.phase();
        btn.disabled = !(phase === 'HOME_OFF' || phase === 'ENDING');
        btn.addEventListener('click', () => {
          this.close();
          this.callbacks.onReplayTutorial();
        });
        row.appendChild(btn);
      }),
    );

    // D31：关于（免责文本在面板底部显示）
    rows.appendChild(
      this.row(t('about.title'), () => {
        // 文本由 this.about 承载
      }),
    );
  }

  private row(label: string, build: (row: HTMLElement) => void): HTMLElement {
    const row = document.createElement('div');
    row.className = 'setting-row';
    const span = document.createElement('span');
    span.textContent = label;
    row.appendChild(span);
    build(row);
    return row;
  }
}
