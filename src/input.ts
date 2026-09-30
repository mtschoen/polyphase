export interface Actions {
  move(direction: number): void;
  softDrop(value: boolean): void;
  rotate(direction: 1 | -1): void;
  drop(): void;
  hold(): void;
  resonate(): void;
  pause(): void;
  mute(): void;
  fullscreen(): void;
  start(): void;
  isPlaying(): boolean;
  isReady(): boolean;
}

export class InputController {
  private held = new Map<string, number>();
  private horizontal = 0;
  private repeatTime = 0;
  constructor(private actions: Actions) {
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.clear);
    document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        this.press(button.dataset.action!);
      });
      button.addEventListener('pointerup', () => this.release(button.dataset.action!));
      button.addEventListener('pointercancel', () => this.release(button.dataset.action!));
      button.addEventListener('lostpointercapture', () => this.release(button.dataset.action!));
    });
  }
  private keyDown = (event: KeyboardEvent): void => {
    if (document.querySelector('dialog[open]') || event.target instanceof HTMLInputElement) return;
    const key = event.code;
    const action = this.keyAction(key);
    if (!action || event.ctrlKey || event.metaKey || event.altKey) return;
    if (
      (key === 'Space' || key === 'Enter') &&
      event.target instanceof Element &&
      event.target.closest('button, a, summary')
    )
      return;
    event.preventDefault();
    if (event.repeat) return;
    if ((key === 'Space' || key === 'Enter') && this.actions.isReady()) {
      this.actions.start();
      return;
    }
    this.press(action);
  };
  private keyUp = (event: KeyboardEvent): void => {
    const action = this.keyAction(event.code);
    if (action) this.release(action);
  };
  private keyAction(key: string): string | undefined {
    return (
      {
        ArrowLeft: 'left',
        KeyA: 'left',
        ArrowRight: 'right',
        KeyD: 'right',
        ArrowDown: 'down',
        KeyS: 'down',
        ArrowUp: 'rotate',
        KeyX: 'rotate',
        KeyE: 'rotate',
        KeyZ: 'counter',
        KeyQ: 'counter',
        Space: 'drop',
        KeyC: 'hold',
        ShiftLeft: 'hold',
        ShiftRight: 'hold',
        Enter: 'resonate',
        KeyP: 'pause',
        Escape: 'pause',
        KeyM: 'mute',
        KeyF: 'fullscreen',
      } as Record<string, string>
    )[key];
  }
  private press(action: string): void {
    if (action === 'pause') {
      this.clear();
      this.actions.pause();
      return;
    }
    if (action === 'mute') {
      this.actions.mute();
      return;
    }
    if (action === 'fullscreen') {
      this.actions.fullscreen();
      return;
    }
    if (!this.actions.isPlaying()) return;
    if (action === 'left' || action === 'right') {
      const direction = action === 'left' ? -1 : 1;
      this.held.set(action, direction);
      this.horizontal = direction;
      this.repeatTime = 0.16;
      this.actions.move(direction);
    } else if (action === 'down') this.actions.softDrop(true);
    else if (action === 'rotate' || action === 'counter')
      this.actions.rotate(action === 'rotate' ? 1 : -1);
    else if (action === 'drop') this.actions.drop();
    else if (action === 'hold') this.actions.hold();
    else if (action === 'resonate') this.actions.resonate();
  }
  private release(action: string): void {
    if (action === 'down') this.actions.softDrop(false);
    if (action === 'left' || action === 'right') {
      this.held.delete(action);
      this.horizontal = [...this.held.values()].at(-1) || 0;
      this.repeatTime = 0.1;
    }
  }
  clear = (): void => {
    this.held.clear();
    this.horizontal = 0;
    this.actions.softDrop(false);
  };
  update(delta: number): void {
    if (!this.actions.isPlaying() || !this.horizontal) return;
    this.repeatTime -= delta;
    while (this.repeatTime <= 0) {
      this.actions.move(this.horizontal);
      this.repeatTime += 0.055;
    }
  }
}
