export interface Actions {
  move(direction: number): void;
  softDrop(value: boolean): void;
  softDropOnce(): void;
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
  private pointers = new Map<number, string>();
  private padPointer: number | undefined;
  private keys = new Map<string, string>();
  private buttons: HTMLButtonElement[];
  constructor(private actions: Actions) {
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.clear);
    this.buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-action]')];
    this.buttons.forEach((button) => {
      button.addEventListener('pointerdown', this.pointerDown);
      button.addEventListener('pointerup', this.pointerUp);
      button.addEventListener('pointercancel', this.pointerUp);
      button.addEventListener('lostpointercapture', this.pointerUp);
      button.addEventListener('click', this.buttonClick);
    });
  }
  private pointerDown = (event: PointerEvent): void => {
    const button = event.currentTarget as HTMLButtonElement;
    event.preventDefault();
    if (
      this.unavailable(button) ||
      event.button > 0 ||
      this.pointers.has(event.pointerId) ||
      (button.dataset.pad && this.padPointer !== undefined)
    )
      return;
    button.setPointerCapture(event.pointerId);
    if (button.dataset.pad) this.padPointer = event.pointerId;
    const action = button.dataset.action!;
    this.pointers.set(event.pointerId, action);
    this.press(action);
  };
  private pointerUp = (event: PointerEvent): void => {
    if (this.padPointer === event.pointerId) this.padPointer = undefined;
    const action = this.pointers.get(event.pointerId);
    this.pointers.delete(event.pointerId);
    if (action) this.releaseIfUnused(action);
  };
  private unavailable(button: HTMLButtonElement): boolean {
    return button.disabled || !this.actions.isPlaying() || !!document.querySelector('dialog[open]');
  }
  private buttonClick = (event: MouseEvent): void => {
    const button = event.currentTarget as HTMLButtonElement;
    // Pointer actions already fire on contact. Preserve native keyboard/assistive activation.
    if (event.detail !== 0 || this.unavailable(button)) return;
    const action = button.dataset.action!;
    if (action === 'down') {
      this.actions.softDropOnce();
      return;
    }
    this.press(action);
    this.releaseIfUnused(action);
  };
  private keyDown = (event: KeyboardEvent): void => {
    if (
      document.querySelector('dialog[open]') ||
      (event.target instanceof Element &&
        event.target.closest(
          'input, select, textarea, [contenteditable]:not([contenteditable="false"])',
        ))
    )
      return;
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
    this.keys.set(key, action);
    this.press(action);
  };
  private keyUp = (event: KeyboardEvent): void => {
    const action = this.keys.get(event.code);
    this.keys.delete(event.code);
    if (action) this.releaseIfUnused(action);
  };
  private releaseIfUnused(action: string): void {
    if ([...this.pointers.values(), ...this.keys.values()].includes(action)) return;
    this.release(action);
  }
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
    this.keys.clear();
    this.pointers.clear();
    this.padPointer = undefined;
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
  dispose(): void {
    this.clear();
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    window.removeEventListener('blur', this.clear);
    for (const button of this.buttons) {
      button.removeEventListener('pointerdown', this.pointerDown);
      button.removeEventListener('pointerup', this.pointerUp);
      button.removeEventListener('pointercancel', this.pointerUp);
      button.removeEventListener('lostpointercapture', this.pointerUp);
      button.removeEventListener('click', this.buttonClick);
    }
  }
}
