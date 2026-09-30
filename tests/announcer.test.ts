import { afterEach, describe, expect, it, vi } from 'vitest';
import { Announcer } from '../src/announcer';

afterEach(() => vi.unstubAllGlobals());

describe('optional clear announcer', () => {
  it('speaks only the latest clear name using the chosen English voice and player volume', () => {
    const queued: SpeechSynthesisUtterance[] = [];
    const english = { lang: 'en-US', default: true, localService: true } as SpeechSynthesisVoice;
    vi.stubGlobal('speechSynthesis', {
      getVoices: () => [{ lang: 'fr-FR' }, english],
      speak: (utterance: SpeechSynthesisUtterance) => queued.push(utterance),
      cancel: () => queued.splice(0),
    });
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        constructor(public text: string) {}
      },
    );
    const announcer = new Announcer();
    announcer.setEnabled(true);
    announcer.setVolume(0.4);
    announcer.announce(2);
    announcer.announce(6);
    expect(queued.map((utterance) => utterance.text)).toEqual(['HEXAGEDDON!']);
    expect(queued[0].voice).toBe(english);
    expect(queued[0].volume).toBe(0.4);
    announcer.setMuted(true);
    expect(queued).toEqual([]);
    announcer.announce(3);
    expect(queued).toEqual([]);
    announcer.setMuted(false);
    announcer.announce(1);
    expect(queued[0].text).toBe('POP!');
    announcer.setEnabled(false);
    announcer.announce(4);
    expect(queued).toEqual([]);
    announcer.setEnabled(true);
    announcer.setVolume(0);
    announcer.announce(5);
    expect(queued).toEqual([]);
    announcer.dispose();
    announcer.setVolume(1);
    announcer.announce(6);
    expect(queued).toEqual([]);
  });

  it('silently skips unsupported platforms and empty voice lists', () => {
    vi.stubGlobal('speechSynthesis', undefined);
    vi.stubGlobal('SpeechSynthesisUtterance', undefined);
    const unavailable = new Announcer();
    unavailable.setEnabled(true);
    expect(() => unavailable.announce(6)).not.toThrow();
    unavailable.dispose();
    const queued: unknown[] = [];
    vi.stubGlobal('speechSynthesis', {
      getVoices: () => [],
      speak: (utterance: unknown) => queued.push(utterance),
      cancel: () => queued.splice(0),
    });
    vi.stubGlobal('SpeechSynthesisUtterance', class {});
    const empty = new Announcer();
    empty.setEnabled(true);
    empty.announce(5);
    expect(queued).toEqual([]);
    empty.cancel();
    empty.dispose();
  });
});
