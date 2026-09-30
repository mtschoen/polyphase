import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardEffects } from '../src/effects';

function surface() {
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
  };
}

describe('clear and landing effects', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { createElement: surface, body: { append: vi.fn() } });
    vi.stubGlobal('window', { innerWidth: 1000, innerHeight: 800, devicePixelRatio: 1 });
    vi.spyOn(Math, 'random').mockReturnValue(0.8);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function setup() {
    const board = surface();
    const application = { style: { transform: '' } };
    const frame = { style: { transform: '' }, closest: () => application };
    const effects = new BoardEffects(
      board as unknown as HTMLCanvasElement,
      frame as unknown as HTMLElement,
    );
    return { effects, application, frame };
  }

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
