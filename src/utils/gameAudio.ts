// Game sound engine: 1:1 Web Audio procedural synthesizer from lagoslife.app (FM metallic chimes,
// pitch-drop sine pops, bandpass white-noise shimmers, stereo 1.6s convolution reverb & dynamics
// compressor) paired with background city music.

const MUSIC = ["/audio/music/lofi-hip-hop-loop.m4a", "/audio/music/chill-loopable.m4a"];
const MUSIC_VOLUME = 0.32;
const MUTE_KEY = "dubai_map_muted";

export type SfxName =
  | "tap"
  | "chime"
  | "open"
  | "rustle"
  | "cash"
  | "buy"
  | "sting"
  | "levelup"
  | "promo"
  | "wish"
  | "warn"
  | "notice"
  | "nepaOff"
  | "nepaOn"
  | "honk"
  | "horn"
  | "simlish"
  | "error"
  | "cue"
  | "clack"
  | "pocket"
  | "seed"
  | "card"
  | "dice"
  | "step"
  | "piece"
  | "capture"
  | "crown"
  | "win"
  | "lose"
  | "draw"
  | "move"
  | "turn"
  | "drop"
  | "lines1"
  | "lines2"
  | "lines3"
  | "fullDanfo"
  | "airhorn"
  | "clap"
  | "applause"
  | "roar"
  | "dorime"
  | "mgPerfect"
  | "mgThud"
  | "mgServe"
  | "mgStar"
  | "mgJackpot"
  | "mgKick"
  | "mgHat"
  | `mgHit${number}`;

/** Semitone offset from C5 (523.25 Hz) — exact lagoslife.app pitch helper `W(e)` */
const W = (semitones: number) => 523.25 * Math.pow(2, semitones / 12);

const FORMANT_PAIRS: Array<[number, number]> = [
  [800, 1200],
  [500, 1900],
  [320, 2400],
  [500, 900],
  [350, 750],
];

export function haptic(ms = 8) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* blocked */
    }
  }
}

class GameAudioEngine {
  private music: HTMLAudioElement | null = null;
  private track = 0;
  private wanted = false;
  private held = false;
  private isMuted = false;
  private fade: ReturnType<typeof setInterval> | null = null;

  // lagoslife.app Web Audio graph nodes
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private reverbSend: GainNode | null = null;
  private reverbOut: GainNode | null = null;
  private impulseBuffer: AudioBuffer | null = null;
  private sfxBus: GainNode | null = null;
  private clapBuffer: AudioBuffer | null = null;
  private lastTapAt = 0;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        this.isMuted = localStorage.getItem(MUTE_KEY) === "true";
      } catch {
        /* storage off */
      }
      this.attachGlobalTapListener();
    }
  }

  // Global delegated click listener so every button, link, and interactive control
  // plays the exact lagoslife.app "tap" sound automatically without double-firing.
  private attachGlobalTapListener() {
    if (typeof window === "undefined") return;
    const win = window as unknown as { __llTapAttached?: boolean };
    if (win.__llTapAttached) return;
    win.__llTapAttached = true;

    window.addEventListener(
      "click",
      (e) => {
        const target = e.target as HTMLElement | null;
        if (!target || typeof target.closest !== "function") return;
        const interactive = target.closest(
          'button, a, [role="button"], [role="tab"], [role="menuitem"], summary, input[type="button"], input[type="submit"]'
        ) as HTMLElement | null;
        if (!interactive) return;
        if ((interactive as HTMLButtonElement).disabled || interactive.getAttribute("aria-disabled") === "true") return;
        this.playClickSound();
      },
      { capture: true, passive: true }
    );
  }

  // ---------------------------------------------------------------- music

  private ensureMusic() {
    if (this.music || typeof window === "undefined") return this.music;
    const el = new Audio();
    el.preload = "auto";
    el.volume = 0;
    el.src = MUSIC[this.track];
    el.addEventListener("ended", () => {
      this.track = (this.track + 1) % MUSIC.length;
      el.src = MUSIC[this.track];
      if (this.wanted && !this.isMuted && !this.held) el.play().catch(() => {});
    });
    this.music = el;
    return el;
  }

  private fadeTo(target: number, ms = 800) {
    const el = this.music;
    if (!el) return;
    if (this.fade) clearInterval(this.fade);
    const start = el.volume;
    const steps = Math.max(1, Math.round(ms / 50));
    let i = 0;
    this.fade = setInterval(() => {
      i++;
      el.volume = Math.min(1, Math.max(0, start + ((target - start) * i) / steps));
      if (i >= steps) {
        if (this.fade) clearInterval(this.fade);
        this.fade = null;
        if (target === 0) el.pause();
      }
    }, 50);
  }

  public start() {
    this.wanted = true;
    if (this.isMuted || this.held) return;
    const el = this.ensureMusic();
    if (!el) return;
    el.play()
      .then(() => {
        if (this.held) return this.fadeTo(0, 300);
        this.fadeTo(MUSIC_VOLUME, 1200);
        this.ensureCtx();
      })
      .catch(() => {
        const retry = () => {
          if (this.wanted && !this.isMuted) this.start();
        };
        window.addEventListener("pointerdown", retry, { once: true });
      });
  }

  public stop() {
    this.wanted = false;
    this.fadeTo(0, 600);
  }

  /** Live voice (Spaces): the music stops however the rest of the app asks for it, and returns afterwards. */
  public holdMusic(hold: boolean) {
    if (this.held === hold) return;
    this.held = hold;
    if (hold) this.fadeTo(0, 300);
    else if (this.wanted) this.start();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem(MUTE_KEY, String(muted));
    } catch {
      /* storage off */
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.6, this.ctx.currentTime, 0.02);
    }
    if (muted) this.fadeTo(0, 300);
    else if (this.wanted) this.start();
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // ---------------------------------------------------------------- lagoslife.app Web Audio Core (`R()` & `w(ctx)`)

  private ensureCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      const ctx = new AudioCtx();
      this.ctx = ctx;

      const master = ctx.createGain();
      master.gain.value = this.isMuted ? 0 : 0.6;
      this.masterGain = master;

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 3;
      master.connect(comp).connect(ctx.destination);

      this.buildReverbAndBuses(ctx);
    }
    if (this.ctx.state !== "running" && this.ctx.state !== "closed") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private buildReverbAndBuses(ctx: AudioContext) {
    if (!this.masterGain) return;
    if (this.reverbOut) {
      const oldOut = this.reverbOut;
      oldOut.gain.setTargetAtTime(0, ctx.currentTime, 0.008);
      setTimeout(() => oldOut.disconnect(), 60);
    }
    if (!this.impulseBuffer) {
      const len = Math.floor(1.6 * ctx.sampleRate);
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          data[i] = (2 * Math.random() - 1) * Math.pow(1 - i / len, 3);
        }
      }
      this.impulseBuffer = buf;
    }

    const convolver = ctx.createConvolver();
    convolver.buffer = this.impulseBuffer;

    const send = ctx.createGain();
    send.gain.value = 0.28;
    this.reverbSend = send;

    const out = ctx.createGain();
    this.reverbOut = out;
    send.connect(convolver).connect(out).connect(this.masterGain);

    this.sfxBus?.disconnect();
    const sfx = ctx.createGain();
    sfx.gain.value = 0.9;
    sfx.connect(this.masterGain);
    sfx.connect(send);
    this.sfxBus = sfx;
  }

  // ---------------------------------------------------------------- Synthesis Primitives (`K`, `J`, `L`, `_`, `X`, `Y`, `Z`)

  /** `K(freq, opts)` — Sine pitch-drop pop (used for taps, modals, pool cue, board pieces, warnings) */
  private K(
    freq: number,
    opts: { delay?: number; dur?: number; drop?: number; vol?: number; dest?: AudioNode } = {}
  ) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxBus) return;
    const n = ctx.currentTime + (opts.delay ?? 0);
    const dur = opts.dur ?? 0.12;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1.6 * freq, n);
    osc.frequency.exponentialRampToValueAtTime(freq * (opts.drop ?? 0.85), n + dur);
    g.gain.setValueAtTime(1e-4, n);
    g.gain.exponentialRampToValueAtTime(opts.vol ?? 0.22, n + 0.008);
    g.gain.exponentialRampToValueAtTime(1e-4, n + dur);
    osc.connect(g).connect(opts.dest ?? this.sfxBus);
    osc.start(n);
    osc.stop(n + dur + 0.02);
  }

  /** `J(freq, opts)` — 2-oscillator FM metallic chime / marimba (used for cash, buy, levelup, win, wish, pool clack) */
  private J(
    freq: number,
    opts: { delay?: number; dur?: number; ratio?: number; index?: number; vol?: number; dest?: AudioNode } = {}
  ) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxBus) return;
    const n = ctx.currentTime + (opts.delay ?? 0);
    const dur = opts.dur ?? 0.6;
    const carrier = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const env = ctx.createGain();

    carrier.frequency.value = freq;
    mod.frequency.value = freq * (opts.ratio ?? 3.5);
    modGain.gain.setValueAtTime(freq * (opts.index ?? 2.2), n);
    modGain.gain.exponentialRampToValueAtTime(0.05 * freq, n + 0.6 * dur);
    mod.connect(modGain).connect(carrier.frequency);

    env.gain.setValueAtTime(1e-4, n);
    env.gain.exponentialRampToValueAtTime(opts.vol ?? 0.16, n + 0.005);
    env.gain.exponentialRampToValueAtTime(1e-4, n + dur);
    carrier.connect(env).connect(opts.dest ?? this.sfxBus);

    carrier.start(n);
    mod.start(n);
    carrier.stop(n + dur + 0.05);
    mod.stop(n + dur + 0.05);
  }

  /** `L(dur, opts)` — Bandpass-swept white-noise shimmer/swoosh */
  private L(
    dur: number,
    opts: { delay?: number; from?: number; to?: number; vol?: number; dest?: AudioNode } = {}
  ) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxBus) return;
    const n = ctx.currentTime + (opts.delay ?? 0);
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = 2 * Math.random() - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(opts.from ?? 900, n);
    filter.frequency.exponentialRampToValueAtTime(opts.to ?? 3200, n + dur);

    const g = ctx.createGain();
    g.gain.setValueAtTime(1e-4, n);
    g.gain.exponentialRampToValueAtTime(opts.vol ?? 0.05, n + 0.35 * dur);
    g.gain.exponentialRampToValueAtTime(1e-4, n + dur);

    src.connect(filter).connect(g).connect(opts.dest ?? this.sfxBus);
    src.start(n);
  }

  /** `_(delay, vol, freq)` — Single handclap burst */
  private clapOne(delay: number, vol = 0.12, freq = 1400) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxBus) return;
    const r = ctx.currentTime + delay;
    if (!this.clapBuffer || this.clapBuffer.sampleRate !== ctx.sampleRate) {
      const len = Math.floor(0.09 * ctx.sampleRate);
      this.clapBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.clapBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        data[i] =
          (2 * Math.random() - 1) *
          (Math.exp(-18 * t) + (t > 0.12 && t < 0.2 ? 0.5 : 0) * Math.exp(-30 * (t - 0.12)));
      }
    }
    const src = ctx.createBufferSource();
    src.buffer = this.clapBuffer;
    src.playbackRate.value = 0.85 + 0.3 * Math.random();
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = 1.1;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filter).connect(g).connect(this.sfxBus);
    src.start(r);
  }

  /** `X(dur, count, delay)` — Crowd applause generator */
  private applause(dur: number, count: number, delay = 0) {
    const n = Math.max(2, Math.min(40, Math.round(count)));
    for (let i = 0; i < n; i++) {
      const rate = 3.2 + 2.2 * Math.random();
      const freq = 900 + 1500 * Math.random();
      for (let t = 0.2 * Math.random(); t < dur; t += 1 / rate + (Math.random() - 0.5) * 0.04) {
        const env = Math.min(1, t / 0.35, (dur - t) / 0.6);
        this.clapOne(delay + t, (0.05 + 0.03 * Math.random()) * Math.max(0.15, env) * (n > 12 ? 0.7 : 1), freq);
      }
    }
  }

  /** `Y(delay, dur)` — Two-tone bus/car honk */
  private honkTone(delay: number, dur: number) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxBus) return;
    const n = ctx.currentTime + delay;
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1700;
    g.gain.setValueAtTime(1e-4, n);
    g.gain.exponentialRampToValueAtTime(0.11, n + 0.015);
    g.gain.setValueAtTime(0.11, n + dur - 0.05);
    g.gain.exponentialRampToValueAtTime(1e-4, n + dur);

    const tones: Array<[number, OscillatorType]> = [
      [392, "square"],
      [494, "square"],
      [196, "sawtooth"],
    ];
    for (const [hz, type] of tones) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = hz;
      osc.connect(filter);
      osc.start(n);
      osc.stop(n + dur + 0.02);
    }
    filter.connect(g).connect(this.sfxBus);
  }

  /** `Z(notes, delay, dur)` — Choir pad chord */
  private choirChord(notes: number[], delay: number, dur: number) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxBus) return;
    const r = ctx.currentTime + delay;
    for (const semi of notes) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = W(semi);
      lfo.frequency.value = 5;
      lfoGain.gain.value = 0.006 * W(semi);
      lfo.connect(lfoGain).connect(osc.frequency);
      g.gain.setValueAtTime(1e-4, r);
      g.gain.exponentialRampToValueAtTime(0.035, r + 0.25);
      g.gain.exponentialRampToValueAtTime(1e-4, r + dur);
      osc.connect(g).connect(this.sfxBus);
      osc.start(r);
      lfo.start(r);
      osc.stop(r + dur + 0.05);
      lfo.stop(r + dur + 0.05);
    }
  }

  /** `simlish(syllables, pitch)` — Exact lagoslife.app formant-filtered NPC voice synthesis (`ea`) */
  public simlish(syllables = 4, basePitch = 220) {
    if (this.isMuted || (typeof document !== "undefined" && document.hidden)) return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxBus) return;
    const question = Math.random() < 0.5;
    let r = ctx.currentTime;
    for (let l = 0; l < syllables; l++) {
      const dur = 0.07 + 0.07 * Math.random();
      const [f1, f2] = FORMANT_PAIRS[Math.floor(Math.random() * FORMANT_PAIRS.length)];
      const inflect = question && l === syllables - 1 ? 1.35 : 0.92 + 0.22 * Math.random();
      const f0 = basePitch * (0.9 + 0.35 * Math.random());

      const src = ctx.createOscillator();
      src.type = "sawtooth";
      src.frequency.setValueAtTime(f0, r);
      src.frequency.linearRampToValueAtTime(f0 * inflect, r + dur);

      const vib = ctx.createOscillator();
      const vibGain = ctx.createGain();
      vib.frequency.value = 6;
      vibGain.gain.value = 0.02 * f0;
      vib.connect(vibGain).connect(src.frequency);

      const env = ctx.createGain();
      env.gain.setValueAtTime(1e-4, r);
      env.gain.exponentialRampToValueAtTime(0.16, r + 0.012);
      env.gain.setValueAtTime(0.16, r + 0.7 * dur);
      env.gain.exponentialRampToValueAtTime(1e-4, r + dur);

      const formants: Array<[number, number, number]> = [
        [f1, 6, 1],
        [f2, 9, 0.6],
      ];
      for (const [freq, q, gainVal] of formants) {
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = freq * (basePitch > 260 ? 1.15 : 1);
        bp.Q.value = q;
        const fg = ctx.createGain();
        fg.gain.value = gainVal;
        src.connect(bp).connect(fg).connect(env);
      }

      env.connect(this.sfxBus);
      src.start(r);
      vib.start(r);
      src.stop(r + dur + 0.02);
      vib.stop(r + dur + 0.02);
      r += dur + 0.025 + 0.03 * Math.random();
    }
  }

  /** `crowdClaps(count)` — Exact lagoslife.app crowd clap effect */
  public crowdClaps(count: number) {
    if (this.isMuted || count <= 0 || (typeof document !== "undefined" && document.hidden)) return;
    if (count === 1) {
      this.clapOne(0);
      return;
    }
    this.applause(1.2, Math.min(40, 2 + 1.5 * count));
  }

  // ---------------------------------------------------------------- Exact lagoslife.app `sfx(name)` Presets (`ee(e)`)

  public sfx(name: SfxName) {
    if (this.isMuted || (typeof document !== "undefined" && document.hidden)) return;

    if (name.startsWith("mgHit")) {
      const scale = [0, 2, 4, 7, 9, 12, 14, 16];
      const idx = Math.max(0, Number(name.slice(5)) || 0) % scale.length;
      this.J(W(7 + scale[idx]), { ratio: 2, index: 0.7, vol: 0.1, dur: 0.16 });
      return;
    }

    switch (name) {
      case "mgPerfect":
        this.J(W(19), { ratio: 3.5, index: 1, vol: 0.1, dur: 0.22 });
        this.J(W(24), { ratio: 3.5, index: 1, vol: 0.08, dur: 0.3, delay: 0.05 });
        return;
      case "mgThud":
        this.K(W(-19), { vol: 0.16, dur: 0.12, drop: 0.6 });
        return;
      case "mgServe":
        [0, 4, 7, 12].forEach((e, t) =>
          this.J(W(12 + e), { ratio: 3.5, vol: 0.09, dur: 0.35, delay: 0.05 * t })
        );
        return;
      case "mgStar":
        this.J(W(19), { ratio: 3.5, index: 1.2, vol: 0.13, dur: 0.6 });
        this.L(0.3, { vol: 0.02, from: 3000, to: 9000 });
        return;
      case "mgJackpot":
        [0, 4, 7, 12, 16, 19, 24].forEach((e, t) =>
          this.J(W(e), { ratio: 1, index: 1.5, vol: 0.16, dur: 0.6, delay: 0.07 * t })
        );
        [12, 16, 19, 24].forEach((e) =>
          this.J(W(e), { ratio: 14, index: 0.6, vol: 0.08, dur: 1.6, delay: 0.55 })
        );
        for (let e = 0; e < 8; e++) {
          this.J(W(26 + (e % 3) * 2), { ratio: 3.5, vol: 0.07, dur: 0.25, delay: 0.7 + 0.07 * e });
        }
        this.L(1.2, { vol: 0.05, from: 2000, to: 10000, delay: 0.5 });
        return;
      case "mgKick":
        this.K(W(-24), { vol: 0.2, dur: 0.14, drop: 0.45 });
        return;
      case "mgHat":
        this.L(0.04, { vol: 0.03, from: 7000, to: 9000 });
        return;
      case "tap":
        this.K(W(7), { vol: 0.14, dur: 0.07 });
        return;
      case "chime":
        this.J(W(16), { ratio: 1, index: 0.25, vol: 0.12, dur: 1.4 });
        this.J(W(12), { ratio: 1, index: 0.25, vol: 0.11, dur: 1.8, delay: 0.55 });
        return;
      case "open":
        this.K(W(0), { vol: 0.13, dur: 0.09 });
        this.K(W(7), { vol: 0.12, dur: 0.11, delay: 0.06 });
        this.L(0.18, { vol: 0.02, from: 1200, to: 4000 });
        return;
      case "rustle":
        for (let e = 0; e < 5; e++) {
          this.L(0.08 + 0.04 * Math.random(), {
            vol: 0.014 + 0.008 * Math.random(),
            from: 2600 + 900 * Math.random(),
            to: 5200,
            delay: 0.13 * e + 0.03 * Math.random(),
          });
        }
        return;
      case "cash":
        this.J(W(12), { ratio: 3.5, vol: 0.13, dur: 0.5 });
        this.J(W(19), { ratio: 3.5, vol: 0.12, dur: 0.8, delay: 0.09 });
        this.L(0.25, { vol: 0.025, from: 4000, to: 9000, delay: 0.05 });
        return;
      case "buy":
        this.J(W(0), { ratio: 1, index: 1.2, vol: 0.16, dur: 0.35 });
        this.J(W(7), { ratio: 1, index: 1.2, vol: 0.15, dur: 0.45, delay: 0.08 });
        this.J(W(12), { ratio: 1, index: 1.2, vol: 0.14, dur: 0.6, delay: 0.16 });
        return;
      case "sting":
        this.J(W(12), { ratio: 3.5, vol: 0.09, dur: 0.25 });
        this.J(W(19), { ratio: 3.5, vol: 0.1, dur: 0.4, delay: 0.07 });
        return;
      case "levelup":
        [0, 4, 7, 12, 16].forEach((e, t) =>
          this.J(W(e), { ratio: 3.5, vol: 0.13, dur: 0.7, delay: 0.075 * t })
        );
        this.L(0.6, { vol: 0.03, from: 2000, to: 9000, delay: 0.1 });
        return;
      case "promo":
        [-5, 0, 4, 7, 12].forEach((e, t) =>
          this.J(W(e), { ratio: 1, index: 1.5, vol: 0.14, dur: 0.5, delay: 0.1 * t })
        );
        [0, 4, 7, 11].forEach((e) =>
          this.J(W(e), { ratio: 14, index: 0.6, vol: 0.07, dur: 1.4, delay: 0.55 })
        );
        [12, 16, 19, 24].forEach((e, t) =>
          this.J(W(e), { ratio: 3.5, vol: 0.09, dur: 0.9, delay: 0.6 + 0.06 * t })
        );
        return;
      case "wish":
        [12, 16, 19, 23, 24].forEach((e, t) =>
          this.J(W(e), { ratio: 3.5, vol: 0.1, dur: 0.6, delay: 0.05 * t })
        );
        this.L(0.5, { vol: 0.03, from: 3000, to: 10000 });
        return;
      case "warn":
        this.K(W(-3), { vol: 0.15, dur: 0.16, drop: 0.95 });
        this.K(W(-8), { vol: 0.15, dur: 0.24, drop: 0.9, delay: 0.16 });
        return;
      case "notice":
        this.J(W(7), { ratio: 3.5, index: 1.4, vol: 0.12, dur: 0.6 });
        this.J(W(12), { ratio: 3.5, index: 1.4, vol: 0.11, dur: 0.9, delay: 0.13 });
        return;
      case "nepaOff":
        this.K(W(-12), { vol: 0.2, dur: 0.6, drop: 0.3 });
        this.L(0.5, { vol: 0.03, from: 2000, to: 300 });
        return;
      case "nepaOn":
        this.K(W(-12), { vol: 0.12, dur: 0.25, drop: 2.2 });
        [0, 4, 7, 12].forEach((e, t) =>
          this.J(W(e), { ratio: 3.5, vol: 0.11, dur: 0.5, delay: 0.2 + 0.06 * t })
        );
        return;
      case "honk":
        this.honkTone(0, 0.16);
        this.honkTone(0.2, 0.3);
        return;
      case "horn":
        this.K(W(-7), { vol: 0.16, dur: 0.14, drop: 1 });
        this.K(W(-7), { vol: 0.16, dur: 0.22, drop: 1, delay: 0.18 });
        return;
      case "simlish":
        this.simlish(5);
        return;
      case "error":
        this.K(W(-14), { vol: 0.16, dur: 0.12, drop: 0.8 });
        return;
      case "cue":
        this.K(W(-5), { vol: 0.11, dur: 0.05, drop: 0.7 });
        return;
      case "clack":
        this.J(W(26), { ratio: 2.4, index: 0.8, vol: 0.09, dur: 0.07 });
        return;
      case "pocket":
        this.K(W(-17), { vol: 0.18, dur: 0.18, drop: 0.6 });
        this.K(W(-20), { vol: 0.1, dur: 0.22, drop: 0.7, delay: 0.09 });
        return;
      case "seed":
        this.K(W(14), { vol: 0.08, dur: 0.05, drop: 0.9 });
        return;
      case "card":
        this.L(0.07, { vol: 0.05, from: 2600, to: 900 });
        this.K(W(2), { vol: 0.06, dur: 0.04, drop: 0.8 });
        return;
      case "dice":
        [0, 0.07, 0.15, 0.24].forEach((e) =>
          this.J(W(22), { ratio: 2.1, index: 0.6, vol: 0.05, dur: 0.04, delay: e })
        );
        this.K(W(-3), { vol: 0.1, dur: 0.06, drop: 0.7, delay: 0.34 });
        return;
      case "step":
        this.K(W(9), { vol: 0.06, dur: 0.035, drop: 0.95 });
        return;
      case "piece":
        this.K(W(-2), { vol: 0.12, dur: 0.06, drop: 0.75 });
        return;
      case "capture":
        this.J(W(22), { ratio: 2.4, index: 0.9, vol: 0.11, dur: 0.08 });
        this.K(W(-6), { vol: 0.11, dur: 0.07, drop: 0.7, delay: 0.04 });
        return;
      case "crown":
        [12, 16, 19].forEach((e, t) =>
          this.J(W(e), { ratio: 3.5, vol: 0.1, dur: 0.35, delay: 0.08 + 0.07 * t })
        );
        return;
      case "win":
        [0, 4, 7, 12].forEach((e, t) =>
          this.J(W(e), { ratio: 1, index: 1.3, vol: 0.14, dur: 0.5, delay: 0.09 * t })
        );
        [16, 19, 24].forEach((e, t) =>
          this.J(W(e), { ratio: 3.5, vol: 0.09, dur: 0.7, delay: 0.4 + 0.06 * t })
        );
        this.L(0.5, { vol: 0.03, from: 2500, to: 9000, delay: 0.35 });
        return;
      case "lose":
        this.K(W(-1), { vol: 0.13, dur: 0.22, drop: 0.94 });
        this.K(W(-4), { vol: 0.13, dur: 0.24, drop: 0.92, delay: 0.24 });
        this.K(W(-8), { vol: 0.13, dur: 0.5, drop: 0.85, delay: 0.5 });
        return;
      case "draw":
        this.J(W(7), { ratio: 3.5, index: 1.2, vol: 0.11, dur: 0.5 });
        this.J(W(7), { ratio: 3.5, index: 1.2, vol: 0.1, dur: 0.7, delay: 0.22 });
        return;
      case "move":
        this.K(W(12), { vol: 0.045, dur: 0.03, drop: 0.95 });
        return;
      case "turn":
        this.K(W(17), { vol: 0.055, dur: 0.045, drop: 1.12 });
        return;
      case "drop":
        this.K(W(-12), { vol: 0.12, dur: 0.08, drop: 0.6 });
        return;
      case "lines1":
      case "lines2":
      case "lines3": {
        const count = Number(name.slice(5));
        this.K(W(-12), { vol: 0.1, dur: 0.07, drop: 0.6 });
        for (let i = 0; i < count; i++) {
          this.J(W(12 + [0, 4, 7][i]), { ratio: 3.5, vol: 0.1, dur: 0.35, delay: 0.05 + 0.07 * i });
        }
        return;
      }
      case "fullDanfo":
        this.honkTone(0, 0.12);
        this.honkTone(0.16, 0.22);
        [0, 4, 7, 12, 16].forEach((e, t) =>
          this.J(W(e + 12), { ratio: 3.5, vol: 0.11, dur: 0.6, delay: 0.3 + 0.05 * t })
        );
        return;
      case "airhorn":
        [0, 0.22, 0.44].forEach((delay, idx) => {
          const ctx = this.ensureCtx();
          if (!ctx || !this.sfxBus) return;
          const dur = idx === 2 ? 0.55 : 0.18;
          const n = ctx.currentTime + delay;
          const g = ctx.createGain();
          const filter = ctx.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.value = 1400;
          filter.Q.value = 0.8;
          g.gain.setValueAtTime(1e-4, n);
          g.gain.exponentialRampToValueAtTime(0.09, n + 0.02);
          g.gain.setValueAtTime(0.09, n + dur - 0.04);
          g.gain.exponentialRampToValueAtTime(1e-4, n + dur);
          for (const hz of [466, 470, 698]) {
            const osc = ctx.createOscillator();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(0.94 * hz, n);
            osc.frequency.exponentialRampToValueAtTime(hz, n + 0.05);
            osc.connect(filter);
            osc.start(n);
            osc.stop(n + dur + 0.02);
          }
          filter.connect(g).connect(this.sfxBus);
        });
        this.L(1.2, { vol: 0.05, from: 600, to: 3000, delay: 0.5 });
        return;
      case "clap":
        this.clapOne(0);
        return;
      case "applause":
        this.applause(1.8, 14);
        return;
      case "roar":
        this.L(3.2, { vol: 0.07, from: 300, to: 900 });
        this.L(0.9 * 3.2, { vol: 0.05, from: 600, to: 1800, delay: 0.1 });
        this.L(0.7 * 3.2, { vol: 0.035, from: 1200, to: 3200, delay: 0.25 });
        this.applause(3.4, 26, 0.25);
        return;
      case "dorime":
        this.choirChord([-12, -5, 0, 4], 0, 1.1);
        this.choirChord([-10, -3, 2, 5], 1, 1.1);
        this.choirChord([-8, -1, 4, 7], 2, 1.8);
        [24, 28, 31, 36, 31, 36].forEach((e, t) =>
          this.J(W(e), { ratio: 3.5, vol: 0.06, dur: 0.5, delay: 0.3 + 0.45 * t })
        );
        this.L(3.5, { vol: 0.025, from: 5000, to: 9000, delay: 0.2 });
        return;
    }
  }

  /** Taps on buttons and places — exact lagoslife.app `"tap"` + haptic(8) with 45ms debounce */
  public playClickSound() {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - this.lastTapAt < 45) return;
    this.lastTapAt = now;
    this.sfx("tap");
    haptic(8);
  }

  /** Money: buying, earning, gifts and transfers — exact lagoslife.app `"cash"` */
  public playCoinSound() {
    this.sfx("cash");
    haptic(12);
  }

  /** Something done: a booking, a purchase confirmed — exact lagoslife.app `"buy"` */
  public playConfirmSound() {
    this.sfx("buy");
    haptic(10);
  }
}

export const gameAudio = new GameAudioEngine();
export const sfx = (name: SfxName) => gameAudio.sfx(name);
