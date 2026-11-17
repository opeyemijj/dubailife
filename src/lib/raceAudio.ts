"use client";

// Race car sound, made in the browser (no recordings): a V10 like a Lamborghini's. A ten-cylinder four-stroke fires
// five times a revolution, so its note is revs/60 × 5 (about 700 Hz at the 8,500 rpm limiter), with a sub tone from
// the crank, a rasp of upper harmonics through distortion, an induction howl that opens up with the throttle, and the
// exhaust roar (filtered noise) under load. Lifting off at high revs crackles and pops; each upshift cuts the sound
// for a moment. Tyres squeal when you push the corners. The other cars get a lighter engine each, quieter with
// distance, so you hear them coming.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

/** The race's audio, started by a tap (browsers only allow sound after one). */
export function raceAudio(): { ctx: AudioContext; master: GainNode } | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
    master = ctx.createGain();
    master.gain.value = 0.85;
    // A gentle limiter so ten cars at once never clip.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return { ctx, master: master! };
}

export function setRaceVolume(on: boolean) {
  if (master && ctx) master.gain.setTargetAtTime(on ? 0.85 : 0, ctx.currentTime, 0.05);
}

function noiseBuffer(c: AudioContext, seconds = 2) {
  const b = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function distortion(c: AudioContext, amount: number) {
  const ws = c.createWaveShaper();
  const n = 1024, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x)); }
  ws.curve = curve;
  ws.oversample = "2x";
  return ws;
}

/** Your own engine: the full V10. */
export class V10 {
  private c: AudioContext;
  private out: GainNode;
  private fire: OscillatorNode; private sub: OscillatorNode; private harm: OscillatorNode;
  private body: BiquadFilterNode; private howl: BiquadFilterNode; private howlGain: GainNode;
  private roar: GainNode; private roarFilter: BiquadFilterNode; private noise: AudioBufferSourceNode;
  private squeal: GainNode; private squealSrc: AudioBufferSourceNode;
  private lastThrottle = 0; private lastGear = 1; private lastRpm = 1000; private crackleUntil = 0;
  private buf: AudioBuffer;

  /** level: how loud overall (1 at the Autodrome; driving the city's roads is quieter). */
  constructor(level = 1) {
    const a = raceAudio()!;
    this.c = a.ctx;
    const c = this.c;
    this.out = c.createGain(); this.out.gain.value = 0;
    if (level === 1) this.out.connect(a.master);
    else { const trim = c.createGain(); trim.gain.value = level; this.out.connect(trim).connect(a.master); }

    const mix = c.createGain(); mix.gain.value = 0.32;
    this.fire = c.createOscillator(); this.fire.type = "sawtooth";
    this.sub = c.createOscillator(); this.sub.type = "square";
    this.harm = c.createOscillator(); this.harm.type = "sawtooth";
    const gFire = c.createGain(); gFire.gain.value = 0.6;
    const gSub = c.createGain(); gSub.gain.value = 0.35;
    const gHarm = c.createGain(); gHarm.gain.value = 0.18;
    this.fire.connect(gFire).connect(mix);
    this.sub.connect(gSub).connect(mix);
    this.harm.connect(gHarm).connect(mix);
    // The rasp: drive it hard, then shape it.
    const rasp = distortion(c, 18);
    this.body = c.createBiquadFilter(); this.body.type = "lowpass"; this.body.Q.value = 2.2;
    mix.connect(rasp).connect(this.body).connect(this.out);
    // The induction howl: a resonant band on the second harmonic, opening with the throttle.
    this.howl = c.createBiquadFilter(); this.howl.type = "bandpass"; this.howl.Q.value = 6;
    this.howlGain = c.createGain(); this.howlGain.gain.value = 0;
    rasp.connect(this.howl).connect(this.howlGain).connect(this.out);
    // The exhaust roar: noise under load.
    this.buf = noiseBuffer(c);
    this.noise = c.createBufferSource(); this.noise.buffer = this.buf; this.noise.loop = true;
    this.roarFilter = c.createBiquadFilter(); this.roarFilter.type = "bandpass"; this.roarFilter.Q.value = 0.8;
    this.roar = c.createGain(); this.roar.gain.value = 0;
    this.noise.connect(this.roarFilter).connect(this.roar).connect(this.out);
    // Tyres.
    this.squealSrc = c.createBufferSource(); this.squealSrc.buffer = this.buf; this.squealSrc.loop = true;
    const sq = c.createBiquadFilter(); sq.type = "bandpass"; sq.frequency.value = 1500; sq.Q.value = 9;
    this.squeal = c.createGain(); this.squeal.gain.value = 0;
    this.squealSrc.connect(sq).connect(this.squeal).connect(a.master);

    const t = c.currentTime;
    for (const o of [this.fire, this.sub, this.harm]) o.start(t);
    this.noise.start(t); this.squealSrc.start(t);
    this.out.gain.setTargetAtTime(0.9, t, 0.3);
  }

  /** Every frame: revs, throttle (0..1), gear, how hard the tyres are working (0..1). */
  update(rpm: number, throttle: number, gear: number, drift: number) {
    const c = this.c, t = c.currentTime;
    // An upshift: the revs fall and the sound cuts for a beat.
    if (gear > this.lastGear && this.lastRpm > 6500) {
      this.out.gain.cancelScheduledValues(t);
      this.out.gain.setValueAtTime(0.35, t);
      this.out.gain.setTargetAtTime(0.9, t + 0.06, 0.05);
    }
    // Lifting off at high revs: crackles for a moment.
    if (this.lastThrottle > 0.6 && throttle < 0.2 && rpm > 4500) this.crackleUntil = t + 0.9;
    if (t < this.crackleUntil && Math.random() < 0.35) this.pop(0.25 + Math.random() * 0.4);
    this.lastGear = gear; this.lastThrottle = throttle; this.lastRpm = rpm;

    const f = (rpm / 60) * 5;
    const k = 0.035;
    this.fire.frequency.setTargetAtTime(f, t, k);
    this.sub.frequency.setTargetAtTime(f / 2, t, k);
    this.harm.frequency.setTargetAtTime(f * 2.01, t, k);
    this.body.frequency.setTargetAtTime(700 + throttle * 3800 + rpm * 0.35, t, 0.05);
    this.howl.frequency.setTargetAtTime(f * 2, t, k);
    this.howlGain.gain.setTargetAtTime(0.08 + throttle * 0.35 * Math.min(1, rpm / 6000), t, 0.06);
    this.roarFilter.frequency.setTargetAtTime(180 + rpm * 0.12, t, 0.05);
    this.roar.gain.setTargetAtTime(0.05 + throttle * 0.28, t, 0.08);
    this.squeal.gain.setTargetAtTime(drift > 0.45 ? (drift - 0.45) * 0.5 : 0, t, 0.08);
  }

  /** One exhaust pop. */
  pop(size = 0.5) {
    const c = this.c, t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.buf;
    const bp = c.createBiquadFilter(); bp.type = "lowpass"; bp.frequency.value = 900 + Math.random() * 1500;
    const g = c.createGain(); g.gain.setValueAtTime(size, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07 + Math.random() * 0.05);
    src.connect(bp).connect(g).connect(this.out);
    src.start(t, Math.random()); src.stop(t + 0.15);
  }

  /** Hitting the wall. */
  thud() {
    const c = this.c, t = c.currentTime;
    const o = c.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.25);
    const g = c.createGain(); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(this.out); o.start(t); o.stop(t + 0.32);
  }

  stop() {
    const t = this.c.currentTime;
    this.out.gain.setTargetAtTime(0, t, 0.15);
    this.squeal.gain.setTargetAtTime(0, t, 0.05);
    setTimeout(() => {
      for (const n of [this.fire, this.sub, this.harm, this.noise, this.squealSrc]) { try { n.stop(); } catch { /* stopped */ } }
    }, 600);
  }
}

/** Another car: a lighter V10, louder the closer it is. */
export class RemoteEngine {
  private c: AudioContext; private osc: OscillatorNode; private osc2: OscillatorNode; private lp: BiquadFilterNode; private g: GainNode;
  constructor() {
    const a = raceAudio()!;
    this.c = a.ctx;
    const c = this.c;
    this.osc = c.createOscillator(); this.osc.type = "sawtooth";
    this.osc2 = c.createOscillator(); this.osc2.type = "square";
    const g2 = c.createGain(); g2.gain.value = 0.4;
    this.lp = c.createBiquadFilter(); this.lp.type = "lowpass"; this.lp.Q.value = 1.5;
    this.g = c.createGain(); this.g.gain.value = 0;
    const sh = distortion(c, 8);
    this.osc.connect(sh); this.osc2.connect(g2).connect(sh);
    sh.connect(this.lp).connect(this.g).connect(a.master);
    this.osc.start(); this.osc2.start();
  }
  /** Revs and how far away (metres). */
  update(rpm: number, distance: number) {
    const t = this.c.currentTime, f = (rpm / 60) * 5;
    this.osc.frequency.setTargetAtTime(f, t, 0.05);
    this.osc2.frequency.setTargetAtTime(f / 2, t, 0.05);
    this.lp.frequency.setTargetAtTime(500 + rpm * 0.35, t, 0.05);
    const near = Math.max(0, 1 - distance / 220);
    this.g.gain.setTargetAtTime(near * near * 0.22, t, 0.1);
  }
  stop() {
    this.g.gain.setTargetAtTime(0, this.c.currentTime, 0.1);
    setTimeout(() => { try { this.osc.stop(); this.osc2.stop(); } catch { /* stopped */ } }, 400);
  }
}
