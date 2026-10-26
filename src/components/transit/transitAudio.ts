// Sound for metro and taxi journeys, made in the browser: door chimes, the Nol gate and Salik beeps, the
// train's rumble and the taxi's engine (Web Audio), and the station announcements (speech synthesis, in
// English and Arabic). A licensed recording at public/audio/metro/<station>-<next|this>.mp3 plays instead of
// the synthesised voice when it exists.

let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setTransitMuted(m: boolean) {
  muted = m;
  if (m) stopSpeech();
  loops.forEach((l) => l.gain.gain.setTargetAtTime(m ? 0 : l.level, ac()?.currentTime ?? 0, 0.1));
}
export const isTransitMuted = () => muted;

/** One soft bell tone (a sine with a quick attack and a long ring). */
function bell(freq: number, at: number, dur = 1.1, level = 0.18) {
  const a = ac();
  if (!a || muted) return;
  const o = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain();
  o.type = "sine"; o.frequency.value = freq;
  o2.type = "sine"; o2.frequency.value = freq * 2.01;
  const g2 = a.createGain(); g2.gain.value = 0.25;
  o2.connect(g2).connect(g);
  o.connect(g).connect(a.destination);
  const t = a.currentTime + at;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); o2.start(t); o.stop(t + dur); o2.stop(t + dur);
}

/** A short electronic beep. */
function beep(freq: number, at: number, dur = 0.12, level = 0.12, type: OscillatorType = "square") {
  const a = ac();
  if (!a || muted) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq;
  o.connect(g).connect(a.destination);
  const t = a.currentTime + at;
  g.gain.setValueAtTime(level, t);
  g.gain.setValueAtTime(0, t + dur);
  o.start(t); o.stop(t + dur + 0.02);
}

/** Doors opening: a rising three-note chime. */
export const doorsOpening = () => { bell(659, 0); bell(784, 0.32); bell(988, 0.64, 1.4); };
/** Doors closing: a falling chime, then quick warning beeps while they shut. */
export function doorsClosing() {
  bell(988, 0); bell(784, 0.3); bell(659, 0.6, 1.2);
  for (let i = 0; i < 6; i++) beep(1250, 1.4 + i * 0.22, 0.11, 0.07);
}
/** The Nol card tapped on the gate reader. */
export const nolTap = () => { beep(1700, 0, 0.09, 0.09, "sine"); beep(2200, 0.1, 0.12, 0.09, "sine"); };
/** Passing under a Salik toll gate. */
export const salikBeep = () => { beep(1450, 0, 0.18, 0.08, "sine"); };
/** The taxi meter ticking over, and the indicator. */
export const meterTick = () => beep(2600, 0, 0.02, 0.03, "square");
export const indicatorTick = () => beep(900, 0, 0.03, 0.035, "triangle");
/** A car door shutting. */
export function doorThud() {
  const a = ac();
  if (!a || muted) return;
  const buf = a.createBuffer(1, a.sampleRate * 0.25, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (a.sampleRate * 0.035));
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  f.type = "lowpass"; f.frequency.value = 380; g.gain.value = 0.9;
  src.buffer = buf; src.connect(f).connect(g).connect(a.destination); src.start();
}

// ---------------------------------------------------------------- continuous sounds

interface Loop { src: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode; osc?: OscillatorNode; level: number }
const loops = new Map<string, Loop>();

/** A looping noise bed (train rumble, road noise) with an optional engine tone; `setLoopSpeed` drives it. */
export function startLoop(id: "train" | "road", level = 0.12) {
  const a = ac();
  if (!a || loops.has(id)) return;
  const buf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
  const src = a.createBufferSource(), filter = a.createBiquadFilter(), gain = a.createGain();
  src.buffer = buf; src.loop = true;
  filter.type = "lowpass"; filter.frequency.value = 300;
  gain.gain.value = 0;
  src.connect(filter).connect(gain).connect(a.destination);
  let osc: OscillatorNode | undefined;
  if (id === "train") {
    // The motors' whine.
    osc = a.createOscillator(); osc.type = "sawtooth"; osc.frequency.value = 80;
    const og = a.createGain(); og.gain.value = 0.012;
    osc.connect(og).connect(gain);
    osc.start();
  }
  src.start();
  loops.set(id, { src, gain, filter, osc, level });
}

/** 0 (stopped) .. 1 (full speed): louder, brighter and higher as the vehicle speeds up. */
export function setLoopSpeed(id: "train" | "road", k: number) {
  const a = ac(), l = loops.get(id);
  if (!a || !l) return;
  const t = a.currentTime;
  l.gain.gain.setTargetAtTime(muted ? 0 : l.level * (0.25 + k * 0.75), t, 0.2);
  l.filter.frequency.setTargetAtTime(200 + k * 900, t, 0.2);
  l.osc?.frequency.setTargetAtTime(60 + k * 420, t, 0.3);
}

export function stopLoops() {
  loops.forEach((l) => { try { l.src.stop(); l.osc?.stop(); } catch {} });
  loops.clear();
}

// ---------------------------------------------------------------- announcements

let queue: Promise<void> = Promise.resolve();
/** Bumped by stopSpeech, so announcements queued before it are dropped. */
let generation = 0;

type VoiceStyle = "announcer" | "driver";

function voiceFor(lang: "en" | "ar", style: VoiceStyle = "announcer"): SpeechSynthesisVoice | undefined {
  const voices = typeof speechSynthesis === "undefined" ? [] : speechSynthesis.getVoices();
  if (lang === "ar") return voices.find((v) => v.lang.startsWith("ar"));
  if (style === "driver") {
    // A man's voice for the taxi driver, where the browser has one.
    const men = ["Google UK English Male", "Daniel", "Rishi", "Alex", "Fred", "Aaron", "Arthur"];
    const v = men.map((n) => voices.find((x) => x.name.includes(n))).find(Boolean);
    if (v) return v;
  }
  // A clear British female voice where there is one, like the metro's.
  const prefer = ["Google UK English Female", "Serena", "Kate", "Martha", "Stephanie", "Samantha", "Karen"];
  return prefer.map((n) => voices.find((v) => v.name.includes(n))).find(Boolean)
    ?? voices.find((v) => v.lang === "en-GB") ?? voices.find((v) => v.lang.startsWith("en"));
}

function speakNow(text: string, lang: "en" | "ar", style: VoiceStyle = "announcer"): Promise<void> {
  return new Promise((resolve) => {
    if (muted || typeof speechSynthesis === "undefined") return resolve();
    const u = new SpeechSynthesisUtterance(text);
    const v = voiceFor(lang, style);
    if (v) u.voice = v;
    u.lang = lang === "ar" ? "ar-AE" : style === "driver" ? "en-IN" : "en-GB";
    u.rate = lang === "ar" ? 0.92 : style === "driver" ? 1.0 : 0.95;
    u.pitch = style === "driver" ? 0.85 : 1.05;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.speak(u);
    // Some browsers never fire onend: don't hold the queue forever.
    setTimeout(resolve, 2500 + text.length * 90);
  });
}

/** Recordings already found missing, so each station isn't requested (and 404s) on every announcement. */
const missing = new Set<string>();
let current: HTMLAudioElement | null = null;

/** A recording, if one has been added for this announcement; resolves false when there isn't one. */
function playRecording(path: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (muted) return resolve(true);
    if (missing.has(path)) return resolve(false);
    const audio = new Audio(path);
    current = audio;
    audio.onended = () => { current = null; resolve(true); };
    audio.onerror = () => { current = null; missing.add(path); resolve(false); };
    audio.play().catch(() => { current = null; resolve(false); });
  });
}

/** Queues an announcement: a recording if there is one, otherwise the lines spoken in order. */
export function announce(lines: Array<{ text: string; lang: "en" | "ar" }>, recording?: string, style: VoiceStyle = "announcer"): Promise<void> {
  const gen = generation;
  queue = queue.then(async () => {
    // Dropped if the journey was left (or sound stopped) while it was waiting its turn.
    if (gen !== generation) return;
    if (recording && await playRecording(recording)) return;
    for (const l of lines) { if (gen !== generation) return; await speakNow(l.text, l.lang, style); }
  });
  return queue;
}

export function stopSpeech() {
  generation++;
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  // A recorded announcement still playing stops too (leaving the journey, or muting).
  if (current) { current.pause(); current = null; }
  queue = Promise.resolve();
}

/** Voices load asynchronously in some browsers: ask early so the first announcement has them. */
export function warmUpVoices() {
  if (typeof speechSynthesis !== "undefined") speechSynthesis.getVoices();
  ac();
}
