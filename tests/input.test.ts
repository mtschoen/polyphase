import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InputController, type Actions } from '../src/input';

class Surface extends EventTarget {
  dataset: Record<string, string> = {};
  disabled = false;
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
  let dialogOpen: boolean;

  beforeEach(() => {
    dialogOpen = false;
    buttons = Object.fromEntries(
      ['left', 'right', 'down', 'rotate', 'counter', 'drop', 'hold'].map((action) => {
        const button = new Surface();
        button.dataset.action = action;
        return [action, button];
      }),
    );
    vi.stubGlobal('window', windowSurface);
    vi.stubGlobal('document', {
      querySelector: () => (dialogOpen ? new Surface() : null),
      querySelectorAll: () => Object.values(buttons),
    });
    vi.stubGlobal('Element', Surface);
    vi.stubGlobal('HTMLInputElement', class extends Surface {});
    actions = {
      move: vi.fn(),
      softDrop: vi.fn(),
      softDropOnce: vi.fn(),
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
  function keyboard(type: string, code: string, repeat = false) {
    windowSurface.dispatchEvent(
      Object.assign(new Event(type, { cancelable: true }), { code, repeat }),
    );
  }

  it.each(['ArrowUp', 'KeyW', 'Space'])('hard drops once per press of %s', (code) => {
    keyboard('keydown', code);
    keyboard('keydown', code, true);
    input.update(10);
    expect(actions.drop).toHaveBeenCalledTimes(1);
    expect(actions.rotate).not.toHaveBeenCalled();
    keyboard('keyup', code);
    keyboard('keydown', code);
    expect(actions.drop).toHaveBeenCalledTimes(2);
  });

  it.each(['KeyX', 'KeyE'])('keeps clockwise rotation on %s', (code) => {
    keyboard('keydown', code);
    expect(actions.rotate).toHaveBeenCalledExactlyOnceWith(1);
    expect(actions.drop).not.toHaveBeenCalled();
  });

  it('keeps a direction held until the last finger releases it', () => {
    pointer('left', 'pointerdown', 1);
    pointer('left', 'pointerdown', 2);
    pointer('left', 'pointerup', 1);
    vi.mocked(actions.move).mockClear();
    input.update(0.4);
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
    input.update(0.4);
    expect(actions.rotate).toHaveBeenCalledWith(1);
    expect(actions.move).toHaveBeenCalledWith(-1);
  });

  it('moves one cell per short touch and gives every new contact a fresh delay', () => {
    pointer('right', 'pointerdown', 1);
    input.update(0.28);
    expect(actions.move).toHaveBeenCalledExactlyOnceWith(1);
    pointer('right', 'pointerup', 1);
    input.update(1);
    pointer('right', 'pointerdown', 2);
    input.update(0.28);
    pointer('right', 'pointerup', 2);
    input.update(1);
    expect(actions.move).toHaveBeenCalledTimes(2);
  });

  it('waits for a deliberate touch hold and repeats without catch-up bursts', () => {
    pointer('left', 'pointerdown', 1);
    input.update(0.31);
    expect(actions.move).toHaveBeenCalledTimes(1);
    input.update(0.02);
    expect(actions.move).toHaveBeenCalledTimes(2);
    input.update(0.05);
    expect(actions.move).toHaveBeenCalledTimes(2);
    input.update(0.07);
    expect(actions.move).toHaveBeenCalledTimes(3);
    input.update(1);
    expect(actions.move).toHaveBeenCalledTimes(4);
    pointer('left', 'pointercancel', 1);
    input.update(1);
    expect(actions.move).toHaveBeenCalledTimes(4);
  });

  it('preserves the faster keyboard repeat', () => {
    keyboard('keydown', 'ArrowRight');
    input.update(0.17);
    expect(actions.move).toHaveBeenCalledTimes(2);
    input.update(0.06);
    expect(actions.move).toHaveBeenCalledTimes(3);
    keyboard('keyup', 'ArrowRight');
    input.update(1);
    expect(actions.move).toHaveBeenCalledTimes(3);
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

  it.each(['disabled', 'dialog', 'inactive'])('ignores touch when %s', (reason) => {
    buttons.hold.disabled = reason === 'disabled';
    dialogOpen = reason === 'dialog';
    actions.isPlaying = () => reason !== 'inactive';
    pointer('hold', 'pointerdown', 1);
    expect(actions.hold).not.toHaveBeenCalled();
  });

  it('allows only one pad contact while the other thumb rotates', () => {
    for (const action of ['left', 'right', 'down', 'drop'])
      buttons[action].dataset.pad = 'direction';
    pointer('left', 'pointerdown', 1);
    pointer('down', 'pointerdown', 2);
    pointer('drop', 'pointerdown', 3);
    pointer('counter', 'pointerdown', 4);
    expect(actions.softDrop).not.toHaveBeenCalledWith(true);
    expect(actions.drop).not.toHaveBeenCalled();
    expect(actions.rotate).toHaveBeenCalledWith(-1);
    pointer('left', 'pointerup', 1);
    input.update(1);
    expect(actions.move).toHaveBeenCalledTimes(1);
    // Rejected contacts never take over when the accepted contact releases.
    expect(actions.softDrop).not.toHaveBeenCalledWith(true);
    pointer('down', 'pointerup', 2);
    pointer('down', 'pointerdown', 5);
    expect(actions.softDrop).toHaveBeenLastCalledWith(true);
  });

  it('hard drops once per contact and never repeats when held or dragged', () => {
    pointer('drop', 'pointerdown', 1);
    pointer('drop', 'pointerdown', 1);
    pointer('drop', 'pointermove', 1);
    input.update(10);
    expect(actions.drop).toHaveBeenCalledTimes(1);
    pointer('drop', 'pointerup', 1);
    pointer('drop', 'pointerdown', 2);
    expect(actions.drop).toHaveBeenCalledTimes(2);
  });

  it('supports keyboard or assistive button clicks without duplicating touch clicks', () => {
    buttons.counter.dispatchEvent(Object.assign(new Event('click'), { detail: 0 }));
    expect(actions.rotate).toHaveBeenCalledExactlyOnceWith(-1);
    pointer('rotate', 'pointerdown', 1);
    pointer('rotate', 'pointerup', 1);
    buttons.rotate.dispatchEvent(Object.assign(new Event('click'), { detail: 1 }));
    expect(actions.rotate).toHaveBeenCalledTimes(2);
    buttons.down.dispatchEvent(Object.assign(new Event('click'), { detail: 0 }));
    expect(actions.softDropOnce).toHaveBeenCalledExactlyOnceWith();
  });
});
