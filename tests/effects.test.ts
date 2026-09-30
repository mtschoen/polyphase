import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardEffects } from '../src/effects';
import { COLORS } from '../src/game/types';

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

  it('keeps a dense fan of fine piece-colored landing sparks visibly bright for a quarter second', () => {
    const { effects } = setup(seededRandom());
    effects.handle({ type: 'lock', cells: [{ x: 3, y: 18, color: 0 }] }, 10);
    effects.render(0.15, 30, false);
    const paint = created[0].paint;
    const bright = () =>
      paint.filter((mark) => mark.kind === 'core' && mark.color === COLORS[0] && mark.alpha > 0.3);
    expect(bright().length).toBeGreaterThanOrEqual(12);
    expect(bright().every((mark) => mark.radius <= 1.8)).toBe(true);
    paint.length = 0;
    effects.render(0.1, 30, false);
    expect(bright().length).toBeGreaterThanOrEqual(12);
    paint.length = 0;
    effects.render(0.5, 30, false);
    expect(paint).toEqual([]);
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
