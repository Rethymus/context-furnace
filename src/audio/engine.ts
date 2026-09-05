// DESIGN_SPEC §16：Web Audio 全程序化合成。无 BGM、零音频文件（原规格 §94–95）。
// AudioContext 仅在 POWER ON 手势内创建/恢复（§2.2）；音频是反馈不是逻辑依赖（§130）。
// D21：表外交互全部静音；D22：结局 A–D 归零滑落音；D23：轻响/crackle/heat≥90 参数自定。

export type SoundSettings = { enabled: boolean; volume: number }; // volume 0–100，默认 70

const HUM_LOW_HZ = 48; // §96
const HUM_LOW_GAIN = 0.012;
const HUM_HIGH_HZ = 96;
const HUM_HIGH_GAIN = 0.004;
const HUM_LOWPASS_HZ = 180;
const RELAY_HZ = 110; // §97
const RELAY_MS = 22;
const TICK_HZ = 1200; // §98
const TICK_MS = 14;
const TICK_GAIN = 0.035;
const TICK_STEP_HZ = 35;
const GAIN_CLICK_A_HZ = 660; // §99
const GAIN_CLICK_A_MS = 18;
const GAIN_CLICK_B_HZ = 1050;
const GAIN_CLICK_B_MS = 12;
const GAIN_CLICK_DELAY_MS = 8;
const IGNITE_HZ = 82; // §100
const IGNITE_TONE_MS = 90;
const IGNITE_BANDPASS_HZ = 700;
const IGNITE_BASE_MS = 120;
const IGNITE_PER_HEAT_MS = 7;
const IGNITE_MAX_MS = 380;
const SLIDE_FROM_HZ = 220; // D22
const SLIDE_TO_HZ = 55;
const SLIDE_MS = 300;
const SLIDE_GAIN = 0.02;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private humGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private settings: SoundSettings = { enabled: true, volume: 70 };
  private resonanceOsc: OscillatorNode | null = null;
  private resonanceGain: GainNode | null = null;

  // §2.2 / §130：必须在用户手势内调用；失败时静默降级
  init(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    try {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = this.effectiveVolume();
      master.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;

      const len = Math.floor(ctx.sampleRate * 0.05);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buf;

      this.startHum();
    } catch {
      this.ctx = null; // §130：创建失败整局可完成
    }
  }

  setSettings(s: SoundSettings): void {
    this.settings = s;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.effectiveVolume(), this.ctx.currentTime, 0.02);
    }
  }

  private effectiveVolume(): number {
    if (!this.settings.enabled) return 0;
    return (Math.max(0, Math.min(100, this.settings.volume)) / 100) * 0.5;
  }

  get available(): boolean {
    return this.ctx !== null;
  }

  private startHum(): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const humGain = ctx.createGain();
    humGain.gain.value = 1;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = HUM_LOWPASS_HZ;
    humGain.connect(lowpass);
    lowpass.connect(master);

    const a = ctx.createOscillator();
    a.type = 'sine';
    a.frequency.value = HUM_LOW_HZ;
    const aGain = ctx.createGain();
    aGain.gain.value = HUM_LOW_GAIN; /* §96 */
    a.connect(aGain);
    aGain.connect(humGain);
    a.start();

    const b = ctx.createOscillator();
    b.type = 'sine';
    b.frequency.value = HUM_HIGH_HZ;
    const bGain = ctx.createGain();
    bGain.gain.value = HUM_HIGH_GAIN; /* §96 */
    b.connect(bGain);
    bGain.connect(humGain);
    b.start();

    this.humGain = humGain;
  }

  // D15：进入 ENDING 即停止 Hum
  stopHum(): void {
    if (this.humGain && this.ctx) {
      this.humGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }

  // §97：继电器「咔」
  relay(soft = false): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = RELAY_HZ;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(soft ? 0.12 : 0.2, t0); // soft = D23 轻响档
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + RELAY_MS / 1000);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + RELAY_MS / 1000 + 0.01);

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(soft ? 0.05 : 0.08, t0);
    nGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.025);
    noise.connect(nGain);
    nGain.connect(master);
    noise.start(t0);
  }

  // §98：裁刀 tick，向右 +35 Hz / 向左 −35 Hz
  cutterTick(direction: 1 | -1): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = TICK_HZ + direction * TICK_STEP_HZ;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(TICK_GAIN, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + TICK_MS / 1000);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + TICK_MS / 1000 + 0.01);
  }

  // §99：GAIN 卡位双击
  gainClick(): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const t0 = ctx.currentTime;
    const mk = (hz: number, ms: number, at: number) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = hz;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.05, at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + ms / 1000);
      osc.connect(gain);
      gain.connect(master);
      osc.start(at);
      osc.stop(at + ms / 1000 + 0.01);
    };
    mk(GAIN_CLICK_A_HZ, GAIN_CLICK_A_MS, t0);
    mk(GAIN_CLICK_B_HZ, GAIN_CLICK_B_MS, t0 + GAIN_CLICK_DELAY_MS / 1000);
  }

  // §100：IGNITE，噪声时长 = 120 + heatGain × 7 ms（上限 380）
  ignite(heatGain: number): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const t0 = ctx.currentTime;
    const noiseMs = Math.min(IGNITE_MAX_MS, IGNITE_BASE_MS + heatGain * IGNITE_PER_HEAT_MS);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = IGNITE_HZ;
    const oGain = ctx.createGain();
    oGain.gain.setValueAtTime(0.18, t0);
    oGain.gain.exponentialRampToValueAtTime(0.0001, t0 + IGNITE_TONE_MS / 1000);
    osc.connect(oGain);
    oGain.connect(master);
    osc.start(t0);
    osc.stop(t0 + IGNITE_TONE_MS / 1000 + 0.01);

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = IGNITE_BANDPASS_HZ; /* §100 */
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.0001, t0);
    nGain.gain.linearRampToValueAtTime(0.14, t0 + 0.04);
    nGain.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseMs / 1000);
    noise.connect(bandpass);
    bandpass.connect(nGain);
    nGain.connect(master);
    noise.start(t0);
    noise.stop(t0 + noiseMs / 1000 + 0.02);
  }

  // §101：fidelity 损伤。<8 无声；8–15 继电器轻响；16+ 两次短促 crackle（D23 参数自定）。
  fidelityDamage(damage: number): void {
    if (damage < 8) return;
    if (damage < 16) {
      this.relay(true);
      return;
    }
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    for (const at of [0, 0.06]) {
      const t0 = ctx.currentTime + at;
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = IGNITE_BANDPASS_HZ;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.09, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.02);
      noise.connect(bandpass);
      bandpass.connect(gain);
      gain.connect(master);
      noise.start(t0);
      noise.stop(t0 + 0.03);
    }
  }

  // §102 / D23：heat ≥ 90 低频共振（跨阈值 500ms 淡入/淡出）
  setHeatResonance(active: boolean): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    if (active && !this.resonanceOsc) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 55;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.006, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      this.resonanceOsc = osc;
      this.resonanceGain = gain;
    } else if (!active && this.resonanceOsc && this.resonanceGain) {
      const osc = this.resonanceOsc;
      const gain = this.resonanceGain;
      gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.2);
      setTimeout(() => void osc.stop(), 600);
      this.resonanceOsc = null;
      this.resonanceGain = null;
    }
  }

  // D22：结局 A–D 归零滑落音；结局 E 不调用（仅有 relay 咔）
  endingSlide(): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(SLIDE_FROM_HZ, t0);
    osc.frequency.exponentialRampToValueAtTime(SLIDE_TO_HZ, t0 + SLIDE_MS / 1000);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(SLIDE_GAIN, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + SLIDE_MS / 1000);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + SLIDE_MS / 1000 + 0.02);
  }
}
