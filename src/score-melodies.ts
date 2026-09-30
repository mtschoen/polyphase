type MelodyEvent = readonly [note: number, eighths: number];
// First four approved Korobeiniki bars form the complete repeating hook.
// Source: https://commons.wikimedia.org/wiki/File:Korobeiniki.svg (public-domain folk score).
const FIVE_MELODY: readonly (readonly MelodyEvent[])[] = [
  [
    [76, 2],
    [71, 1],
    [72, 1],
    [74, 2],
    [72, 1],
    [71, 1],
    [69, 2],
  ],
  [
    [69, 2],
    [72, 1],
    [76, 1],
    [74, 2],
    [72, 1],
    [71, 1],
    [72, 2],
  ],
  [
    [74, 2],
    [76, 2],
    [72, 2],
    [69, 2],
    [69, 2],
  ],
  [
    [74, 3],
    [77, 1],
    [81, 2],
    [79, 1],
    [77, 1],
    [76, 2],
  ],
];

const FOLK_NOTES = FIVE_MELODY.flatMap((bar) => bar.map(([note]) => note));
const RHYTHMS: Record<number, readonly (readonly number[])[]> = {
  1: [[2]],
  2: [
    [3, 1],
    [1, 1, 2],
  ],
  3: [[2, 1, 1, 2]],
  4: [[2, 1, 1, 2, 1, 1]],
  6: [[2, 2, 2, 2, 2, 2]],
};

function rephrase(size: number): readonly (readonly MelodyEvent[])[] {
  let noteIndex = 0;
  const rhythms = RHYTHMS[size];
  return Array.from({ length: size === 1 ? 8 : 4 }, (_, bar) =>
    rhythms[bar % rhythms.length].map((eighths): MelodyEvent => [
      FOLK_NOTES[noteIndex++ % FOLK_NOTES.length],
      eighths,
    ]),
  );
}

const ARRANGEMENTS: Record<number, readonly (readonly MelodyEvent[])[]> = {
  1: rephrase(1),
  2: rephrase(2),
  3: rephrase(3),
  4: rephrase(4),
  5: FIVE_MELODY,
  6: rephrase(6),
};

/** Each count reshapes the same short folk hook into complete bars of its own meter. */
export function melodyForBar(pieceSize: number, bar: number): readonly MelodyEvent[] {
  const arrangement = ARRANGEMENTS[pieceSize];
  return arrangement[bar % arrangement.length];
}
