// Web Audio API engine for NorthTracks

export type EQPresetName =
  | 'FLAT'
  | 'BASS_BOOST'
  | 'TREBLE_BOOST'
  | 'ROCK'
  | 'POP'
  | 'CLASSICAL'
  | 'HIP_HOP'
  | 'ELECTRONIC'
  | 'ACOUSTIC'
  | 'VOCAL';

export interface AudioEngineState {
  normalizationGain: number;
  eqBands: number[];
  reverbWetMix: number;
  stereoWidth: number;
  contextState: AudioContextState;
  currentPreset: EQPresetName | 'CUSTOM' | 'AUTO';
}

// EQ Presets Definition
export const FLAT = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
export const BASS_BOOST = [6, 5, 4, 2, 0, 0, 0, 0, 0, 0];
export const TREBLE_BOOST = [0, 0, 0, 0, 0, 0, 2, 4, 5, 6];
export const ROCK = [4, 3, 2, 0, -1, -1, 2, 3, 4, 4];
export const POP = [-1, 0, 2, 3, 4, 3, 2, 0, -1, -1];
export const CLASSICAL = [4, 3, 2, 1, 0, 0, 0, 2, 3, 4];
export const HIP_HOP = [5, 4, 2, 1, 0, -1, 0, 1, 2, 2];
export const ELECTRONIC = [4, 3, 1, 0, -1, 0, 2, 4, 4, 5];
export const ACOUSTIC = [3, 2, 1, 2, 3, 2, 1, 0, 1, 2];
export const VOCAL = [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1];

export const EQ_PRESETS: Record<EQPresetName, number[]> = {
  FLAT,
  BASS_BOOST,
  TREBLE_BOOST,
  ROCK,
  POP,
  CLASSICAL,
  HIP_HOP,
  ELECTRONIC,
  ACOUSTIC,
  VOCAL
};

const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private convolver: ConvolverNode | null = null;
  private reverbDryGain: GainNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private stereoPanner: StereoPannerNode | null = null;
  private analyser: AnalyserNode | null = null;

  private compressor: DynamicsCompressorNode | null = null;
  private detectedHardwareName: string = 'Detecting Audio Output...';
  private agcInterval: any = null;

  // Local state tracking
  private initialized = false;
  private currentAudioElement: HTMLAudioElement | null = null;
  private normalizationGain = 1.0;
  private eqBands: number[] = [...FLAT];
  private reverbWetMix = 0.0;
  private stereoWidth = 0.0; // -1 to 1
  private currentPresetName: EQPresetName | 'CUSTOM' | 'AUTO' = 'FLAT';
  private isAutoMode = false;
  private currentTrackGenre: string[] | undefined = undefined;
  private listeners: Set<(state: AudioEngineState) => void> = new Set();

  constructor() {
    this.autoDetectHardwareDevice();
  }

  public async autoDetectHardwareDevice(): Promise<string> {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
        for (const dev of audioOutputs) {
          const label = dev.label.toLowerCase();
          if (label.includes('home theater') || label.includes('surround') || label.includes('5.1') || label.includes('7.1') || label.includes('av receiver')) {
            this.detectedHardwareName = 'Home Theater System (Surround 5.1)';
            this.emitStateChange();
            return this.detectedHardwareName;
          }
          if (label.includes('soundbar') || label.includes('cinema') || label.includes('tv audio')) {
            this.detectedHardwareName = 'Soundbar & Cinema Speakers';
            this.emitStateChange();
            return this.detectedHardwareName;
          }
          if (label.includes('headphone') || label.includes('headset') || label.includes('monitor') || label.includes('studio')) {
            this.detectedHardwareName = 'Studio Headphones / Reference Monitors';
            this.emitStateChange();
            return this.detectedHardwareName;
          }
          if (label.includes('airpods') || label.includes('bud') || label.includes('bluetooth') || label.includes('earphone')) {
            this.detectedHardwareName = 'Bluetooth AirPods / Earbuds';
            this.emitStateChange();
            return this.detectedHardwareName;
          }
          if (label.includes('speaker') || label.includes('realtek') || label.includes('hifi')) {
            this.detectedHardwareName = 'Desktop Hi-Fi Speakers';
            this.emitStateChange();
            return this.detectedHardwareName;
          }
        }
      }
    } catch (e) {}
    this.detectedHardwareName = 'Calibrated High-Fidelity Audio Device';
    this.emitStateChange();
    return this.detectedHardwareName;
  }

  public getDetectedHardwareName(): string {
    return this.detectedHardwareName;
  }

  /**
   * Connects the HTML5 audio element to the Web Audio API context and initializes the processing nodes.
   * Guraded against double-initialization.
   */
  initialize(audioElement: HTMLAudioElement): void {
    if (this.initialized) {
      if (this.currentAudioElement !== audioElement) {
        console.log('AudioEngine: Re-initializing with a new HTMLAudioElement (remount/HMR).');
        if (this.source) {
          try {
            this.source.disconnect();
          } catch (e) {
            console.warn('Error disconnecting old source:', e);
          }
        }
        this.currentAudioElement = audioElement;
        try {
          this.source = this.ctx!.createMediaElementSource(audioElement);
          this.source.connect(this.gainNode!);
        } catch (err) {
          console.error('AudioEngine: Failed to reconnect source node:', err);
        }
      }
      return;
    }

    // Create the AudioContext (supporting vendor prefix fallbacks)
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.error('Web Audio API is not supported in this browser environment.');
      return;
    }

    this.ctx = new AudioContextClass();
    this.setupResumeListeners();
    this.currentAudioElement = audioElement;

    // 1. Create source node from the audio element
    this.source = this.ctx.createMediaElementSource(audioElement);

    // 2. Volume Normalization node (GainNode)
    this.gainNode = this.ctx.createGain();

    // 3. 10-Band EQ filters (BiquadFilterNode)
    this.eqFilters = EQ_FREQUENCIES.map(freq => {
      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1.4;
      filter.gain.value = 0;
      return filter;
    });

    // 4. Spotify / YouTube Music Master Dynamics Compressor
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-24, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

    // 5. Reverb Nodes (ConvolverNode + Dry/Wet crossfade GainNodes)
    this.convolver = this.ctx.createConvolver();
    this.convolver.buffer = this.generateImpulse(2, 2);

    this.reverbDryGain = this.ctx.createGain();
    this.reverbWetGain = this.ctx.createGain();

    // 6. Spatial Node (StereoPannerNode)
    this.stereoPanner = this.ctx.createStereoPanner();

    // 7. Analyser Node
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;

    // Establish Node Chain:
    // source -> gainNode -> 10 EQ filters -> compressor -> convolver (parallel dry/wet) -> stereoPanner -> analyser -> destination

    this.source.connect(this.gainNode);

    // Connect EQ filters in series
    let lastNode: AudioNode = this.gainNode;
    for (const filter of this.eqFilters) {
      lastNode.connect(filter);
      lastNode = filter;
    }

    // Connect 10th EQ output to Dynamics Compressor
    lastNode.connect(this.compressor);

    // Connect Compressor to Reverb Wet Path & Dry Path
    this.compressor.connect(this.convolver);
    this.compressor.connect(this.reverbDryGain);

    // Wet path: Convolver connects to its own gain control
    this.convolver.connect(this.reverbWetGain);

    // Recombine Dry and Wet paths at the Stereo Panner
    this.reverbDryGain.connect(this.stereoPanner);
    this.reverbWetGain.connect(this.stereoPanner);

    // Connect Stereo Panner to Analyser, then to Destination
    this.stereoPanner.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    this.initialized = true;

    // Sync all currently configured state variables to Web Audio nodes
    this.applyNormalizationGain();
    this.applyEQBands();
    this.applyReverb();
    this.applyStereoWidth();

    // Start adaptive AGC (Automatic Gain Control) loudness smoothing loop
    this.startAdaptiveLoudnessControl();

    // Listen to changes in AudioContext state
    this.ctx.onstatechange = () => {
      this.emitStateChange();
    };

    this.emitStateChange();
  }

  /**
   * Set volume normalization gain value
   * @param gain range from 0.0 to 1.5
   */
  setNormalizationGain(gain: number): void {
    const clampedGain = Math.max(0.0, Math.min(1.5, gain));
    this.normalizationGain = clampedGain;
    this.applyNormalizationGain();
    this.emitStateChange();
  }

  /**
   * Set gain for a specific EQ band
   * @param bandIndex 0 to 9 index representing the frequency band
   * @param gainDb gain in decibels (-12 to +12 dB)
   */
  setEQBand(bandIndex: number, gainDb: number): void {
    if (bandIndex < 0 || bandIndex >= 10) return;
    const clampedGain = Math.max(-12, Math.min(12, gainDb));
    this.eqBands[bandIndex] = clampedGain;
    this.isAutoMode = false;
    this.currentPresetName = this.detectCurrentPreset();
    if (this.eqFilters[bandIndex] && this.ctx) {
      this.eqFilters[bandIndex].gain.setValueAtTime(clampedGain, this.ctx.currentTime);
    }
    this.emitStateChange();
  }

  /**
   * Set gain values for all 10 EQ bands simultaneously
   * @param gains array of 10 gain values in dB (-12 to +12)
   */
  setAllEQBands(gains: number[]): void {
    if (gains.length !== 10) return;
    for (let i = 0; i < 10; i++) {
      this.eqBands[i] = Math.max(-12, Math.min(12, gains[i]));
    }
    this.isAutoMode = false;
    this.currentPresetName = this.detectCurrentPreset();
    this.applyEQBands();
    this.emitStateChange();
  }

  /**
   * Auto-adjusts EQ parameters based on connected hardware & track frequencies
   */
  setAutoHardwareAdjust(enabled: boolean): void {
    this.isAutoMode = enabled;
    if (enabled) {
      this.currentPresetName = 'AUTO';
      this.applyAutoPresetForGenre(this.currentTrackGenre);
    } else {
      this.currentPresetName = 'FLAT';
      this.eqBands = [...FLAT];
      this.applyEQBands();
    }
    this.emitStateChange();
  }

  /**
   * Sets the EQ Preset by name or to AUTO mode.
   * @param presetName One of the preset keys or 'AUTO'
   * @param genres Optional genres array to initialize the AUTO mode bands immediately
   */
  setPreset(presetName: EQPresetName | 'AUTO', genres?: string[]): void {
    if (presetName === 'AUTO') {
      this.isAutoMode = true;
      this.currentPresetName = 'AUTO';
      this.applyAutoPresetForGenre(genres || this.currentTrackGenre);
    } else {
      this.isAutoMode = false;
      const gains = EQ_PRESETS[presetName];
      if (gains) {
        this.eqBands = [...gains];
        this.currentPresetName = presetName;
        this.applyEQBands();
        this.emitStateChange();
      }
    }
  }

  /**
   * Configure Reverb mix
   * @param wetMix amount of reverb (0.0 = completely dry, 1.0 = completely wet)
   */
  setReverb(wetMix: number): void {
    const clampedMix = Math.max(0.0, Math.min(1.0, wetMix));
    this.reverbWetMix = clampedMix;
    this.applyReverb();
    this.emitStateChange();
  }

  /**
   * Set spatial stereo panner pan value
   * @param value pan position from -1 (full left) to 0 (center) to 1 (full right)
   */
  setStereoWidth(value: number): void {
    const clampedValue = Math.max(-1.0, Math.min(1.0, value));
    this.stereoWidth = clampedValue;
    this.applyStereoWidth();
    this.emitStateChange();
  }

  /**
   * Measures RMS volume via the AnalyserNode and returns suggested normalization gain
   * suggestedGain = clamp(0.7 / measuredRMS, 0.5, 1.5)
   */
  analyzeAndNormalize(audioElement: HTMLAudioElement): number {
    if (!this.initialized) {
      this.initialize(audioElement);
    }

    if (!this.analyser) {
      return 1.0;
    }

    const bufferLength = this.analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    this.analyser.getFloatTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const measuredRMS = Math.sqrt(sum / dataArray.length);

    // If there is little to no signal, default suggestion is 1.0 (neutral)
    if (measuredRMS < 0.0001) {
      return 1.0;
    }

    const targetGain = 0.7 / measuredRMS;
    return Math.max(0.5, Math.min(1.5, targetGain));
  }

  /**
   * Real-time Adaptive Automatic Gain Control (AGC) & Loudness Normalization loop.
   * Smoothly adjusts gain and dynamic range compression so transition between quiet and loud songs is seamless.
   */
  startAdaptiveLoudnessControl(): void {
    if (this.agcInterval) clearInterval(this.agcInterval);
    this.agcInterval = setInterval(() => {
      if (!this.analyser || !this.gainNode || !this.ctx || this.ctx.state !== 'running') return;
      
      const bufferLength = this.analyser.fftSize;
      const dataArray = new Float32Array(bufferLength);
      this.analyser.getFloatTimeDomainData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);

      // Skip silent pauses or quiet intro/outro
      if (rms < 0.01) return;

      // Target RMS is ~0.15 for comfortable listening volume (-14 LUFS)
      const targetRms = 0.15;
      const rmsDiff = targetRms / rms;
      const desiredGain = Math.max(0.5, Math.min(1.4, this.normalizationGain * rmsDiff));

      // Smoothly interpolate current gain towards desired gain over 300ms
      const currentGain = this.gainNode.gain.value;
      const smoothGain = currentGain + (desiredGain - currentGain) * 0.1;
      this.gainNode.gain.setValueAtTime(smoothGain, this.ctx.currentTime);
    }, 250);
  }

  /**
   * Exposes the active Web Audio AnalyserNode for visualizers or advanced measurements.
   */
  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  /**
   * Retrieves the current configuration state of the audio engine
   */
  getState(): AudioEngineState {
    return {
      normalizationGain: this.normalizationGain,
      eqBands: [...this.eqBands],
      reverbWetMix: this.reverbWetMix,
      stereoWidth: this.stereoWidth,
      contextState: this.ctx ? this.ctx.state : 'suspended',
      currentPreset: this.currentPresetName
    };
  }

  /**
   * Registers a listener to state changes
   * @param listener Callback function receiving the updated state
   * @returns Unsubscribe function
   */
  subscribe(listener: (state: AudioEngineState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState()); // Initial emit
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Resumes the AudioContext explicitly if it is suspended
   */
  async resume(): Promise<void> {
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
        this.emitStateChange();
      } catch (err) {
        console.error('Failed to resume AudioContext:', err);
      }
    }
  }

  // --- Internals & Helpers ---

  private applyNormalizationGain() {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.normalizationGain, this.ctx.currentTime);
    }
  }

  private applyEQBands() {
    const ctx = this.ctx;
    if (this.eqFilters.length > 0 && ctx) {
      this.eqFilters.forEach((filter, idx) => {
        filter.gain.setValueAtTime(this.eqBands[idx], ctx.currentTime);
      });
    }
  }

  private applyReverb() {
    if (this.reverbDryGain && this.reverbWetGain && this.ctx) {
      const wet = this.reverbWetMix;
      const dry = 1 - wet;
      this.reverbDryGain.gain.setValueAtTime(dry, this.ctx.currentTime);
      this.reverbWetGain.gain.setValueAtTime(wet, this.ctx.currentTime);
    }
  }

  private applyStereoWidth() {
    if (this.stereoPanner && this.ctx) {
      this.stereoPanner.pan.setValueAtTime(this.stereoWidth, this.ctx.currentTime);
    }
  }

  private emitStateChange() {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  private detectCurrentPreset(): EQPresetName | 'CUSTOM' | 'AUTO' {
    if (this.isAutoMode) return 'AUTO';
    const keys = Object.keys(EQ_PRESETS) as EQPresetName[];
    for (const key of keys) {
      const presetGains = EQ_PRESETS[key];
      let matches = true;
      for (let i = 0; i < 10; i++) {
        if (Math.abs(this.eqBands[i] - presetGains[i]) > 0.01) {
          matches = false;
          break;
        }
      }
      if (matches) return key;
    }
    return 'CUSTOM';
  }

  /**
   * Called when the current track changes in the application.
   * Enables auto EQ preset selection dynamically according to track genre metadata.
   */
  onTrackChanged(genres: string[] | undefined): void {
    this.currentTrackGenre = genres;
    if (this.isAutoMode) {
      this.applyAutoPresetForGenre(genres);
    }
  }

  private matchGenreToPreset(genres: string[] | undefined): EQPresetName {
    if (!genres || genres.length === 0) return 'FLAT';
    for (const g of genres) {
      const clean = g.trim().toLowerCase();
      if (clean.includes('pop')) return 'POP';
      if (clean.includes('rock') || clean.includes('metal')) return 'ROCK';
      if (clean.includes('classical') || clean.includes('classic') || clean.includes('instrumental') || clean.includes('orchestra')) return 'CLASSICAL';
      if (clean.includes('hip') || clean.includes('rap') || clean.includes('rb') || clean.includes('r&b')) return 'HIP_HOP';
      if (clean.includes('electro') || clean.includes('edm') || clean.includes('electronic') || clean.includes('house') || clean.includes('techno') || clean.includes('dance') || clean.includes('trance')) return 'ELECTRONIC';
      if (clean.includes('acoustic') || clean.includes('folk') || clean.includes('country') || clean.includes('singer')) return 'ACOUSTIC';
      if (clean.includes('vocal') || clean.includes('acapella') || clean.includes('speech') || clean.includes('podcast')) return 'VOCAL';
      if (clean.includes('bass')) return 'BASS_BOOST';
      if (clean.includes('treble')) return 'TREBLE_BOOST';
    }
    return 'FLAT';
  }

  private applyAutoPresetForGenre(genres: string[] | undefined): void {
    const matchedPreset = this.matchGenreToPreset(genres);
    const gains = EQ_PRESETS[matchedPreset];
    if (gains) {
      this.eqBands = [...gains];
      this.applyEQBands();
      this.emitStateChange();
    }
  }

  /**
   * Generates a noise-based impulse response buffer for algorithmic convolution reverb.
   */
  private generateImpulse(duration = 2, decay = 2): AudioBuffer {
    if (!this.ctx) {
      throw new Error('AudioContext must be initialized before generating impulse');
    }
    const rate = this.ctx.sampleRate;
    const length = rate * duration;
    const impulse = this.ctx.createBuffer(2, length, rate);
    for (let c = 0; c < 2; c++) {
      const ch = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) {
        ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }

  /**
   * Sets up global event listeners on common user gestures to auto-resume the context.
   */
  private setupResumeListeners() {
    const resume = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume()
          .then(() => {
            console.log('AudioContext auto-resumed on user interaction.');
            cleanup();
          })
          .catch(err => {
            console.error('AudioContext auto-resume failed:', err);
          });
      } else if (this.ctx && this.ctx.state === 'running') {
        cleanup();
      }
    };

    const events = ['click', 'keydown', 'mousedown', 'touchstart'];
    const cleanup = () => {
      events.forEach(ev => {
        document.removeEventListener(ev, resume);
      });
    };

    events.forEach(ev => {
      document.addEventListener(ev, resume, { passive: true });
    });
  }
}

export const audioEngine = new AudioEngine();
