// Game sound: background music on the city map and sound effects for taps and money.
// Music is a playlist of public-domain (CC0) lo-fi loops played through an <audio> element, so it
// streams instead of being decoded into memory; effects are short recorded clips played through Web
// Audio for instant response. Credits: public/audio/CREDITS.md.

const MUSIC = ["/audio/music/lofi-hip-hop-loop.m4a", "/audio/music/chill-loopable.m4a"];
const SFX = { click: "/audio/sfx/click.m4a", coin: "/audio/sfx/coin.m4a", confirm: "/audio/sfx/confirm.m4a" } as const;
type Sfx = keyof typeof SFX;

const MUSIC_VOLUME = 0.32;
const SFX_VOLUME = 0.7;
const MUTE_KEY = "dubai_map_muted";

class GameAudioEngine {
  private music: HTMLAudioElement | null = null;
  private track = 0;
  private wanted = false;
  private isMuted = false;
  private fade: ReturnType<typeof setInterval> | null = null;
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private buffers = new Map<Sfx, AudioBuffer>();
  private loading: Promise<void> | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      try { this.isMuted = localStorage.getItem(MUTE_KEY) === "true"; } catch { /* storage off */ }
    }
  }

  // ---------------------------------------------------------------- music

  private ensureMusic() {
    if (this.music || typeof window === "undefined") return this.music;
    const el = new Audio();
    el.preload = "auto";
    el.volume = 0;
    el.src = MUSIC[this.track];
    // One track after another, round and round.
    el.addEventListener("ended", () => {
      this.track = (this.track + 1) % MUSIC.length;
      el.src = MUSIC[this.track];
      if (this.wanted && !this.isMuted) el.play().catch(() => {});
    });
    this.music = el;
    return el;
  }

  /** Fades the music to a volume, then pauses it if that's silence. */
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

  /** Starts (or resumes) the background music. Browsers only allow it after a tap. */
  public start() {
    this.wanted = true;
    if (this.isMuted) return;
    const el = this.ensureMusic();
    if (!el) return;
    // Get the effects ready too (this runs after a tap, when browsers allow audio).
    el.play().then(() => { this.fadeTo(MUSIC_VOLUME, 1200); this.initCtx(); }).catch(() => {
      // Blocked until the user interacts: try again on the next tap.
      const retry = () => { if (this.wanted && !this.isMuted) this.start(); };
      window.addEventListener("pointerdown", retry, { once: true });
    });
  }

  public stop() {
    this.wanted = false;
    this.fadeTo(0, 600);
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try { localStorage.setItem(MUTE_KEY, String(muted)); } catch { /* storage off */ }
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

  // ---------------------------------------------------------------- effects

  private initCtx() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = SFX_VOLUME;
      this.gain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    // Fetch and decode the clips once (they're a few KB each).
    if (!this.loading) {
      const ctx = this.ctx;
      this.loading = Promise.all((Object.keys(SFX) as Sfx[]).map(async (name) => {
        try {
          const res = await fetch(SFX[name]);
          this.buffers.set(name, await ctx.decodeAudioData(await res.arrayBuffer()));
        } catch { /* falls back to a synthesised blip */ }
      })).then(() => {});
    }
  }

  private play(name: Sfx, fallback: () => void) {
    if (this.isMuted) return;
    this.initCtx();
    const buffer = this.buffers.get(name);
    if (!this.ctx || !this.gain) return;
    if (!buffer) { fallback(); return; }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.gain);
    src.start();
  }

  /** A short tone, used only until the recorded clips have loaded. */
  private blip(freq: number, to: number, ms: number) {
    if (!this.ctx || !this.gain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(to, now + ms / 1000);
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + ms / 1000);
    osc.connect(g);
    g.connect(this.gain);
    osc.start(now);
    osc.stop(now + ms / 1000 + 0.02);
  }

  /** Taps on buttons and places. */
  public playClickSound() {
    this.play("click", () => this.blip(880, 1760, 90));
  }

  /** Money: buying, earning, gifts and transfers. */
  public playCoinSound() {
    this.play("coin", () => this.blip(988, 1319, 300));
  }

  /** Something done: a booking, a purchase confirmed. */
  public playConfirmSound() {
    this.play("confirm", () => this.blip(660, 990, 200));
  }
}

export const gameAudio = new GameAudioEngine();
