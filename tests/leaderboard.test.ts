import { afterEach, describe, expect, it, vi } from 'vitest';
import { LeaderboardPanel } from '../src/leaderboard-panel';
import {
  addLeaderboardEntry,
  boardEntries,
  loadLeaderboard,
  normalizePlayerName,
  saveLeaderboard,
  LEADERBOARD_STORAGE_KEY,
  type LeaderboardData,
  type LeaderboardEntry,
} from '../src/leaderboard';

function storage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(LEADERBOARD_STORAGE_KEY, initial);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
const empty = (): LeaderboardData => ({ playerName: 'PLAYER', entries: [] });
const entry = (id = 'first', score = 100): LeaderboardEntry => ({
  id,
  recordKey: 'pentris',
  difficulty: 'flow',
  name: 'Ada',
  score,
  lines: 2,
  level: 1,
  duration: 42.5,
  completedAt: 1000,
});

describe('local rankings', () => {
  it('merges other-tab runs before saving stale data or a player-name edit', () => {
    const device = storage();
    const stale = loadLeaderboard(device).data;
    saveLeaderboard(addLeaderboardEntry(empty(), entry('other-tab')), device);
    saveLeaderboard(addLeaderboardEntry(stale, entry('this-tab')), device);
    expect(loadLeaderboard(device).data.entries.map(({ id }) => id)).toEqual([
      'other-tab',
      'this-tab',
    ]);
    saveLeaderboard({ ...stale, playerName: 'Grace' }, device);
    expect(loadLeaderboard(device).data.playerName).toBe('Grace');
    expect(loadLeaderboard(device).data.entries).toHaveLength(2);
  });

  it.each([
    ['  Ada   Lovelace  ', 'Ada Lovelace'],
    ['', 'PLAYER'],
    ['  ', 'PLAYER'],
    [null, 'PLAYER'],
    ['12345678901234567890', '1234567890123456'],
    ['Ada\nLovelace', 'Ada Lovelace'],
  ])('normalizes player name %s to %s', (name, expected) => {
    expect(normalizePlayerName(name)).toBe(expected);
  });

  it('starts empty without inventing entries from existing personal bests', () => {
    const device = storage();
    device.setItem('polyphase.best.pentris.flow', '999999');
    expect(loadLeaderboard(device)).toEqual({ data: empty(), error: false });
  });

  it.each(['broken', 'null', '[]', '{"version":2,"entries":[]}', '{"version":1,"entries":null}'])(
    'recovers from corrupt storage %s',
    (raw) => {
      expect(loadLeaderboard(storage(raw))).toEqual({ data: empty(), error: true });
    },
  );

  it('round-trips names and full run details through injected storage', () => {
    const device = storage();
    const data = addLeaderboardEntry({ ...empty(), playerName: '  Ada  ' }, entry());
    expect(saveLeaderboard(data, device)).toBe(true);
    expect(loadLeaderboard(device)).toEqual({ data: { ...data, playerName: 'Ada' }, error: false });
  });

  it('retains only the top ten per board and pace without mutating callers', () => {
    let data = empty();
    const first = data;
    for (let index = 0; index < 14; index++)
      data = addLeaderboardEntry(data, entry(String(index), index));
    expect(first).toEqual(empty());
    expect(boardEntries(data, 'pentris', 'flow').map(({ score }) => score)).toEqual([
      13, 12, 11, 10, 9, 8, 7, 6, 5, 4,
    ]);
    data = addLeaderboardEntry(data, { ...entry('rush', 1), difficulty: 'rush' });
    data = addLeaderboardEntry(data, { ...entry('mix', 2), recordKey: 'fusion-3-5-6' });
    expect(boardEntries(data, 'pentris', 'rush')).toHaveLength(1);
    expect(boardEntries(data, 'fusion-3-5-6', 'flow')).toHaveLength(1);
    expect(boardEntries(data, 'fusion', 'flow')).toEqual([]);
  });

  it('orders ties by earlier completion, then stable id, regardless of insertion order', () => {
    const runs = [
      entry('z'),
      { ...entry('b'), completedAt: 900 },
      { ...entry('a'), completedAt: 900 },
    ];
    const forward = runs.reduce(addLeaderboardEntry, empty());
    const backward = [...runs].reverse().reduce(addLeaderboardEntry, empty());
    expect(boardEntries(forward, 'pentris', 'flow').map(({ id }) => id)).toEqual(['a', 'b', 'z']);
    expect(backward).toEqual(forward);
  });

  it('ignores duplicate completed-run ids and malformed entries', () => {
    const data = addLeaderboardEntry(empty(), entry());
    expect(addLeaderboardEntry(data, { ...entry(), score: 999 })).toEqual(data);
    for (const invalid of [
      { score: NaN },
      { score: Infinity },
      { score: -1 },
      { score: 1.5 },
      { lines: -1 },
      { level: 0 },
      { duration: Infinity },
      { duration: -1 },
      { completedAt: Infinity },
      { completedAt: 9e15 },
      { id: '' },
      { recordKey: 'unknown' },
      { recordKey: 'fusion-6-3' },
      { difficulty: 'other' },
    ])
      expect(
        addLeaderboardEntry(data, { ...entry('invalid'), ...invalid } as LeaderboardEntry),
      ).toEqual(data);
  });

  it('validates loaded entries, sorts and caps them instead of trusting stored data', () => {
    const runs = Array.from({ length: 15 }, (_, index) => entry(String(index), index));
    const loaded = loadLeaderboard(
      storage(
        JSON.stringify({
          version: 1,
          playerName: '  Ada ',
          entries: [...runs, runs[0], { ...entry('bad'), score: '99999' }],
        }),
      ),
    );
    expect(loaded.error).toBe(true);
    expect(loaded.data.playerName).toBe('Ada');
    expect(loaded.data.entries).toHaveLength(10);
    expect(loaded.data.entries[0].score).toBe(14);
  });

  it('reports blocked reads and writes while preserving usable in-memory data', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(loadLeaderboard(blocked)).toEqual({ data: empty(), error: true });
    const data = addLeaderboardEntry(empty(), entry());
    expect(saveLeaderboard(data, blocked)).toBe(false);
    expect(data.entries).toHaveLength(1);
  });
});

/** Only native DOM creation/events are substituted; public panel actions use real storage logic. */
class ElementBoundary {
  value = '';
  open = false;
  hidden = false;
  textContent = '';
  id = '';
  children: ElementBoundary[] = [];
  private elements = new Map<string, ElementBoundary>();
  private listeners = new Map<string, (event: { target: ElementBoundary }) => void>();
  setAttribute() {}
  append(element: ElementBoundary) {
    this.children.push(element);
  }
  replaceChildren(...elements: ElementBoundary[]) {
    this.children = elements;
  }
  querySelector(selector: string): ElementBoundary {
    const element = this.elements.get(selector) ?? new ElementBoundary();
    this.elements.set(selector, element);
    return element;
  }
  addEventListener(type: string, callback: (event: { target: ElementBoundary }) => void) {
    this.listeners.set(type, callback);
  }
  removeEventListener(type: string) {
    this.listeners.delete(type);
  }
  inputName(value: string) {
    const input = this.querySelector('#leaderboard-name');
    input.value = value;
    this.listeners.get('input')!({ target: input });
  }
  showModal() {
    this.open = true;
  }
  close() {
    this.open = false;
  }
  remove() {}
}

afterEach(() => vi.unstubAllGlobals());

function panelEnvironment() {
  const dialogs: ElementBoundary[] = [];
  vi.stubGlobal('document', {
    body: new ElementBoundary(),
    createElement(tag: string) {
      const element = new ElementBoundary();
      if (tag === 'dialog') dialogs.push(element);
      return element;
    },
  });
  return dialogs;
}

describe('leaderboard panel persistence', () => {
  it('keeps a first panel run when a stale second panel records and edits its name', () => {
    const dialogs = panelEnvironment();
    const device = storage();
    const callbacks = { onOpen() {}, onStorageError() {} };
    const first = new LeaderboardPanel(callbacks, device);
    const second = new LeaderboardPanel(callbacks, device);
    dialogs[0].inputName('Ada');
    first.recordRun(entry('first-panel'));
    second.recordRun(entry('second-panel'));
    dialogs[1].inputName('Grace');
    const saved = loadLeaderboard(device).data;
    expect(saved.playerName).toBe('Grace');
    expect(saved.entries.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: 'first-panel', name: 'Ada' },
      { id: 'second-panel', name: 'Ada' },
    ]);
    first.open('pentris', 'flow');
    expect(dialogs[0].querySelector('#leaderboard-name').value).toBe('Grace');
    first.dispose();
    second.dispose();
  });

  it('keeps unsaved entries and name when storage recovers after being blocked', () => {
    const dialogs = panelEnvironment();
    const device = storage();
    let blocked = true;
    const flaky = {
      getItem(key: string) {
        if (blocked) throw new Error('blocked');
        return device.getItem(key);
      },
      setItem(key: string, value: string) {
        if (blocked) throw new Error('blocked');
        device.setItem(key, value);
      },
    };
    const panel = new LeaderboardPanel({ onOpen() {}, onStorageError() {} }, flaky);
    dialogs[0].inputName('Ada');
    panel.recordRun(entry('unsaved'));
    blocked = false;
    panel.recordRun(entry('after-recovery'));
    const saved = loadLeaderboard(device).data;
    expect(saved.playerName).toBe('Ada');
    expect(saved.entries.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: 'after-recovery', name: 'Ada' },
      { id: 'unsaved', name: 'Ada' },
    ]);
    panel.dispose();
  });
});
