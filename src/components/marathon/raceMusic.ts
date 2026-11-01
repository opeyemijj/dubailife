// The race's soundtrack: an original Afrobeats-style groove made in the browser (nothing to license), so it
// can follow the race. On the start line it's percussion and bass; at the gun the guitar and keys come in;
// sprinting or a crowd boost brings the brass; hitting the wall muffles it all.

export type RaceMood = "startline" | "race" | "sprint" | "wall";

const BPM = 106;
const STEP = 60 / BPM / 4;
const STEPS = 16;
const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);

// Four bars in A minor: Am, F, C, G. Each is [bass note, chord notes].
const CHORDS: Array<[number, number[]]> = [[33, [57, 60, 64]], [29, [57, 60, 65]], [36, [55, 60, 64]], [31, [55, 59, 62]]];
const KICK = [0, 6, 10];
const RIM = [3, 6, 11, 14];       // the tresillo pull that makes it sit back
const CLAP = [4, 12];
const CLAVE = [0, 3, 6, 10, 12];
const LOG = [0, 3, 6, 10, 13];    // the log drum's bassline
const LOG_STEP = [0, 0, 7, 0, 3]; // semitones above the bar's root
const GUITAR = [2, 3, 5, 7, 10, 11, 13, 15];
const BRASS = [0, 3, 6];

export class RaceMusic {
  private out: GainNode;
  private tone: BiquadFilterNode;
  private noise: AudioBuffer;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private next = 0;
  private mood: RaceMood = "startline";

  constructor(private ctx: BaseAudioContext) {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.tone = ctx.createBiquadFilter();
    this.tone.type = "lowpass"; this.tone.frequency.value = 16000;
    this.out = ctx.createGain();
    this.out.gain.value = 0.58;
    this.tone.connect(comp).connect(this.out).connect(ctx.destination);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  start() {
    if (this.timer) return;
    this.next = this.ctx.currentTime + 0.05;
    this.timer = setInterval(() => {
      while (this.next < this.ctx.currentTime + 0.15) { this.playStep(this.step++, this.next); this.next += STEP; }
    }, 30);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
  setMood(m: RaceMood) {
    this.mood = m;
    this.tone.frequency.setTargetAtTime(m === "wall" ? 650 : 16000, this.ctx.currentTime, 0.25);
  }
  setMuted(muted: boolean) {
    this.out.gain.setTargetAtTime(muted ? 0 : 0.58, this.ctx.currentTime, 0.05);
  }

  /** One sixteenth of the groove, at time t. */
  playStep(n: number, t: number) {
    const s = n % STEPS, bar = Math.floor(n / STEPS) % 4;
    const [root, chord] = CHORDS[bar];
    const full = this.mood !== "startline", hot = this.mood === "sprint";
    // Swing the off sixteenths a touch, so it rolls instead of marching.
    const at = t + (s % 2 ? STEP * 0.14 : 0);
    if (KICK.includes(s)) this.kick(at);
    if (RIM.includes(s)) this.hit(at, 1900, 0.05, 0.22, "bandpass");
    if (CLAP.includes(s)) this.hit(at, 1500, 0.11, 0.3, "bandpass");
    this.hit(at, 7500, s % 4 === 2 ? 0.05 : 0.025, s % 4 === 2 ? 0.14 : 0.07, "highpass"); // shaker
    if (CLAVE.includes(s)) this.tone1(at, 1250, 0.05, 0.08, "square");
    const i = LOG.indexOf(s);
    if (i >= 0) this.log(at, midi(root + 12 + LOG_STEP[i]));
    if (full) {
      const g = GUITAR.indexOf(s);
      if (g >= 0) this.tone1(at, midi(chord[g % 3] + 12), 0.16, 0.24, "triangle");
      if (s === 0 || s === 8) for (const c of chord) this.tone1(at, midi(c), 0.55, 0.13, "sine"); // keys
    }
    if (hot && BRASS.includes(s)) for (const c of chord) this.tone1(at, midi(c + 12), 0.2, 0.16, "sawtooth");
    // A talking-drum fill into each new phrase.
    if (bar === 3 && s >= 12) this.talk(at, 300 + (s - 12) * 45);
  }

  private env(t: number, level: number, dur: number) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.tone);
    return g;
  }
  private tone1(t: number, f: number, dur: number, level: number, type: OscillatorType) {
    const o = this.ctx.createOscillator();
    o.type = type; o.frequency.value = f;
    o.connect(this.env(t, level, dur));
    o.start(t); o.stop(t + dur + 0.02);
  }
  private kick(t: number) {
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.09);
    o.connect(this.env(t, 0.5, 0.18));
    o.start(t); o.stop(t + 0.22);
  }
  /** The log drum: a round, woody bass note that bends down as it dies. */
  private log(t: number, f: number) {
    const o = this.ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(f * 1.5, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.04);
    o.connect(this.env(t, 0.6, 0.3));
    o.start(t); o.stop(t + 0.28);
  }
  private talk(t: number, f: number) {
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(f * 0.8, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    o.connect(this.env(t, 0.16, 0.11));
    o.start(t); o.stop(t + 0.13);
  }
  private hit(t: number, f: number, dur: number, level: number, type: BiquadFilterType) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const flt = this.ctx.createBiquadFilter();
    flt.type = type; flt.frequency.value = f;
    src.connect(flt).connect(this.env(t, level, dur));
    src.start(t, Math.random() * 0.8, dur + 0.02);
  }
}
