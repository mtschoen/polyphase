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

interface Zone {
  x: number;
  y: number;
  time: number;
  action: string | null;
  down: boolean;
}

const flickDistance = 34;
const flickTime = 0.28;
const holdPairWindow = 0.3;

export class InputController {
  private held = new Map<string, number>();
  private horizontal = 0;
  private repeatTime = 0;
  private pointers = new Map<number, string>();
  private keys = new Map<string, string>();
  private buttons: HTMLButtonElement[];
  private zones = new Map<number, Zone>();
  private zonesActive = false;
  private lastTapTime = 0;
  private lastTapId = -1;
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
    });
    document.addEventListener('pointerdown', this.zoneDown, true);
    document.addEventListener('pointermove', this.zoneMove, true);
    document.addEventListener('pointerup', this.zoneUp, true);
    document.addEventListener('pointercancel', this.zoneUp, true);
  }
  private pointerDown = (event: PointerEvent): void => {
    const button = event.currentTarget as HTMLButtonElement;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    const action = button.dataset.action!;
    this.pointers.set(event.pointerId, action);
    this.press(action);
  };
  private pointerUp = (event: PointerEvent): void => {
    const action = this.pointers.get(event.pointerId);
    this.pointers.delete(event.pointerId);
    if (action) this.releaseIfUnused(action);
  };
  private zoneDown = (event: PointerEvent): void => {
    if (!this.zonesActive || event.pointerType !== 'touch' || !this.actions.isPlaying()) return;
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest('button, a, input, select, textarea, dialog, label, summary, [data-no-zone]')
    )
      return;
    event.preventDefault();
    const now = performance.now() / 1000;
    if (this.zones.size === 1 && now - this.lastTapTime <= holdPairWindow) {
      const [firstId, first] = [...this.zones.entries()][0];
      if (first.action) {
        this.pointers.delete(firstId);
        this.releaseIfUnused(first.action);
      }
      this.zones.clear();
      this.pointers.delete(this.lastTapId);
      this.lastTapTime = 0;
      this.press('hold');
      return;
    }
    const zone: Zone = {
      x: event.clientX,
      y: event.clientY,
      time: now,
      action: null,
      down: false,
    };
    this.zones.set(event.pointerId, zone);
    const action = this.zoneAction(event.clientX);
    zone.action = action;
    this.pointers.set(event.pointerId, action);
    this.press(action);
    this.lastTapTime = now;
    this.lastTapId = event.pointerId;
  };
  private zoneMove = (event: PointerEvent): void => {
    const zone = this.zones.get(event.pointerId);
    if (!zone) return;
    if (zone.action === 'down') return;
    const dx = event.clientX - zone.x;
    const dy = event.clientY - zone.y;
    if (!zone.down && dy - Math.abs(dx) > 24 && dy > 30) {
      this.swapZoneAction(event.pointerId, zone, 'down');
      zone.down = true;
      return;
    }
    if (zone.down || Math.abs(dx) < flickDistance || Math.abs(dx) < Math.abs(dy)) return;
    this.dropZone(event.pointerId, zone);
  };
  private zoneUp = (event: PointerEvent): void => {
    const zone = this.zones.get(event.pointerId);
    if (!zone) return;
    this.zones.delete(event.pointerId);
    if (zone.action === 'down') {
      this.pointers.delete(event.pointerId);
      this.releaseIfUnused('down');
      return;
    }
    const now = performance.now() / 1000;
    const dx = event.clientX - zone.x;
    const dy = event.clientY - zone.y;
    const elapsed = now - zone.time;
    const flick =
      elapsed <= flickTime &&
      (Math.abs(dx) >= flickDistance || dy >= flickDistance) &&
      Math.abs(dx) + dy > 0;
    this.pointers.delete(event.pointerId);
    if (zone.action) this.releaseIfUnused(zone.action);
    if (flick) this.actions.drop();
  };
  private zoneAction(clientX: number): string {
    const third = window.innerWidth / 3;
    if (clientX < third) return 'left';
    if (clientX >= third * 2) return 'right';
    return 'rotate';
  }
  private swapZoneAction(pointerId: number, zone: Zone, action: string): void {
    if (zone.action) this.releaseIfUnused(zone.action);
    zone.action = action;
    this.pointers.set(pointerId, action);
    this.press(action);
  }
  private dropZone(pointerId: number, zone: Zone): void {
    this.pointers.delete(pointerId);
    if (zone.action) this.releaseIfUnused(zone.action);
    zone.action = null;
    this.actions.drop();
  }
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
    this.zones.clear();
    this.horizontal = 0;
    this.actions.softDrop(false);
  };
  setZonesActive(active: boolean): void {
    this.zonesActive = active;
    if (!active) this.clear();
  }
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
    }
    document.removeEventListener('pointerdown', this.zoneDown, true);
    document.removeEventListener('pointermove', this.zoneMove, true);
    document.removeEventListener('pointerup', this.zoneUp, true);
    document.removeEventListener('pointercancel', this.zoneUp, true);
  }
}
