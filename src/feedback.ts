import { getClearTier } from './clear-tiers';
import type { GameEvent } from './game/types';
import type { BoardRenderer } from './renderer';
import type { Universe } from './universe';
import type { AudioEngine } from './audio';

interface ClearAnnouncer {
  announce(lines: number): void;
  cancel(): void;
}

export class GameFeedback {
  private callout = document.querySelector<HTMLElement>('#callout')!;
  private expires = 0;
  private priority = 0;

  constructor(
    private renderer: BoardRenderer,
    private universe: Universe,
    private audio: AudioEngine,
    private announcer: ClearAnnouncer,
  ) {}

  handle(events: readonly GameEvent[], width: number, now: number, announce = true): void {
    const clear = events.find((event) => event.type === 'clear');
    for (const event of events) {
      this.renderer.handle(event, width);
      if (!(clear && event.type === 'level'))
        this.audio.effect(event.type, event.amount ?? event.distance);
      if (event.type === 'clear') {
        const tier = getClearTier(event.amount ?? event.rows?.length ?? 1);
        this.universe.burst(0.25 + tier.power * 0.125);
        this.show(
          tier.label,
          `${tier.lines} ${tier.lines === 1 ? 'LINE' : 'LINES'} CLEARED`,
          tier.accent,
          tier.lines,
          now,
          tier.duration,
        );
        if (announce) this.announcer.announce(tier.lines);
      } else if (event.type === 'resonance') {
        this.universe.burst(1);
        this.show('RESONANCE', 'MAKE SOME SPACE', '#78e6c2', 7, now, 1.4);
      } else if (event.type === 'level' && !clear && now >= this.expires) {
        this.universe.burst(0.4);
        this.show('LEVEL UP', 'FIND YOUR NEXT RHYTHM', '#78e6c2', 0, now, 1.2);
      }
    }
    this.update(now);
  }

  preview(lines: number, width: number, height: number, now: number): void {
    const tier = getClearTier(lines);
    const rows = Array.from({ length: tier.lines }, (_, index) => height - tier.lines + index);
    const cells = rows.flatMap((y) =>
      Array.from({ length: width }, (_, x) => ({ x, y, color: tier.lines - 1 })),
    );
    this.handle([{ type: 'clear', amount: tier.lines, rows, cells }], width, now);
  }

  previewLanding(width: number, height: number, now: number): void {
    const left = Math.floor((width - 5) / 2);
    const cells = Array.from({ length: 5 }, (_, index) => ({
      x: left + index,
      y: height - 1,
      color: 0,
    }));
    this.handle([{ type: 'lock', cells }], width, now, false);
  }

  update(now: number): void {
    if (now >= this.expires) {
      this.callout.classList.remove('visible');
      this.priority = 0;
    }
  }

  reset(): void {
    this.expires = 0;
    this.priority = 0;
    this.callout.classList.remove('visible');
    this.announcer.cancel();
  }

  private show(
    label: string,
    caption: string,
    accent: string,
    priority: number,
    now: number,
    duration: number,
  ): void {
    if (priority < this.priority && now < this.expires) return;
    const title = document.createElement('strong');
    title.textContent = label;
    const subtitle = document.createElement('small');
    subtitle.textContent = caption;
    this.callout.replaceChildren(title, subtitle);
    this.callout.style.setProperty('--clear-accent', accent);
    this.callout.dataset.tier = String(priority);
    this.callout.classList.add('visible');
    this.priority = priority;
    this.expires = now + duration * 1000;
  }
}
