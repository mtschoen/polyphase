import { PURE_MODES, type Difficulty } from './game/types';

export const LEADERBOARD_STORAGE_KEY = 'polyphase.leaderboard';
export const MAXIMUM_BOARD_ENTRIES = 10;

export interface LeaderboardStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LeaderboardEntry {
  id: string;
  recordKey: string;
  difficulty: Difficulty;
  name: string;
  score: number;
  lines: number;
  level: number;
  duration: number;
  completedAt: number;
}

export interface LeaderboardData {
  playerName: string;
  entries: LeaderboardEntry[];
}

export interface LeaderboardRun {
  id?: string;
  recordKey: string;
  difficulty: Difficulty;
  score: number;
  lines: number;
  level: number;
  duration: number;
  completedAt?: number;
}

export function normalizePlayerName(value: unknown): string {
  if (typeof value !== 'string') return 'PLAYER';
  const name = value.replace(/[\s\p{Cc}]+/gu, ' ').trim();
  return Array.from(name).slice(0, 16).join('') || 'PLAYER';
}

export function isLeaderboardKey(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value === 'fusion' || PURE_MODES.some(({ mode }) => mode === value)) return true;
  if (!/^fusion-[1-6](?:-[1-6])*$/.test(value)) return false;
  const sizes = value.slice(7).split('-').map(Number);
  return sizes.every((size, index) => index === 0 || size > sizes[index - 1]);
}

export function leaderboardLabel(recordKey: string): string {
  const mode = PURE_MODES.find(({ mode }) => mode === recordKey);
  if (mode) return mode.name;
  return `Fusion ${recordKey === 'fusion' ? '5 + 6' : recordKey.slice(7).replaceAll('-', ' + ')}`;
}

const compareText = (first: string, second: string): number =>
  first < second ? -1 : first > second ? 1 : 0;

function compareEntries(first: LeaderboardEntry, second: LeaderboardEntry): number {
  return (
    second.score - first.score ||
    first.completedAt - second.completedAt ||
    compareText(first.id, second.id)
  );
}

function validatedEntry(value: unknown): LeaderboardEntry | null {
  if (!value || typeof value !== 'object') return null;
  const entry = value as Partial<LeaderboardEntry>;
  if (
    typeof entry.id !== 'string' ||
    !entry.id.trim() ||
    entry.id.length > 100 ||
    !isLeaderboardKey(entry.recordKey) ||
    (entry.difficulty !== 'flow' && entry.difficulty !== 'rush') ||
    ![entry.score, entry.lines, entry.level].every(
      (number) => typeof number === 'number' && Number.isSafeInteger(number),
    ) ||
    entry.score! < 0 ||
    entry.lines! < 0 ||
    entry.level! < 1 ||
    typeof entry.duration !== 'number' ||
    !Number.isFinite(entry.duration) ||
    entry.duration < 0 ||
    typeof entry.completedAt !== 'number' ||
    !Number.isFinite(entry.completedAt) ||
    entry.completedAt < 0 ||
    entry.completedAt > 8.64e15
  )
    return null;
  return {
    id: entry.id,
    recordKey: entry.recordKey,
    difficulty: entry.difficulty,
    name: normalizePlayerName(entry.name),
    score: entry.score!,
    lines: entry.lines!,
    level: entry.level!,
    duration: entry.duration,
    completedAt: entry.completedAt,
  };
}

function rankedEntries(entries: readonly LeaderboardEntry[]): LeaderboardEntry[] {
  const boards = new Map<string, LeaderboardEntry[]>();
  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) continue;
    ids.add(entry.id);
    const key = `${entry.recordKey}.${entry.difficulty}`;
    const board = boards.get(key) ?? [];
    board.push(entry);
    boards.set(key, board);
  }
  return [...boards.entries()]
    .sort(([first], [second]) => compareText(first, second))
    .flatMap(([, board]) => board.sort(compareEntries).slice(0, MAXIMUM_BOARD_ENTRIES));
}

export function boardEntries(
  data: LeaderboardData,
  recordKey: string,
  difficulty: Difficulty,
): LeaderboardEntry[] {
  return data.entries
    .filter((entry) => entry.recordKey === recordKey && entry.difficulty === difficulty)
    .sort(compareEntries)
    .slice(0, MAXIMUM_BOARD_ENTRIES);
}

export function addLeaderboardEntry(
  data: LeaderboardData,
  candidate: LeaderboardEntry,
): LeaderboardData {
  const entry = validatedEntry(candidate);
  if (!entry || data.entries.some(({ id }) => id === entry.id)) return data;
  return {
    playerName: normalizePlayerName(data.playerName),
    entries: rankedEntries([...data.entries, entry]),
  };
}

/** Latest persisted copies win id collisions; explicit name edits can keep the local name. */
export function mergeLeaderboardData(
  current: LeaderboardData,
  latest: LeaderboardData,
  preservePlayerName = false,
): LeaderboardData {
  return {
    playerName: normalizePlayerName(preservePlayerName ? current.playerName : latest.playerName),
    entries: rankedEntries([...latest.entries, ...current.entries]),
  };
}

export function loadLeaderboard(storage?: LeaderboardStorage): {
  data: LeaderboardData;
  error: boolean;
} {
  const empty = { playerName: 'PLAYER', entries: [] };
  try {
    const raw = (storage ?? localStorage).getItem(LEADERBOARD_STORAGE_KEY);
    if (!raw) return { data: empty, error: false };
    if (raw.length > 1_000_000) return { data: empty, error: true };
    const value = JSON.parse(raw) as {
      version?: number;
      playerName?: unknown;
      entries?: unknown;
    } | null;
    if (!value || value.version !== 1 || !Array.isArray(value.entries))
      return { data: empty, error: true };
    const valid = value.entries
      .map(validatedEntry)
      .filter((entry): entry is LeaderboardEntry => entry !== null);
    const entries = rankedEntries(valid);
    return {
      data: { playerName: normalizePlayerName(value.playerName), entries },
      error:
        valid.length !== value.entries.length ||
        new Set(valid.map(({ id }) => id)).size !== valid.length,
    };
  } catch {
    return { data: empty, error: true };
  }
}

export function saveLeaderboard(data: LeaderboardData, storage?: LeaderboardStorage): boolean {
  try {
    const entries = data.entries
      .map(validatedEntry)
      .filter((entry): entry is LeaderboardEntry => entry !== null);
    const latest = loadLeaderboard(storage);
    const merged = mergeLeaderboardData({ ...data, entries }, latest.data, true);
    (storage ?? localStorage).setItem(
      LEADERBOARD_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        playerName: merged.playerName,
        entries: merged.entries,
      }),
    );
    return true;
  } catch {
    return false;
  }
}
