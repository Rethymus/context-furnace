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

// §2.2 开机动画 1.15s；§8.3 反馈动画 950ms（时序集中管理）
const BOOT_TOTAL_MS = 1150;
const BOOT_RELAY_MS = 120;
const BOOT_SWEEP_DONE_MS = 470;
const BOOT_WINDOW_MS = 720;
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
    stage.className = 'stage';

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

    const title = document.createElement('h1');
    title.className = 'title-plate';
    title.style.textAlign = 'center';
    title.dataset.testid = 'home-title';
    machine.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'caps';
    subtitle.style.textAlign = 'center';
    subtitle.style.color = 'var(--muted-ink)';
    subtitle.style.letterSpacing = '0.2em';
    subtitle.dataset.testid = 'home-subtitle';
    machine.appendChild(subtitle);

    // 两枚小仪表（§6 首页草图：HEAT / FIDELITY 圆窗；§2.2 开机自检的对象）
    const mini = document.createElement('div');
    mini.className = 'gauge-row';
    mini.style.justifyContent = 'center';
    for (const key of ['gauge.heat', 'gauge.fidelity'] as const) {
      const g = document.createElement('div');
      g.className = 'gauge';
      const dot = document.createElement('div');
      dot.className = 'gauge-dot';
      const label = document.createElement('div');
      label.className = 'gauge-label caps';
      label.textContent = t(key);
      g.append(dot, label);
      mini.appendChild(g);
    }
    machine.appendChild(mini);

    const power = document.createElement('button');
    power.type = 'button';
    power.className = 'btn btn-primary';
    power.dataset.testid = 'power-on';
    power.style.display = 'block';
    power.style.margin = '14px auto';
    power.style.minWidth = '160px';
    power.textContent = t('home.power');
    power.addEventListener('click', () => this.powerOn());
    machine.appendChild(power);

    const motto = document.createElement('p');
    motto.style.textAlign = 'center';
    motto.style.color = 'var(--muted-ink)';
    motto.dataset.testid = 'home-motto';
    machine.appendChild(motto);

    stage.appendChild(machine);
    root.appendChild(stage);

    const texts = () => {
      title.textContent = t('home.title');
      subtitle.textContent = t('home.subtitle');
      power.textContent = t('home.power');
      motto.textContent = t('home.motto');
      const labels = mini.querySelectorAll<HTMLElement>('.gauge-label');
      labels[0]!.textContent = t('gauge.heat');
      labels[1]!.textContent = t('gauge.fidelity');
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
    // §2.2 时序：0–120ms 继电器；470–720ms 观察窗亮起（圆窗自检扫描后点亮）；720–950ms 炉光；1150ms 校准完成
    window.setTimeout(() => this.audio.relay(), BOOT_RELAY_MS);
    window.setTimeout(() => {
      for (const dot of root.querySelectorAll<HTMLElement>('.gauge-dot')) {
        dot.classList.add('boot-sweep');
      }
    }, BOOT_SWEEP_DONE_MS);
    window.setTimeout(() => {
      for (const dot of root.querySelectorAll<HTMLElement>('.gauge-dot')) {
        dot.classList.remove('boot-sweep');
        dot.classList.add('lit');
      }
      const sub = root.querySelector<HTMLElement>('[data-testid="home-subtitle"]');
      if (sub) sub.style.opacity = '1';
    }, BOOT_WINDOW_MS);
    window.setTimeout(() => {
      const motto = root.querySelector<HTMLElement>('[data-testid="home-motto"]');
      if (motto) motto.style.color = 'var(--heat)';
    }, BOOT_FURNACE_MS);
    window.setTimeout(after, BOOT_TOTAL_MS);
  }

  // ─────────────────────────────── 教学（§3 / D8 / D35） ───────────────────────────────

  private startTutorial(): void {
    this.phaseTo('TUTORIAL');
    this.renderTutorial();
  }

  private tutorialTrack: CutTrackHandle | null = null;
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
    machine.className = 'machine';

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

    const feedPanel = this.panel('panel.feed', 'panel-feed');
    const feedText = document.createElement('p');
    feedText.className = 'feed-text reading';
    feedText.dataset.testid = 'feed';
    feedPanel.body.appendChild(feedText);

    const extractPanel = this.panel('panel.extract', 'panel-extract');
    machine.appendChild(feedPanel.wrap);
    machine.appendChild(extractPanel.wrap);

    const outputPanel = this.panel('panel.output', 'panel-output');
    const output = document.createElement('p');
    output.className = 'output-text reading';
    output.dataset.testid = 'output';
    outputPanel.body.appendChild(output);
    machine.appendChild(outputPanel.wrap);

    const controlRow = document.createElement('div');
    controlRow.className = 'control-row';
    const ignite = document.createElement('button');
    ignite.type = 'button';
    ignite.className = 'btn btn-primary';
    ignite.dataset.testid = 'ignite';
    ignite.textContent = t('btn.ignite');
    ignite.addEventListener('click', () => this.finishTutorial());
    controlRow.appendChild(ignite);
    machine.appendChild(controlRow);

    const hint = document.createElement('div');
    hint.className = 'status-line';
    hint.dataset.testid = 'tutorial-hint';
    machine.appendChild(hint);

    stage.appendChild(machine);
    root.appendChild(stage);

    const locale = getLocale();
    const texts = TUTORIAL_CARD.segments.map((s) => (locale === 'zh-CN' ? s.zh : s.en));
    feedText.textContent = texts.join('');

    this.tutorialTrack = createCutTrack({
      segmentCount: TUTORIAL_CARD.segments.length,
      getSelection: () => ({ left: 0, right: 2 }),
      setSelection: () => {},
      onTick: () => this.audio.cutterTick(1),
    });
    extractPanel.body.appendChild(this.tutorialTrack.root);
    this.tutorialEls = { hint, output, ignite };

    this.showTutorialStep(0);
  }

  // §3 Step 1–5：高亮引导，不锁输入（D35）
  private showTutorialStep(step: number): void {
    const els = this.tutorialEls;
    if (!els) return;
    const hints = [t('tutorial.step1'), t('tutorial.step2'), t('tutorial.step3'), t('tutorial.step4')];
    els.hint.textContent = hints[Math.min(step, 3)] ?? '';
    this.tutorialTrack?.setHighlighted(step === 0 ? 0 : step === 1 ? 1 : null);
    const texts = TUTORIAL_CARD.segments.map((s) => (getLocale() === 'zh-CN' ? s.zh : s.en));
    if (step >= 2) {
      const locale = getLocale();
      const sep = locale === 'zh-CN' ? '' : ' ';
      const joined = texts.slice(0, 3).join(sep);
      els.output.textContent = locale === 'zh-CN' ? `「${joined}」` : `“${joined}”`;
    }
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

  private panel(labelKey: Parameters<typeof t>[0], testid: string): { wrap: HTMLElement; body: HTMLElement; label: HTMLElement } {
    const wrap = document.createElement('section');
    wrap.className = `panel ${testid}`;
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
    header.className = 'machine-header';
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

    // GAUGES
    const gaugeRow = document.createElement('div');
    gaugeRow.className = 'gauge-row';
    const heatGauge = createGauge('gauge.heat', 'meter.heat.aria', 'gauge-heat', () => this.reduced);
    const fidelityGauge = createGauge('gauge.fidelity', 'meter.fidelity.aria', 'gauge-fidelity', () => this.reduced);
    heatGauge.root.dataset.testid = 'gauge-heat';
    fidelityGauge.root.dataset.testid = 'gauge-fidelity';
    heatGauge.set(this.state.heat);
    fidelityGauge.set(this.state.fidelity);
    gaugeRow.append(heatGauge.root, fidelityGauge.root);
    machine.appendChild(gaugeRow);

    const loadLine = document.createElement('div');
    loadLine.className = 'load-line caps';
    loadLine.dataset.testid = 'load-line';
    machine.appendChild(loadLine);

    // FEED
    const feedPanel = this.panel('panel.feed', 'panel-feed');
    const feedText = document.createElement('p');
    feedText.className = 'feed-text reading';
    feedText.dataset.testid = 'feed';
    feedPanel.body.appendChild(feedText);
    machine.appendChild(feedPanel.wrap);

    // EXTRACT
    const extractPanel = this.panel('panel.extract', 'panel-extract');
    machine.appendChild(extractPanel.wrap);

    // OUTPUT
    const outputPanel = this.panel('panel.output', 'panel-output');
    const output = document.createElement('p');
    output.className = 'output-text reading';
    output.dataset.testid = 'output';
    outputPanel.body.appendChild(output);
    machine.appendChild(outputPanel.wrap);

    // CONTROLS
    const controlRow = document.createElement('div');
    controlRow.className = 'control-row';
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn';
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
    controlRow.append(resetBtn, gain.root, igniteBtn);
    machine.appendChild(controlRow);

    // OBSERVATION + FURNACE
    const observation = createObservation(() => this.reduced);
    machine.appendChild(observation.root);
    const furnace = document.createElement('div');
    furnace.className = 'furnace';
    const glow = document.createElement('div');
    glow.className = 'furnace-glow';
    glow.dataset.testid = 'furnace-glow';
    furnace.appendChild(glow);
    machine.appendChild(furnace);

    // STATUS
    const status = document.createElement('div');
    status.className = 'status-line';
    status.dataset.testid = 'status';
    machine.appendChild(status);

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
    machine.appendChild(plug);

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
      glow,
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
  }

  private updateObservation(): void {
    this.round?.observation.update(this.state.agitation, this.state.polarization, this.state.reduction);
  }

  // D26：炉膛光强随 heat 连续映射
  private updateFurnace(): void {
    const round = this.round;
    if (!round) return;
    round.glow.style.opacity = String(Math.max(0, Math.min(100, this.state.heat)) / 100);
    round.glow.style.animation = '';
    if (!this.reduced && this.state.heat > 0) {
      round.glow.style.animation = 'furnace-flicker 1.6s ease-in-out infinite';
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
    if (!this.reduced) round.ignite.classList.add('pressed');

    const heatIntermediate = prev.heat - decay; // 140–300ms 先扣耗散
    const finish = window.setTimeout(() => this.afterBurn(result), FEEDBACK_TOTAL_MS);
    void finish;

    window.setTimeout(() => {
      round.heatGauge.set(heatIntermediate);
      round.glow.style.opacity = String(Math.max(0, heatIntermediate) / 100);
    }, FEEDBACK_SINK_MS);

    window.setTimeout(() => {
      round.heatGauge.set(this.state.heat); // 300–600ms HEAT 上升
      round.glow.style.opacity = String(this.state.heat / 100);
      if (!this.reduced) {
        round.glow.style.animation = 'furnace-flicker 0.4s ease-in-out 3';
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
    this.round?.ignite.classList.remove('pressed');
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
  }

  private showNextInput(): void {
    const round = this.round;
    if (!round) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.dataset.testid = 'next';
    btn.style.display = 'block';
    btn.style.margin = '10px auto 0';
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
    stage.className = 'stage';
    const machine = document.createElement('main');
    machine.className = 'machine';
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

    // §13 E：所有仪表 → 0、火焰熄灭（在收尾画面上体现）
    const gaugeRow = document.createElement('div');
    gaugeRow.className = 'gauge-row';
    const heatGauge = createGauge('gauge.heat', 'meter.heat.aria', 'gauge-heat', () => this.reduced);
    const fidelityGauge = createGauge('gauge.fidelity', 'meter.fidelity.aria', 'gauge-fidelity', () => this.reduced);
    gaugeRow.append(heatGauge.root, fidelityGauge.root);
    machine.appendChild(gaugeRow);

    renderEndingBanner(machine, ending, ending === 'E'); // E 无正文（§13）

    const resultState: GameState = { ...this.state, heat: ending === 'E' ? 0 : this.state.heat };
    renderResults(machine, resultState, { onRestart: () => this.restart() });
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
  glow: HTMLElement;
  output: HTMLElement;
  status: HTMLElement;
  cycle: HTMLElement;
  loadLine: HTMLElement;
  ignite: HTMLButtonElement;
  plug: HTMLButtonElement;
  feedText: HTMLElement;
  texts: { cycle: HTMLElement; loadLine: HTMLElement };
}
