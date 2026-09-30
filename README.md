# POLYPHASE

**A familiar rhythm. A whole new dimension.**

An original falling-block arcade with every piece size from one to six squares, custom Fusion mixes, and a folk soundtrack that changes meter with your pieces.

Double-click **PLAY.bat**, then choose your frequency. With the local server running, open [Polyphase](http://127.0.0.1:5173). Use headphones for the original adaptive soundtrack.

## Choose your pieces

| Mode     | Squares per piece | Playable shapes   | Board                          |
| -------- | ----------------- | ----------------- | ------------------------------ |
| Monotris | 1                 | 1                 | 8 × 22                         |
| Ditris   | 2                 | 1                 | 8 × 22                         |
| Tritris  | 3                 | 2                 | 10 × 22                        |
| Tetris   | 4                 | 7                 | 10 × 22                        |
| Pentris  | 5                 | 18                | 12 × 22                        |
| Sextris  | 6                 | 60                | 14 × 22                        |
| Fusion   | Your selection    | Selected catalogs | Fits the largest selected size |

Choose Fusion, then toggle any combination of the six size buttons. For example, select 3, 5 and 6 to mix only those sizes. Each selected size appears once per shuffled size cycle, with independent shuffled shape bags. A single selected size is allowed; the final selected size cannot be removed. Your mix is saved, with personal bests separated by mix and pace.

Every shape can rotate. Mirror-distinct variants are separate bag entries, including all seven familiar four-square pieces. The [one-sided polyomino counts](https://oeis.org/A000988/list) give 89 playable shapes across the six sizes. The underlying free-shape generator still deduplicates reflection before the playable catalog adds the missing mirror variants.

Choose **Flow** for a gentle start or **Rush** for faster gravity. Every ten cleared lines increases the level. Chain line clears for combo bonuses. Fill your **Resonance** meter through placements and clears, then press Enter to dissolve the bottom four rows and give yourself breathing room.

## Feel every placement

- Luminous beveled blocks, landing guide, hold slot and four upcoming pieces.
- Bright sparks, glowing trails and rotating shards on every placement. Hard drops, clearing beams and shockwaves burst beyond the board edges.
- A GPU-rendered orbital halo, moving aurora, stars and drifting geometry.
- Three atmospheres: Eventide, Afterglow and Deep Blue, with matching original musical palettes.
- Procedural stereo music with a recognizable folk lead, bass, percussion, countermelody and harmonized effects. Intensity responds to progress, combos and charge.
- Touch controls, fullscreen, local personal bests for each mode/pace, automatic pause when focus is lost, and reduced motion.
- Fonts, graphics and sound are local. No account, analytics, samples or runtime downloads.

## Controls

| Action                  | Keyboard              |
| ----------------------- | --------------------- |
| Move                    | Left / Right or A / D |
| Rotate clockwise        | Up, X or E            |
| Rotate counterclockwise | Z or Q                |
| Soft drop               | Down or S             |
| Hard drop               | Space                 |
| Hold / swap             | C or Shift            |
| Resonance               | Enter                 |
| Pause / resume          | P or Escape           |
| Mute / fullscreen       | M / F                 |

Mode, pace and Fusion selection are locked during a run. Pause and choose **Back to frequencies** to start a different journey. Audio begins on the first play gesture. Controls and settings are also explained in the in-game help panel. Reduced Motion suppresses animated particles and shake.

## Familiar melody, unfamiliar steps

The traditional [Korobeiniki folk melody](https://commons.wikimedia.org/wiki/File:Korobeiniki.svg) is arranged anew for this game. Pentris has a 5/4 pulse grouped 3+2 at 132 quarter notes per minute. Sextris swings in 6/8 at 96 dotted quarters per minute. Sizes one through four use their corresponding quarter-note meters. Fusion cycles the selected meters at complete bar boundaries, so a 3 + 5 + 6 mix moves through 3/4, 5/4 and 6/8 while the melody continues.

The three atmospheres change key and timbre. Progress adds octave lifts, rhythmic fills and a broken-chord answer. The footer shows the selected meters; hover its label for tempo information.

Development and verification commands are in [AGENTS.md](AGENTS.md). Test evidence and remaining verification limits are in [TEST-REPORT.md](TEST-REPORT.md).

Original artwork, synthesis, musical arrangement and game implementation. The melody is traditional; no game recording or modern game arrangement is reused. MIT license for this project. Three.js and bundled fonts retain their own licenses.
