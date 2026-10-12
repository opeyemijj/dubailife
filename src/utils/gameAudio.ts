// Ambient Dubai Game Sound Engine using Web Audio API
// Generates a lush, relaxing desert city ambient soundtrack with zero external asset dependencies

class GameAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private timerId: any = null;
  private padGain: GainNode | null = null;
  private activeNodes: (AudioNode | { stop?: () => void })[] = [];

  private chords = [
    [185.0, 233.08, 277.18, 369.99], // F# major 7 (warm sunset)
    [220.0, 277.18, 329.63, 440.0],  // A major 9
    [164.81, 207.65, 246.94, 329.63], // E major 7
    [196.0, 246.94, 293.66, 392.0]   // G major 7
  ];
  private chordIndex = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('dubai_map_muted');
      this.isMuted = savedMute === 'true';
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.22, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.initCtx();

    if (!this.ctx || !this.masterGain) return;

    // Start ambient synth chords
    this.playNextChord();
    this.timerId = setInterval(() => {
      if (this.isPlaying && this.ctx && this.ctx.state === 'running') {
        this.playNextChord();
      }
    }, 4500);

    // Setup user interaction listener to resume if audio was blocked by browser policy
    const resumeOnInteraction = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      window.removeEventListener('pointerdown', resumeOnInteraction);
      window.removeEventListener('keydown', resumeOnInteraction);
    };
    window.addEventListener('pointerdown', resumeOnInteraction, { once: true });
    window.addEventListener('keydown', resumeOnInteraction, { once: true });
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    if (this.padGain && this.ctx) {
      try {
        this.padGain.gain.setValueAtTime(this.padGain.gain.value, this.ctx.currentTime);
        this.padGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);
      } catch (e) {}
    }

    setTimeout(() => {
      if (!this.isPlaying && this.ctx) {
        try {
          this.ctx.close();
        } catch (e) {}
        this.ctx = null;
        this.masterGain = null;
        this.padGain = null;
      }
    }, 900);
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('dubai_map_muted', String(muted));
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.22, this.ctx.currentTime + 0.3);
    }
  }

  public toggleMute(): boolean {
    const next = !this.isMuted;
    this.setMuted(next);
    if (!next && this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return next;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  private playNextChord() {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;

    const chord = this.chords[this.chordIndex % this.chords.length];
    this.chordIndex++;

    const now = this.ctx.currentTime;
    const duration = 5.2;

    // Filtered pad gain with slow attack & decay for a dreamy floating ambiance
    const chordGain = this.ctx.createGain();
    chordGain.gain.setValueAtTime(0.001, now);
    chordGain.gain.linearRampToValueAtTime(0.08, now + 1.8);
    chordGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    chordGain.connect(this.masterGain);

    // Warm lowpass filter to mimic warm desert evening air
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(750, now);
    filter.frequency.linearRampToValueAtTime(1100, now + 2.5);
    filter.frequency.linearRampToValueAtTime(650, now + duration);
    filter.connect(chordGain);

    // 4 Sine/Triangle oscillators creating a rich lush harmonic bed
    chord.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      // Slight detune for analog warmth
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime((idx - 1.5) * 4, now);
      osc.connect(filter);
      osc.start(now);
      osc.stop(now + duration + 0.2);
    });

    // Occasional gentle sparkle chime
    if (Math.random() > 0.4) {
      this.playSparkleChime(now + 1.2 + Math.random() * 1.5, chord[Math.floor(Math.random() * chord.length)] * 2);
    }
  }

  private playSparkleChime(time: number, freq: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.035, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.6);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 1.7);
  }

  // Interactive UI sound effects
  public playClickSound() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {}
  }

  public playCoinSound() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(987.77, now); // B5
      osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6
      osc2.frequency.setValueAtTime(1318.51, now + 0.08);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now + 0.08);
      osc1.stop(now + 0.36);
      osc2.stop(now + 0.36);
    } catch (e) {}
  }
}

export const gameAudio = new GameAudioEngine();
