import {
  BEAT_DURATION,
  chordForStep,
  scorePosition,
  defaultMusicSizes,
  normalizeMusicSizes,
  PAD_PANNING,
  frequencyForNote,
  MELODY_WAVE,
  scheduleStep,
} from './score';
import type { SoundtrackMode } from './score';
export { SOUNDTRACKS, soundtrackForSizes } from './score';

type SoundEffect =
  'move' | 'rotate' | 'drop' | 'lock' | 'clear' | 'hold' | 'resonance' | 'gameover' | 'level';
export type AudioLane = 'music' | 'effect';

interface AudioBus {
  dry: GainNode;
  send: GainNode;
  output: GainNode;
}

export interface VoiceOptions {
  wave?: OscillatorType;
  attack?: number;
  release?: number;
  pan?: number;
  detune?: number;
  cutoff?: number;
  targetFrequency?: number;
}

interface ActiveVoice {
  lane: AudioLane;
  envelope: GainNode;
  nodes: AudioNode[];
}

const unitInterval = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

/** Folk melody with an original adaptive arrangement. start() requires a user gesture. */
export class AudioEngine {
  private context?: AudioContext;
  private master?: GainNode;
  private musicBus?: AudioBus;
  private effectBus?: AudioBus;
  private noiseBuffer?: AudioBuffer;
  private permanentNodes: AudioNode[] = [];
  private voices = new Map<AudioScheduledSourceNode, ActiveVoice>();
  private timer?: ReturnType<typeof setInterval>;
  private playing = false;
  private muted = false;
  private disposed = false;
  private volume = 0.65;
  private intensity = 0;
  private theme = 0;
  private mode: SoundtrackMode = 'pentris';
  private pieceSizes: readonly number[] = [5];
  private sequenceStep = 0;
  private nextNoteTime = 0;
  private lastInteractionTime = -Infinity;

  async start(): Promise<void> {
    if (this.disposed) return;
    if (!this.context) this.initialize();
    const context = this.context!;
    await context.resume();
    if (!this.disposed && this.playing) this.startScheduler();
  }

  setPlaying(playing: boolean): void {
    if (this.disposed || this.playing === playing) return;
    this.playing = playing;
    if (!this.context || !this.musicBus) return;
    const time = this.context.currentTime;
    this.ramp(this.musicBus.output.gain, playing ? 1 : 0, playing ? 0.12 : 0.035);
    if (playing) {
      // Re-enter at a whole bar instead of replaying notes missed while paused.
      this.sequenceStep -= scorePosition(this.mode, this.sequenceStep, this.pieceSizes).stepInBar;
      this.startScheduler();
    } else {
      this.stopScheduler();
      this.stopVoices('music', time);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.ramp(this.master.gain, muted ? 0 : this.volume, 0.025);
  }

  setVolume(volume: number): void {
    this.volume = unitInterval(volume);
    if (this.master) this.ramp(this.master.gain, this.muted ? 0 : this.volume, 0.04);
  }

  setIntensity(intensity: number): void {
    this.intensity = unitInterval(intensity);
  }

  /** Select a mode's default meters, then call setPieceSizes for a custom Fusion mix. */
  setMode(mode: SoundtrackMode): void {
    if (this.disposed || this.mode === mode) return;
    this.mode = mode;
    this.pieceSizes = defaultMusicSizes(mode);
    this.restartPhrase();
  }

  /** Cycle chosen sizes on whole bars: 1..5 use n/4, six uses compound 6/8. */
  setPieceSizes(sizes: readonly number[]): void {
    if (this.disposed) return;
    const selected = normalizeMusicSizes(sizes);
    if (selected.join(',') === this.pieceSizes.join(',')) return;
    this.pieceSizes = selected;
    this.restartPhrase();
  }

  private restartPhrase(): void {
    this.sequenceStep = 0;
    if (this.context && this.playing) {
      this.stopVoices('music', this.context.currentTime);
      this.nextNoteTime = this.context.currentTime + 0.06;
    }
  }

  setTheme(theme: number): void {
    const nextTheme = Math.round(unitInterval(theme / 2) * 2);
    if (this.theme === nextTheme) return;
    this.theme = nextTheme;
    this.sequenceStep = 0;
    if (this.context && this.playing) {
      this.stopVoices('music', this.context.currentTime);
      this.nextNoteTime = this.context.currentTime + 0.06;
    }
  }

  effect(type: SoundEffect, amount = 1): void {
    const context = this.context;
    if (!context || context.state !== 'running' || this.disposed || this.muted || this.volume === 0)
      return;
    const time = context.currentTime + 0.005;
    const chord = this.currentChord();
    const strength = Number.isFinite(amount) ? Math.min(4, Math.max(1, amount)) : 1;
    if (type === 'move' || type === 'rotate') {
      if (time - this.lastInteractionTime < 0.035) return;
      this.lastInteractionTime = time;
    }
    switch (type) {
      case 'move':
        this.note(chord[2] + 12, time, 0.075, 0.022, 'effect', { pan: -0.2, cutoff: 1700 });
        break;
      case 'rotate':
        this.note(chord[3] + 12, time, 0.13, 0.026, 'effect', {
          wave: MELODY_WAVE,
          pan: 0.25,
          cutoff: 2400,
          targetFrequency: frequencyForNote(chord[3] + 14),
        });
        break;
      case 'drop':
        this.kick(time, 0.23, 'effect');
        this.noise(time, 0.09, 0.045, 650, 'bandpass', 'effect');
        break;
      case 'lock':
        this.note(chord[0] - 12, time, 0.17, 0.075, 'effect', { wave: MELODY_WAVE, cutoff: 480 });
        break;
      case 'hold':
        this.note(chord[1] + 12, time, 0.22, 0.036, 'effect', { pan: -0.3 });
        this.note(chord[2] + 12, time + 0.06, 0.3, 0.032, 'effect', { pan: 0.3 });
        break;
      case 'clear':
        chord.forEach((note, index) => {
          this.note(note + 12, time + index * 0.045, 0.72 + strength * 0.1, 0.04, 'effect', {
            wave: MELODY_WAVE,
            pan: PAD_PANNING[index],
            cutoff: 4500,
            release: 0.65,
          });
        });
        this.note(chord[3] + 24, time + 0.17, 1.15, 0.022 + strength * 0.004, 'effect', {
          pan: 0.5,
        });
        break;
      case 'level':
        [...chord, chord[0] + 12].forEach((note, index) =>
          this.note(note + 12, time + index * 0.11, 0.9, 0.042, 'effect', {
            pan: index * 0.25 - 0.5,
          }),
        );
        break;
      case 'resonance':
        this.noise(time, 2.4, 0.14, 260, 'bandpass', 'effect', 8500);
        this.note(chord[0] - 12, time, 2.4, 0.13, 'effect', { attack: 0.1, release: 1.5 });
        chord.forEach((note, index) => {
          this.note(note + 12, time + 0.12 * index, 2.5, 0.052, 'effect', {
            wave: MELODY_WAVE,
            attack: 0.18,
            release: 1.6,
            pan: PAD_PANNING[index],
            cutoff: 4200,
          });
          this.note(note + 24, time + 0.5 + 0.08 * index, 1.8, 0.024, 'effect', {
            pan: -PAD_PANNING[index],
          });
        });
        break;
      case 'gameover':
        [chord[3], chord[2], chord[1], chord[0]].forEach((note, index) =>
          this.note(note, time + index * 0.18, 1.6, 0.06, 'effect', {
            wave: MELODY_WAVE,
            cutoff: 1100,
          }),
        );
        break;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopScheduler();
    const context = this.context;
    if (!context) return;
    for (const [source, voice] of this.voices) {
      source.stop(context.currentTime);
      source.disconnect();
      voice.nodes.forEach((node) => node.disconnect());
    }
    this.voices.clear();
    this.permanentNodes.forEach((node) => node.disconnect());
    this.permanentNodes = [];
    if (context.state !== 'closed') void context.close();
    this.context = undefined;
    this.master = undefined;
    this.musicBus = undefined;
    this.effectBus = undefined;
    this.noiseBuffer = undefined;
  }

  private initialize(): void {
    const context = new AudioContext({ latencyHint: 'interactive' });
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.22;
    this.master.connect(compressor).connect(context.destination);
    this.permanentNodes.push(this.master, compressor);
    this.musicBus = this.createBus(this.playing ? 1 : 0, 0.16);
    this.effectBus = this.createBus(1, 0.31);
    const noiseLength = Math.ceil(context.sampleRate * 3);
    this.noiseBuffer = context.createBuffer(1, noiseLength, context.sampleRate);
    const samples = this.noiseBuffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
  }

  private createBus(volume: number, echoVolume: number): AudioBus {
    const context = this.context!;
    const dry = context.createGain();
    const send = context.createGain();
    const output = context.createGain();
    output.gain.value = volume;
    send.gain.value = echoVolume;
    dry.connect(output);
    output.connect(this.master!);
    const left = context.createDelay(2);
    const right = context.createDelay(2);
    left.delayTime.value = BEAT_DURATION * 0.75;
    right.delayTime.value = BEAT_DURATION * 1.25;
    const leftFilter = context.createBiquadFilter();
    const rightFilter = context.createBiquadFilter();
    leftFilter.frequency.value = rightFilter.frequency.value = 2600;
    const leftPanner = context.createStereoPanner();
    const rightPanner = context.createStereoPanner();
    leftPanner.pan.value = -0.72;
    rightPanner.pan.value = 0.72;
    const leftFeedback = context.createGain();
    const rightFeedback = context.createGain();
    leftFeedback.gain.value = rightFeedback.gain.value = 0.23;
    send.connect(left).connect(leftFilter).connect(leftPanner).connect(output);
    send.connect(right).connect(rightFilter).connect(rightPanner).connect(output);
    leftFilter.connect(leftFeedback).connect(right);
    rightFilter.connect(rightFeedback).connect(left);
    this.permanentNodes.push(
      dry,
      send,
      output,
      left,
      right,
      leftFilter,
      rightFilter,
      leftPanner,
      rightPanner,
      leftFeedback,
      rightFeedback,
    );
    return { dry, send, output };
  }

  private startScheduler(): void {
    if (this.timer || !this.context || this.context.state !== 'running') return;
    this.nextNoteTime = this.context.currentTime + 0.03;
    this.schedule();
    this.timer = setInterval(() => this.schedule(), 25);
  }

  private stopScheduler(): void {
    if (this.timer !== undefined) clearInterval(this.timer);
    this.timer = undefined;
  }

  private schedule(): void {
    const context = this.context;
    if (!context || !this.playing || context.state !== 'running') return;
    const time = context.currentTime;
    if (this.nextNoteTime < time - 0.1) {
      // Background throttling must not turn elapsed time into a burst of queued notes.
      this.stopVoices('music', time);
      this.sequenceStep -= scorePosition(this.mode, this.sequenceStep, this.pieceSizes).stepInBar;
      this.nextNoteTime = time + 0.03;
    }
    while (this.nextNoteTime < time + 0.12) {
      scheduleStep(
        { note: this.note.bind(this), kick: this.kick.bind(this), noise: this.noise.bind(this) },
        this.sequenceStep,
        this.mode,
        this.theme,
        this.intensity,
        this.nextNoteTime,
        this.pieceSizes,
      );
      this.nextNoteTime += scorePosition(
        this.mode,
        this.sequenceStep,
        this.pieceSizes,
      ).stepDuration;
      this.sequenceStep++;
    }
  }

  private currentChord(): readonly number[] {
    return chordForStep(this.mode, this.sequenceStep, this.theme, this.pieceSizes);
  }

  private note(
    note: number,
    time: number,
    duration: number,
    volume: number,
    lane: AudioLane,
    options: VoiceOptions = {},
  ): void {
    const context = this.context!;
    const source = context.createOscillator();
    source.type = options.wave ?? 'sine';
    source.frequency.setValueAtTime(frequencyForNote(note), time);
    if (options.targetFrequency) {
      source.frequency.exponentialRampToValueAtTime(options.targetFrequency, time + duration * 0.8);
    }
    source.detune.value = options.detune ?? 0;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = options.cutoff ?? 5000;
    filter.Q.value = 0.5;
    const envelope = this.createEnvelope(
      time,
      duration,
      volume,
      options.attack ?? 0.008,
      options.release ?? duration * 0.85,
    );
    const panner = context.createStereoPanner();
    panner.pan.value = options.pan ?? 0;
    source.connect(filter).connect(envelope).connect(panner);
    this.connectVoice(source, envelope, [filter, envelope, panner], panner, lane, time, duration);
  }

  private kick(time: number, volume: number, lane: AudioLane): void {
    this.note(52, time, 0.32, volume, lane, {
      targetFrequency: 42,
      attack: 0.003,
      release: 0.29,
      cutoff: 550,
    });
  }

  private noise(
    time: number,
    duration: number,
    volume: number,
    frequency: number,
    filterType: BiquadFilterType,
    lane: AudioLane,
    targetFrequency?: number,
  ): void {
    const context = this.context!;
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer!;
    const filter = context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(frequency, time);
    filter.Q.value = filterType === 'bandpass' ? 0.8 : 0.5;
    if (targetFrequency)
      filter.frequency.exponentialRampToValueAtTime(targetFrequency, time + duration * 0.78);
    const envelope = this.createEnvelope(
      time,
      duration,
      volume,
      targetFrequency ? 0.24 : 0.003,
      duration * 0.75,
    );
    source.connect(filter).connect(envelope);
    this.connectVoice(source, envelope, [filter, envelope], envelope, lane, time, duration);
  }

  private createEnvelope(
    time: number,
    duration: number,
    volume: number,
    attack: number,
    release: number,
  ): GainNode {
    const envelope = this.context!.createGain();
    envelope.gain.value = 0;
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(volume, time + attack);
    envelope.gain.setValueAtTime(volume, time + Math.max(attack, duration - release));
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    return envelope;
  }

  private connectVoice(
    source: AudioScheduledSourceNode,
    envelope: GainNode,
    nodes: AudioNode[],
    output: AudioNode,
    lane: AudioLane,
    time: number,
    duration: number,
  ): void {
    const bus = lane === 'music' ? this.musicBus! : this.effectBus!;
    output.connect(bus.dry);
    output.connect(bus.send);
    this.voices.set(source, { lane, envelope, nodes });
    source.onended = () => {
      source.disconnect();
      nodes.forEach((node) => node.disconnect());
      this.voices.delete(source);
    };
    source.start(time);
    source.stop(time + duration + 0.025);
  }

  private stopVoices(lane: AudioLane, time: number): void {
    for (const [source, voice] of this.voices) {
      if (voice.lane !== lane) continue;
      const currentVolume = voice.envelope.gain.value;
      voice.envelope.gain.cancelScheduledValues(time);
      voice.envelope.gain.setValueAtTime(currentVolume, time);
      voice.envelope.gain.setTargetAtTime(0, time, 0.015);
      source.stop(time + 0.08);
    }
  }

  private ramp(parameter: AudioParam, value: number, duration: number): void {
    const time = this.context!.currentTime;
    parameter.cancelScheduledValues(time);
    parameter.setValueAtTime(parameter.value, time);
    parameter.linearRampToValueAtTime(value, time + duration);
  }
}
