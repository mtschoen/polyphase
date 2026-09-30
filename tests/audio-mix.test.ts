import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioEngine } from '../src/audio';
import type { AudioLane, VoiceOptions } from '../src/audio';

class Parameter {
  value = 0;
  events: { type: string; value?: number; time: number }[] = [];
  cancelScheduledValues(time: number) {
    this.events = this.events.filter((event) => event.time < time);
  }
  cancelAndHoldAtTime(time: number) {
    this.cancelScheduledValues(time);
    this.events.push({ type: 'hold', time });
  }
  setValueAtTime(value: number, time: number) {
    this.events.push({ type: 'set', value, time });
    this.value = value;
  }
  linearRampToValueAtTime(value: number, time: number) {
    this.events.push({ type: 'linear', value, time });
  }
  exponentialRampToValueAtTime(value: number, time: number) {
    this.events.push({ type: 'exponential', value, time });
  }
  setTargetAtTime(value: number, time: number) {
    this.events.push({ type: 'target', value, time });
  }
}

class Node {
  connections: Node[] = [];
  gain = new Parameter();
  frequency = new Parameter();
  detune = new Parameter();
  Q = new Parameter();
  pan = new Parameter();
  delayTime = new Parameter();
  threshold = new Parameter();
  knee = new Parameter();
  ratio = new Parameter();
  attack = new Parameter();
  release = new Parameter();
  connect(node: Node) {
    this.connections.push(node);
    return node;
  }
  disconnect() {
    this.connections = [];
  }
  start() {}
  stop() {}
}

class Context {
  state = 'running';
  currentTime = 0;
  sampleRate = 8000;
  destination = new Node();
  oscillators: Node[] = [];
  buffers: Node[] = [];
  createGain() {
    return new Node();
  }
  createDynamicsCompressor() {
    return new Node();
  }
  createDelay() {
    return new Node();
  }
  createBiquadFilter() {
    return new Node();
  }
  createStereoPanner() {
    return new Node();
  }
  createOscillator() {
    const node = new Node();
    this.oscillators.push(node);
    return node;
  }
  createBufferSource() {
    const node = new Node();
    this.buffers.push(node);
    return node;
  }
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) };
  }
  async resume() {}
  async close() {
    this.state = 'closed';
  }
}

interface Seam {
  context: Context;
  musicBus: { dry: Node; send: Node; output: Node; pump: Node };
  effectBus: { dry: Node; send: Node; output: Node; pump: Node };
  note(
    note: number,
    time: number,
    duration: number,
    volume: number,
    lane: AudioLane,
    options?: VoiceOptions,
  ): void;
  kick(time: number, volume: number, lane: AudioLane): void;
  noise(
    time: number,
    duration: number,
    volume: number,
    frequency: number,
    filter: BiquadFilterType,
    lane: AudioLane,
  ): void;
}

let engine: AudioEngine;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('AudioContext', Context);
  engine = new AudioEngine();
});
afterEach(() => {
  engine.dispose();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('club audio mix', () => {
  it('preserves same-frame rotation after movement while limiting repeat clicks', async () => {
    await engine.start();
    const seam = engine as unknown as Seam;
    engine.effect('move');
    engine.effect('rotate');
    expect(seam.context.oscillators).toHaveLength(2);
    engine.effect('move');
    engine.effect('rotate');
    expect(seam.context.oscillators).toHaveLength(2);
    seam.context.currentTime = 0.04;
    engine.effect('move');
    engine.effect('rotate');
    expect(seam.context.oscillators).toHaveLength(4);
  });

  it('limits soft-drop ticks without suppressing other actions or bypassing mute', async () => {
    await engine.start();
    const seam = engine as unknown as Seam;
    engine.effect('softdrop');
    seam.context.currentTime = 0.035;
    engine.effect('softdrop');
    engine.effect('rotate');
    expect(seam.context.oscillators).toHaveLength(2);
    seam.context.currentTime = 0.08;
    engine.effect('softdrop');
    expect(seam.context.oscillators).toHaveLength(3);
    engine.setMuted(true);
    seam.context.currentTime = 1;
    engine.effect('softdrop');
    engine.setMuted(false);
    engine.setVolume(0);
    engine.effect('hold');
    expect(seam.context.oscillators).toHaveLength(3);
  });

  it('starts pumping on platforms without cancelAndHoldAtTime', async () => {
    await engine.start();
    const seam = engine as unknown as Seam;
    Object.defineProperty(seam.musicBus.pump.gain, 'cancelAndHoldAtTime', { value: undefined });
    expect(() => engine.setPlaying(true)).not.toThrow();
    expect(seam.musicBus.pump.gain.events.some((event) => event.value === 0.22)).toBe(true);
    expect(seam.musicBus.pump.gain.events.at(-1)?.value).toBe(1);
  });

  it('pumps melodic dry and wet paths while kick and noise bypass the pump', async () => {
    await engine.start();
    const seam = engine as unknown as Seam;
    expect(seam.musicBus.pump).toBeDefined();
    expect(seam.musicBus.dry.connections).toContain(seam.musicBus.pump);
    expect(seam.musicBus.pump.connections).toContain(seam.musicBus.output);
    for (const delay of seam.musicBus.send.connections)
      expect(delay.connections[0].connections[0].connections).toContain(seam.musicBus.pump);
    seam.note(60, 1, 0.5, 0.1, 'music');
    const melodicOutput =
      seam.context.oscillators.at(-1)!.connections[0].connections[0].connections[0];
    expect(melodicOutput.connections).toEqual([seam.musicBus.dry, seam.musicBus.send]);
    const first = seam.context.oscillators.length;
    seam.kick(1, 0.3, 'music');
    expect(seam.context.oscillators.length - first).toBeGreaterThanOrEqual(2);
    for (const source of seam.context.oscillators.slice(first))
      expect(source.connections[0].connections[0].connections[0].connections).toEqual([
        seam.musicBus.output,
      ]);
    seam.noise(1, 0.1, 0.05, 7000, 'highpass', 'music');
    expect(seam.context.buffers.at(-1)!.connections[0].connections[0].connections).toEqual([
      seam.musicBus.output,
    ]);
    seam.kick(1, 0.2, 'effect');
    expect(
      seam.context.oscillators.at(-1)!.connections[0].connections[0].connections[0].connections,
    ).toEqual([seam.effectBus.dry, seam.effectBus.send]);
  });

  it('schedules a strong short dip and restores before the next quarter', async () => {
    await engine.start();
    engine.setPlaying(true);
    const seam = engine as unknown as Seam;
    expect(seam.musicBus.pump).toBeDefined();
    engine.effect('clear', 6);
    const outputAutomation = structuredClone(seam.musicBus.output.gain.events);
    seam.kick(1, 0.3, 'music');
    expect(seam.musicBus.output.gain.events).toEqual(outputAutomation);
    expect(outputAutomation.some((event) => event.value === 0.6)).toBe(true);
    const events = seam.musicBus.pump.gain.events.filter((event) => event.time >= 1);
    expect(events.some((event) => event.value === 0.22 && event.time <= 1.012)).toBe(true);
    expect(events.at(-1)?.value).toBe(1);
    expect(events.at(-1)!.time).toBeLessThan(1.4);
  });

  it.each(['pause', 'mute', 'volume', 'theme', 'mode', 'sizes', 'dispose'] as const)(
    'clears future pumping when %s changes',
    async (action) => {
      await engine.start();
      engine.setPlaying(true);
      const seam = engine as unknown as Seam;
      expect(seam.musicBus.pump).toBeDefined();
      const gain = seam.musicBus.pump.gain;
      const currentTime = seam.context.currentTime;
      seam.kick(1, 0.3, 'music');
      if (action === 'pause') engine.setPlaying(false);
      if (action === 'mute') engine.setMuted(true);
      if (action === 'volume') engine.setVolume(0.3);
      if (action === 'theme') engine.setTheme(1);
      if (action === 'mode') engine.setMode('sextris');
      if (action === 'sizes') engine.setPieceSizes([3, 5]);
      if (action === 'dispose') engine.dispose();
      expect(gain.events.some((event) => event.time > currentTime)).toBe(false);
      expect(gain.value).toBe(1);
    },
  );
});
