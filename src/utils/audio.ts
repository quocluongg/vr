// Web Audio API Synthesizer for VR Color Circle
// Generates ambient background music and sound effects dynamically in real-time.

class ChromaAudio {
  private ctx: AudioContext | null = null;
  private bgmNodes: { oscillators: OscillatorNode[]; gain: GainNode } | null = null;
  private enabled: boolean = true;
  private isBgmPlaying: boolean = false;
  private bgmInterval: any = null;
  private bgmStep: number = 0;

  private init() {
    try {
      if (this.ctx) return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    } catch (e) {
      console.warn("Failed to initialize AudioContext:", e);
    }
  }

  public setEnabled(val: boolean) {
    try {
      this.enabled = val;
      if (!val) {
        this.stopBGM();
      } else {
        this.startBGM();
      }
    } catch (e) {
      console.warn("Failed to set audio enabled:", e);
    }
  }

  // Play a short click sound
  public playClick() {
    try {
      this.init();
      if (!this.ctx || !this.enabled) return;
      this.resumeCtx();

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch (e) {
      console.warn("Audio playClick error:", e);
    }
  }

  // Play grab sound (short rising sweep)
  public playGrab() {
    try {
      this.init();
      if (!this.ctx || !this.enabled) return;
      this.resumeCtx();

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch (e) {
      console.warn("Audio playGrab error:", e);
    }
  }

  // Play snap sound (pleasant harmonic chord chime)
  public playSnap() {
    try {
      this.init();
      if (!this.ctx || !this.enabled) return;
      this.resumeCtx();

      const now = this.ctx.currentTime;
      const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

      frequencies.forEach((freq, i) => {
        try {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + i * 0.03);

          gain.gain.setValueAtTime(0, now + i * 0.03);
          gain.gain.linearRampToValueAtTime(0.08, now + i * 0.03 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.03 + 0.4);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now + i * 0.03);
          osc.stop(now + i * 0.03 + 0.4);
        } catch (err) {
          console.warn("Failed to play snap chord frequency:", freq, err);
        }
      });
    } catch (e) {
      console.warn("Audio playSnap error:", e);
    }
  }

  // Play fail sound (low descending buzzing slide)
  public playFail() {
    try {
      this.init();
      if (!this.ctx || !this.enabled) return;
      this.resumeCtx();

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(60, this.ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

      // Apply low pass filter to make it warmer/less harsh
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(400, this.ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {
      console.warn("Audio playFail error:", e);
    }
  }

  // Play level complete sound
  public playLevelUp() {
    try {
      this.init();
      if (!this.ctx || !this.enabled) return;
      this.resumeCtx();

      const now = this.ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4 to C6 arpeggio

      notes.forEach((freq, i) => {
        try {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + i * 0.07);

          gain.gain.setValueAtTime(0, now + i * 0.07);
          gain.gain.linearRampToValueAtTime(0.06, now + i * 0.07 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.5);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now + i * 0.07);
          osc.stop(now + i * 0.07 + 0.5);
        } catch (err) {
          console.warn("Failed to play level note:", freq, err);
        }
      });
    } catch (e) {
      console.warn("Audio playLevelUp error:", e);
    }
  }

  // Play game victory sound
  public playVictory() {
    try {
      this.init();
      if (!this.ctx || !this.enabled) return;
      this.resumeCtx();

      const now = this.ctx.currentTime;
      const notes = [
        { f: 523.25, t: 0 },    // C5
        { f: 523.25, t: 0.15 }, // C5
        { f: 523.25, t: 0.3 },  // C5
        { f: 523.25, t: 0.45 }, // C5
        { f: 659.25, t: 0.6 },  // E5
        { f: 587.33, t: 0.75 }, // D5
        { f: 659.25, t: 0.9 },  // E5
        { f: 783.99, t: 1.05 }, // G5
        { f: 1046.50, t: 1.2 }, // C6
      ];

      notes.forEach((note) => {
        try {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(note.f, now + note.t);

          gain.gain.setValueAtTime(0, now + note.t);
          gain.gain.linearRampToValueAtTime(0.08, now + note.t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + 0.3);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now + note.t);
          osc.stop(now + note.t + 0.3);
        } catch (err) {
          console.warn("Failed to play victory note:", note.f, err);
        }
      });
    } catch (e) {
      console.warn("Audio playVictory error:", e);
    }
  }

    // Helper to play a single BGM note with pluck/bubble style release
  private playBgmNote(freq: number, isBass: boolean = false) {
    try {
      if (!this.ctx || !this.enabled) return;
      this.resumeCtx();

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (isBass) {
        // Soft bass note
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.55);
      } else {
        // Cute high bubble synth pluck
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        // Simple low-pass filter to make it sound cute and warm
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1200, now);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (e) {
      console.warn("BGM Note error:", e);
    }
  }

  // Start background ambient music (cheerful 8-bit pentatonic arpeggio & bass loop)
  public startBGM() {
    try {
      this.init();
      if (!this.ctx || !this.enabled || this.isBgmPlaying) return;
      this.resumeCtx();

      this.isBgmPlaying = true;
      this.bgmStep = 0;

      // Cheerful major pentatonic melody
      const MELODY = [
        329.63, 392.00, 523.25, 392.00, // E4, G4, C5, G4
        349.23, 440.00, 523.25, 440.00, // F4, A4, C5, A4
        392.00, 493.88, 587.33, 493.88, // G4, B4, D5, B4
        523.25, 659.25, 523.25, 392.00, // C5, E5, C5, G4
      ];

      // Bass notes (I - IV - V - I chord progression)
      const BASS = [
        130.81, // C3
        174.61, // F3
        196.00, // G3
        130.81, // C3
      ];

      const stepDuration = 0.28; // 280ms per step (approx 107 BPM)

      const playNextStep = () => {
        if (!this.isBgmPlaying || !this.ctx) return;

        const melodyNote = MELODY[this.bgmStep % MELODY.length];
        this.playBgmNote(melodyNote, false);

        if (this.bgmStep % 4 === 0) {
          const bassIndex = Math.floor((this.bgmStep % MELODY.length) / 4);
          const bassNote = BASS[bassIndex % BASS.length];
          this.playBgmNote(bassNote, true);
        }

        this.bgmStep++;
      };

      // Play step 0 immediately
      playNextStep();

      // Schedule the interval
      this.bgmInterval = setInterval(playNextStep, stepDuration * 1000);
    } catch (e) {
      console.warn("Audio startBGM error:", e);
    }
  }

  // Stop background music
  public stopBGM() {
    try {
      if (this.bgmInterval) {
        clearInterval(this.bgmInterval);
        this.bgmInterval = null;
      }
      this.isBgmPlaying = false;
    } catch (e) {
      console.warn("Audio stopBGM error:", e);
    }
  }

  // Resume context if suspended (browser security policy)
  private resumeCtx() {
    try {
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    } catch (e) {
      console.warn("Failed to resume AudioContext:", e);
    }
  }
}

export const audio = new ChromaAudio();
