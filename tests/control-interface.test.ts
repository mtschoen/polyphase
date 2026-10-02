import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameEngine } from '../src/game/engine';
import { updateControls, updateEffectsControls } from '../src/interface';

// Substitute only DOM storage; the real engine and UI projection determine every state.
class ControlElement {
  disabled = false;
  textContent = '';
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  classes = new Set<string>();
  classList = {
    toggle: (name: string, force: boolean) => {
      if (force) this.classes.add(name);
      else this.classes.delete(name);
      return force;
    },
  };
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
}

describe('control availability presentation', () => {
  let elements: Map<string, ControlElement>;
  let buttons: ControlElement[];
  const element = (selector: string): ControlElement => {
    const found = elements.get(selector);
    if (!found) throw new Error(`Unmodeled selector: ${selector}`);
    return found;
  };

  beforeEach(() => {
    elements = new Map(
      ['.hold-panel', '#hold-caption', '#touch-hold-caption', '#resonance', '#charge-label'].map(
        (selector) => [selector, new ControlElement()],
      ),
    );
    buttons = ['left', 'right', 'down', 'drop', 'counter', 'rotate', 'hold'].map((action) => {
      const button = new ControlElement();
      button.dataset.action = action;
      return button;
    });
    vi.stubGlobal('document', {
      querySelector: element,
      querySelectorAll: (selector: string) => {
        if (selector !== '[data-action]') throw new Error(`Unmodeled selector: ${selector}`);
        return buttons;
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('keeps desktop and mobile effects shortcuts synchronized with settings', () => {
    const effectsButtons = [new ControlElement(), new ControlElement()];
    vi.stubGlobal('document', {
      querySelectorAll: (selector: string) => {
        if (selector !== '[data-effects-mode]') throw new Error(`Unmodeled selector: ${selector}`);
        return effectsButtons;
      },
    });
    for (const reducedMotion of [true, false, true]) {
      updateEffectsControls(reducedMotion);
      for (const button of effectsButtons) {
        expect(button.textContent).toBe(reducedMotion ? 'CALM FX' : 'FULL FX');
        expect(button.attributes.get('aria-label')).toBe(
          reducedMotion ? 'Enable full effects' : 'Use reduced effects',
        );
      }
    }
  });

  it('reenables Hold for the next piece even when the held preview has not changed', () => {
    const game = new GameEngine('monotris', 'flow', () => 0.37);
    updateControls(game);
    expect(buttons.every((button) => button.disabled)).toBe(true);
    game.start();
    updateControls(game);
    expect(buttons.every((button) => !button.disabled)).toBe(true);
    expect(element('.hold-panel').classes.has('unavailable')).toBe(false);
    game.hold();
    const held = game.held;
    updateControls(game);
    expect(
      buttons.filter((button) => button.disabled).map((button) => button.dataset.action),
    ).toEqual(['hold']);
    expect(element('.hold-panel').classes.has('unavailable')).toBe(true);
    expect(element('#touch-hold-caption').textContent).toBe('UNAVAILABLE');
    game.hardDrop();
    expect(game.held).toBe(held);
    updateControls(game);
    expect(buttons.every((button) => !button.disabled)).toBe(true);
    expect(element('#hold-caption').textContent).toContain('swap');
    game.setPaused(true);
    updateControls(game);
    expect(buttons.every((button) => button.disabled)).toBe(true);
  });

  it('shows a charged action only when Resonance can act and removes it after use', () => {
    const game = new GameEngine('monotris', 'flow', () => 0.37);
    game.start();
    updateControls(game);
    expect(element('#resonance').disabled).toBe(true);
    expect(element('#resonance').attributes.get('aria-label')).toContain('0%');
    game.charge = 100;
    updateControls(game);
    expect(element('#resonance').disabled).toBe(true);
    expect(element('#charge-label').textContent).toBe('CHARGED');
    game.board[game.height - 1][0] = 1;
    updateControls(game);
    expect(element('#resonance').disabled).toBe(false);
    expect(element('#resonance').classes.has('ready')).toBe(true);
    expect(element('#resonance').attributes.get('aria-label')).toBe('Activate Resonance');
    game.activateResonance();
    updateControls(game);
    expect(element('#resonance').disabled).toBe(true);
    expect(element('#resonance').classes.has('ready')).toBe(false);
    expect(element('#charge-label').textContent).toBe('CHARGING');
  });
});
