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
    vi.stubGlobal('document', {
      querySelector: () => null,
      querySelectorAll: () => Object.values(buttons),
    });
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
