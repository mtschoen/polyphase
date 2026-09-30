import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardEffects } from '../src/effects';
import { COLORS } from '../src/game/types';
import { DEFAULT_IMPACT_SETTINGS } from '../src/impact-settings';

function seededRandom() {
  let state = 173;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function surface() {
  const paint: { kind: string; alpha: number; color: string; radius: number }[] = [];
  let radius = 0;
  const gradient = { addColorStop: vi.fn() };
  const context = Object.fromEntries(
    [
      'clearRect',
      'setTransform',
      'save',
      'restore',
      'translate',
      'rotate',
      'beginPath',
      'ellipse',
      'arc',
      'stroke',
      'fill',
      'fillRect',
      'moveTo',
      'lineTo',
      'drawImage',
    ].map((name) => [name, vi.fn()]),
  );
  context.createRadialGradient = vi.fn(() => gradient);
  context.createLinearGradient = vi.fn(() => gradient);
  context.arc = vi.fn((_x: number, _y: number, value: number) => {
    radius = value;
  });
  context.fill = vi.fn(() =>
    paint.push({
      kind: 'core',
      alpha: Number(context.globalAlpha),
      color: String(context.fillStyle),
      radius,
    }),
  );
  context.stroke = vi.fn(() =>
    paint.push({
      kind: 'stroke',
      alpha: Number(context.globalAlpha),
      color: String(context.strokeStyle),
      radius: Number(context.lineWidth),
    }),
  );
  context.fillRect = vi.fn((_x: number, _y: number, width: number, height: number) =>
    paint.push({
      kind: 'rectangle',
      alpha: Number(context.globalAlpha),
      color: String(context.fillStyle),
      radius: Math.max(width, height),
    }),
  );
  context.drawImage = vi.fn(() =>
    paint.push({ kind: 'glow', alpha: Number(context.globalAlpha), color: '', radius: 0 }),
  );
  return {
    style: { transform: '' },
    width: 0,
    height: 0,
    clientWidth: 300,
    clientLeft: 0,
    clientTop: 0,
    className: '',
    getContext: () => context,
    setAttribute: vi.fn(),
    remove: vi.fn(),
    getBoundingClientRect: () => ({ left: 100, top: 50 }),
    context,
    paint,
  };
}

describe('clear and landing effects', () => {
  const created: ReturnType<typeof surface>[] = [];
  beforeEach(() => {
    created.length = 0;
    vi.stubGlobal('document', {
      createElement: () => {
        const canvas = surface();
        created.push(canvas);
        return canvas;
      },
      body: { append: vi.fn() },
    });
    vi.stubGlobal('window', { innerWidth: 1000, innerHeight: 800, devicePixelRatio: 1 });
    vi.spyOn(Math, 'random').mockReturnValue(0.8);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function setup(random: () => number = Math.random) {
    const board = surface();
    const application = { style: { transform: '' } };
    const frame = { style: { transform: '' }, closest: () => application };
    const effects = new BoardEffects(
      board as unknown as HTMLCanvasElement,
      frame as unknown as HTMLElement,
      random,
    );
    return { effects, application, frame };
  }

  it('keeps a dense colorful landing fan with white-hot centers bright for a quarter second', () => {
    const { effects } = setup(seededRandom());
    effects.handle({ type: 'lock', cells: [{ x: 3, y: 18, color: 0 }] }, 10);
    effects.render(0.15, 30, false);
    const paint = created[0].paint;
    const bright = () =>
      paint.filter((mark) => mark.kind === 'core' && mark.color === '#f5fff9' && mark.alpha > 0.3);
    expect(bright().length).toBeGreaterThanOrEqual(12);
    expect(paint.some((mark) => mark.kind === 'stroke' && mark.color === COLORS[0])).toBe(true);
    expect(bright().every((mark) => mark.radius <= 2.7)).toBe(true);
    paint.length = 0;
    effects.render(0.1, 30, false);
    expect(bright().length).toBeGreaterThanOrEqual(12);
    paint.length = 0;
    effects.render(0.8, 30, false);
    expect(paint).toEqual([]);
  });

  it('changes density independently of rendered size and shake', () => {
    const { effects, application, frame } = setup();
    const settings = { ...DEFAULT_IMPACT_SETTINGS, particleDensity: 1, screenShake: 1 };
    effects.setImpactSettings(settings);
    const cells = [{ x: 3, y: 18, color: 0 }];
    effects.handle({ type: 'lock', cells }, 10);
    effects.render(0.01, 30, false);
    const paint = created[0].paint;
    const count = paint.filter((mark) => mark.kind === 'core' || mark.kind === 'rectangle').length;
    const radius = paint.find((mark) => mark.kind === 'core')!.radius;
    const shake = frame.style.transform;
    effects.reset();
    paint.length = 0;
    effects.setImpactSettings({ ...settings, particleDensity: 2 });
    effects.handle({ type: 'lock', cells }, 10);
    effects.render(0.01, 30, false);
    expect(paint.filter((mark) => mark.kind === 'core' || mark.kind === 'rectangle')).toHaveLength(
      count * 2,
    );
    expect(paint.find((mark) => mark.kind === 'core')!.radius).toBe(radius);
    expect(frame.style.transform).toBe(shake);
    expect(application.style.transform).toBe('');
  });

  it('resizes existing particles without changing their count or shake', () => {
    const { effects, frame } = setup();
    effects.setImpactSettings({ ...DEFAULT_IMPACT_SETTINGS, particleSize: 1 });
    effects.handle({ type: 'lock', cells: [{ x: 3, y: 18, color: 0 }] }, 10);
    effects.render(0.01, 30, false);
    const paint = created[0].paint;
    const radii = paint.filter((mark) => mark.kind === 'core').map((mark) => mark.radius);
    const shake = frame.style.transform;
    paint.length = 0;
    effects.setImpactSettings({ ...DEFAULT_IMPACT_SETTINGS, particleSize: 2 });
    effects.render(0, 30, false);
    expect(paint.filter((mark) => mark.kind === 'core').map((mark) => mark.radius)).toEqual(
      radii.map((radius) => radius * 2),
    );
    expect(frame.style.transform).toBe(shake);
  });

  it('scales an in-flight shake independently of particle count and size', () => {
    const { effects, application } = setup();
    const settings = { ...DEFAULT_IMPACT_SETTINGS, screenShake: 1 };
    effects.setImpactSettings(settings);
    effects.handle({ type: 'clear', amount: 6, cells: [{ x: 3, y: 18, color: 0 }] }, 10);
    effects.render(0.01, 30, false);
    const displacement = () => Number(application.style.transform.match(/\(([-\d.]+)px/)?.[1]);
    const original = displacement();
    const paint = created[0].paint;
    const radii = paint.filter((mark) => mark.kind === 'core').map((mark) => mark.radius);
    paint.length = 0;
    effects.setImpactSettings({ ...settings, screenShake: 0.5 });
    effects.render(0, 30, false);
    expect(displacement()).toBe(original / 2);
    expect(paint.filter((mark) => mark.kind === 'core').map((mark) => mark.radius)).toEqual(radii);
  });

  it('bounds retained particle drawing even after repeated maximum-density bursts', () => {
    const { effects } = setup();
    effects.setImpactSettings({ ...DEFAULT_IMPACT_SETTINGS, particleDensity: 4 });
    const cells = Array.from({ length: 256 }, (_, index) => ({
      x: index % 16,
      y: Math.floor(index / 16),
      color: index % COLORS.length,
    }));
    for (let burst = 0; burst < 3; burst++) effects.handle({ type: 'lock', cells }, 100);
    effects.render(0.01, 30, false);
    const count = created[0].paint.filter(
      (mark) => mark.kind === 'core' || mark.kind === 'rectangle',
    ).length;
    expect(count).toBeGreaterThan(7000);
    expect(count).toBeLessThanOrEqual(8000);
  });

  it('immediately stops current shake and clears particles and trails when their sliders reach zero', () => {
    const { effects, application, frame } = setup();
    const cells = [{ x: 3, y: 18, color: 0 }];
    effects.handle({ type: 'lock', cells }, 10);
    effects.handle({ type: 'drop', cells, distance: 18 }, 10);
    effects.render(0.01, 30, false);
    expect(frame.style.transform).not.toBe('');
    const paint = created[0].paint;
    effects.setImpactSettings({ ...DEFAULT_IMPACT_SETTINGS, screenShake: 0, particleDensity: 0 });
    expect(frame.style.transform).toBe('');
    expect(application.style.transform).toBe('');
    paint.length = 0;
    effects.render(0.01, 30, false);
    expect(paint).toEqual([]);
    effects.handle({ type: 'lock', cells }, 10);
    effects.handle({ type: 'drop', cells, distance: 18 }, 10);
    effects.render(0.01, 30, false);
    expect(paint).toEqual([]);
    effects.handle({ type: 'clear', amount: 1, cells }, 10);
    effects.render(0.01, 30, false);
    expect(paint.some((mark) => mark.kind === 'core')).toBe(false);
    expect(created[0].context.ellipse).toHaveBeenCalled();
  });

  it.each([1, 6])(
    'keeps clear %s bright inside the clear pause and fully expires by one second',
    (amount) => {
      const { effects } = setup(seededRandom());
      effects.handle({ type: 'clear', amount, cells: [{ x: 3, y: 18, color: 0 }] }, 10);
      effects.render(0.2, 30, false);
      const paint = created[0].paint;
      expect(
        paint.filter((mark) => mark.kind === 'core' && mark.alpha > 0.3).length,
      ).toBeGreaterThanOrEqual(12);
      paint.length = 0;
      effects.render(0.8, 30, false);
      expect(paint.filter((mark) => mark.alpha > 0)).toEqual([]);
    },
  );

  it.each([1, 2, 3, 4, 5, 6])(
    'keeps the early clear %s glow but removes it before the next piece enters',
    (amount) => {
      const { effects } = setup(seededRandom());
      effects.handle({ type: 'clear', amount, cells: [{ x: 3, y: 18, color: 0 }] }, 10);
      effects.render(0.05, 30, false);
      const paint = created[0].paint;
      expect(
        paint.filter((mark) => mark.kind === 'glow' && mark.alpha > 0.5).length,
      ).toBeGreaterThan(20);
      paint.length = 0;
      const entryDelay = 0.36 + (amount - 1) * 0.06;
      effects.render(entryDelay - 0.05, 30, false);
      expect(paint.filter((mark) => mark.kind === 'glow' && mark.alpha > 0)).toEqual([]);
      expect(paint.filter((mark) => mark.alpha > 0.32)).toEqual([]);
      expect(paint.some((mark) => mark.kind === 'core' && mark.alpha > 0)).toBe(true);
    },
  );

  it('lets a clear take over the preceding hard-drop landing spray before entry', () => {
    const { effects } = setup(seededRandom());
    const cells = [{ x: 3, y: 21, color: 0 }];
    effects.handle({ type: 'drop', distance: 18, cells }, 10);
    effects.handle({ type: 'lock', cells }, 10);
    effects.render(0.01, 30, false);
    expect(created[0].paint.some((mark) => mark.kind === 'glow' && mark.alpha > 0.5)).toBe(true);
    effects.handle({ type: 'clear', amount: 1, rows: [21], cells }, 10);
    created[0].paint.length = 0;
    effects.render(0.36, 30, false);
    expect(created[0].paint.filter((mark) => mark.kind === 'glow' && mark.alpha > 0)).toEqual([]);
    expect(created[0].paint.filter((mark) => mark.alpha > 0.32)).toEqual([]);
  });

  it('shakes the whole application more strongly for six lines than one line', () => {
    const { effects, application, frame } = setup();
    const cells = [{ x: 3, y: 18, color: 0 }];
    effects.handle({ type: 'clear', cells, amount: 1 }, 10);
    effects.render(0.01, 30, false);
    const single = application.style.transform;
    expect(single).toContain('translate3d');
    expect(frame.style.transform).toBe('');
    effects.reset();
    effects.handle({ type: 'clear', cells, amount: 6 }, 10);
    effects.render(0.01, 30, false);
    const displacement = (value: string) => Math.abs(Number(value.match(/\(([-\d.]+)px/)?.[1]));
    expect(displacement(application.style.transform)).toBeGreaterThan(displacement(single));
  });

  it('keeps a drop trail free of a second explosive burst and leaves landing bumps local', () => {
    const { effects, application, frame } = setup();
    const cells = [{ x: 3, y: 18, color: 0 }];
    effects.handle({ type: 'drop', cells, distance: 18 }, 10);
    effects.render(0.01, 30, false);
    expect(application.style.transform).toBe('');
    expect(frame.style.transform).toBe('');
    effects.handle({ type: 'lock', cells }, 10);
    effects.render(0.01, 30, false);
    expect(application.style.transform).toBe('');
    expect(frame.style.transform).toContain('translate3d');
  });

  it('clears both shake targets when reduced motion is enabled', () => {
    const { effects, application, frame } = setup();
    effects.handle({ type: 'lock', cells: [{ x: 3, y: 18, color: 0 }] }, 10);
    effects.handle({ type: 'clear', cells: [{ x: 3, y: 18, color: 0 }], amount: 6 }, 10);
    effects.render(0.01, 30, false);
    expect(application.style.transform).not.toBe('');
    effects.render(0.01, 30, true);
    expect(application.style.transform).toBe('');
    expect(frame.style.transform).toBe('');
    effects.render(0.01, 30, false);
    expect(application.style.transform).toBe('');
  });
});
