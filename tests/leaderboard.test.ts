import { describe, expect, it } from 'vitest';
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
