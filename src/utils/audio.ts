// Web Audio API Synthesizer for VR Color Circle
// Generates ambient background music and sound effects dynamically in real-time.

class ChromaAudio {
  private ctx: AudioContext | null = null;
  private bgmNodes: { oscillators: OscillatorNode[]; gain: GainNode } | null = null;
  private enabled: boolean = true;
  private isBgmPlaying: boolean = false;

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

  // Start background ambient music (drone synth)
  public startBGM() {
    try {
      this.init();
      if (!this.ctx || !this.enabled || this.isBgmPlaying) return;
      this.resumeCtx();

      const now = this.ctx.currentTime;
      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.04, now + 2.0); // Fade in over 2s

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const osc3 = this.ctx.createOscillator();

      // Minor triad / ambient chord (C3, G3, C4)
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(130.81, now); // C3

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(196.00, now); // G3

      osc3.type = "triangle";
      osc3.frequency.setValueAtTime(261.63, now); // C4

      // Modulate frequencies slightly for a chorus/richer effect
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.2, now); // 0.2 Hz LFO
      lfoGain.gain.setValueAtTime(0.5, now);

      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfoGain.connect(osc3.frequency);

      // Filter to cut off highs
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(350, now);

      osc1.connect(filter);
      osc2.connect(filter);
      osc3.connect(filter);

      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      lfo.start();
      osc1.start();
      osc2.start();
      osc3.start();

      this.bgmNodes = {
        oscillators: [osc1, osc2, osc3, lfo],
        gain: gainNode,
      };
      this.isBgmPlaying = true;
    } catch (e) {
      console.warn("Audio startBGM error:", e);
    }
  }

  // Stop background music
  public stopBGM() {
    try {
      if (!this.ctx || !this.bgmNodes) return;
      const now = this.ctx.currentTime;

      try {
        this.bgmNodes.gain.gain.setValueAtTime(this.bgmNodes.gain.gain.value, now);
        this.bgmNodes.gain.gain.linearRampToValueAtTime(0, now + 1.0); // Fade out

        const oscs = this.bgmNodes.oscillators;
        setTimeout(() => {
          oscs.forEach((osc) => {
            try {
              osc.stop();
            } catch (e) {}
          });
        }, 1000);
      } catch (e) {}

      this.bgmNodes = null;
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
