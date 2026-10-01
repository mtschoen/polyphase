import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InputController, type Actions } from '../src/input';

class Surface extends EventTarget {
  dataset: Record<string, string> = {};
  setPointerCapture = vi.fn();
  closest(): null {
    return null;
  }
}

describe('held keyboard and touch controls', () => {
  const windowSurface = new Surface();
  let buttons: Record<string, Surface>;
  let actions: Actions;
  let input: InputController;

  beforeEach(() => {
    buttons = Object.fromEntries(
      ['left', 'right', 'down', 'rotate', 'drop', 'hold'].map((action) => {
        const button = new Surface();
        button.dataset.action = action;
        return [action, button];
      }),
    );
    vi.stubGlobal('window', windowSurface);
    vi.stubGlobal(
      'document',
      Object.assign(new EventTarget(), {
        querySelector: () => null,
        querySelectorAll: () => Object.values(buttons),
      }),
    );
    vi.stubGlobal('Element', Surface);
    vi.stubGlobal('HTMLInputElement', class extends Surface {});
    actions = {
      move: vi.fn(),
      softDrop: vi.fn(),
      rotate: vi.fn(),
      drop: vi.fn(),
      hold: vi.fn(),
      resonate: vi.fn(),
      pause: vi.fn(),
      mute: vi.fn(),
      fullscreen: vi.fn(),
      start: vi.fn(),
      isPlaying: () => true,
      isReady: () => false,
    };
    input = new InputController(actions);
  });
  afterEach(() => {
    input.dispose();
    vi.unstubAllGlobals();
  });

  function pointer(action: string, type: string, pointerId: number) {
    buttons[action].dispatchEvent(
      Object.assign(new Event(type, { cancelable: true }), { pointerId }),
    );
  }
  function keyboard(type: string, code: string) {
    windowSurface.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), { code }));
  }

  it('keeps a direction held until the last finger releases it', () => {
    pointer('left', 'pointerdown', 1);
    pointer('left', 'pointerdown', 2);
    pointer('left', 'pointerup', 1);
    vi.mocked(actions.move).mockClear();
    input.update(0.2);
    expect(actions.move).toHaveBeenCalledWith(-1);
    pointer('left', 'pointerup', 2);
    vi.mocked(actions.move).mockClear();
    input.update(0.2);
    expect(actions.move).not.toHaveBeenCalled();
  });

  it.each(['pointerup', 'pointercancel', 'lostpointercapture'])(
    'releases soft drop after %s',
    (event) => {
      pointer('down', 'pointerdown', 1);
      expect(actions.softDrop).toHaveBeenLastCalledWith(true);
      pointer('down', event, 1);
      expect(actions.softDrop).toHaveBeenLastCalledWith(false);
    },
  );

  it('retains keyboard movement when the same touch direction releases', () => {
    keyboard('keydown', 'ArrowRight');
    pointer('right', 'pointerdown', 1);
    pointer('right', 'pointercancel', 1);
    vi.mocked(actions.move).mockClear();
    input.update(0.2);
    expect(actions.move).toHaveBeenCalledWith(1);
    keyboard('keyup', 'ArrowRight');
    vi.mocked(actions.move).mockClear();
    input.update(0.2);
    expect(actions.move).not.toHaveBeenCalled();
  });

  it('rotates with a second finger without losing held horizontal movement', () => {
    pointer('left', 'pointerdown', 1);
    pointer('rotate', 'pointerdown', 2);
    pointer('rotate', 'pointerup', 2);
    vi.mocked(actions.move).mockClear();
    input.update(0.2);
    expect(actions.rotate).toHaveBeenCalledWith(1);
    expect(actions.move).toHaveBeenCalledWith(-1);
  });

  it('clears held input on blur and removes listeners on disposal', () => {
    pointer('down', 'pointerdown', 1);
    pointer('right', 'pointerdown', 2);
    windowSurface.dispatchEvent(new Event('blur'));
    vi.mocked(actions.move).mockClear();
    input.update(0.2);
    expect(actions.softDrop).toHaveBeenLastCalledWith(false);
    expect(actions.move).not.toHaveBeenCalled();
    input.dispose();
    pointer('drop', 'pointerdown', 3);
    keyboard('keydown', 'Space');
    expect(actions.drop).not.toHaveBeenCalled();
  });
});

describe('full-screen touch zones', () => {
  const windowSurface = new Surface();
  let actions: Actions;
  let input: InputController;
  let doc: EventTarget & { querySelector: () => null; querySelectorAll: () => Surface[] };

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(windowSurface, 'innerWidth', { value: 300, configurable: true });
    vi.stubGlobal('window', windowSurface);
    doc = Object.assign(new EventTarget(), {
      querySelector: () => null,
      querySelectorAll: () => [],
    });
    vi.stubGlobal('document', doc);
    vi.stubGlobal('Element', Surface);
    vi.stubGlobal('HTMLInputElement', class extends Surface {});
    actions = {
      move: vi.fn(),
      softDrop: vi.fn(),
      rotate: vi.fn(),
      drop: vi.fn(),
      hold: vi.fn(),
      resonate: vi.fn(),
      pause: vi.fn(),
      mute: vi.fn(),
      fullscreen: vi.fn(),
      start: vi.fn(),
      isPlaying: () => true,
      isReady: () => false,
    };
    input = new InputController(actions);
    input.setZonesActive(true);
  });
  afterEach(() => {
    input.dispose();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function zone(type: string, pointerId: number, clientX: number, clientY: number, time: number) {
    vi.setSystemTime(time);
    const event = Object.assign(new Event(type, { cancelable: true }), {
      pointerId,
      pointerType: 'touch',
      clientX,
      clientY,
    });
    Object.defineProperty(event, 'target', { value: null, configurable: true });
    doc.dispatchEvent(event);
  }

  it('taps left, middle and right thirds to move and rotate', () => {
    zone('pointerdown', 1, 40, 200, 0);
    zone('pointerup', 1, 40, 200, 100);
    zone('pointerdown', 2, 150, 200, 200);
    zone('pointerup', 2, 150, 200, 300);
    zone('pointerdown', 3, 260, 200, 400);
    zone('pointerup', 3, 260, 200, 500);
    expect(actions.move).toHaveBeenCalledWith(-1);
    expect(actions.rotate).toHaveBeenCalledWith(1);
    expect(actions.move).toHaveBeenCalledWith(1);
  });

  it('ignores zone taps until zones are active', () => {
    input.setZonesActive(false);
    zone('pointerdown', 1, 40, 200, 0);
    zone('pointerup', 1, 40, 200, 100);
    expect(actions.move).not.toHaveBeenCalled();
  });

  it('drops on a quick sideways flick', () => {
    zone('pointerdown', 1, 150, 200, 0);
    zone('pointerup', 1, 210, 205, 150);
    expect(actions.drop).toHaveBeenCalled();
  });

  it('holds with a two-finger tap', () => {
    zone('pointerdown', 1, 40, 200, 0);
    zone('pointerdown', 2, 250, 200, 100);
    zone('pointerup', 1, 40, 200, 200);
    zone('pointerup', 2, 250, 200, 250);
    expect(actions.hold).toHaveBeenCalled();
  });

  it('soft drops while dragging down and releases on lift', () => {
    zone('pointerdown', 1, 150, 100, 0);
    zone('pointermove', 1, 152, 160, 100);
    expect(actions.softDrop).toHaveBeenLastCalledWith(true);
    zone('pointerup', 1, 152, 160, 200);
    expect(actions.softDrop).toHaveBeenLastCalledWith(false);
  });
});
