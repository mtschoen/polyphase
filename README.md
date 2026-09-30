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
- Fine, bright sparks and dust fan out on landing, with short trails on hard drops. White-hot clear beams and broad shockwaves burst beyond the board edges, with stronger screen shake for bigger clears. The landing guide stays readable through the effects.
- A GPU-rendered orbital halo, moving aurora, stars and drifting geometry.
- Three atmospheres: Eventide, Afterglow and Deep Blue, with matching original musical palettes.
- Procedural stereo music with a short folk hook, thumping layered kicks, sub-bass, offbeat hats and kick-driven pumping. Intensity responds to progress, combos and charge.
- Touch controls, fullscreen, local personal bests for each mode/pace, automatic pause when focus is lost, and reduced motion.
- Fonts, graphics and synthesized music and effects are bundled. No account, analytics or sampled recordings. Optional spoken callouts use an available browser voice.

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

Mode, pace and Fusion selection are locked during a run. Pause and choose **Back to frequencies** to start a different journey. Audio begins on the first play gesture. Controls and settings are also explained in the in-game help panel. Full effects are on by default, independent of the operating system preference. **Reduced motion** is an opt-in setting that suppresses animated particles and shake; an explicitly saved choice is respected. The **FULL FX / CALM FX** button below the board toggles it directly.

## Make some noise

| Lines | Callout         |
| ----- | --------------- |
| 1     | POP!            |
| 2     | DOUBLE TROUBLE! |
| 3     | TRIPLE THREAT!  |
| 4     | QUAD QUAKE!     |
| 5     | PENTACLYSM!     |
| 6     | HEXAGEDDON!     |

Each tier has its own original synthesized stinger, increasing sparks, shockwaves and screen shake. A line clear holds back the next piece for 0.36 seconds, plus 0.06 seconds per extra line, up to 0.66 seconds for six. This applies equally in Flow and Rush. Scoring happens immediately; the queue advances after the bright burst fades. Pausing freezes this gap, and taps during it do not accidentally drop or swap the next piece.

Most clear sparks live for roughly half a second, with a few faint embers lasting less than a second. Landing sparks stay small but bright enough to register, and ordinary placements have no entry delay. Larger clears briefly duck the music to give their stinger room.

Open **Settings → Try explosion** to preview any tier without changing your board or score. **Spoken clear callouts** can be switched off separately; speech is skipped when the browser has no suitable English voice. Mute and master volume also apply to the announcer.

## Familiar melody, unfamiliar steps

The traditional [Korobeiniki folk melody](https://commons.wikimedia.org/wiki/File:Korobeiniki.svg) is arranged anew as short, repeating hooks at 132 quarter notes per minute. Each size has its own rhythm: a one-beat pulse, duple call and answer, a three-beat waltz, a four-beat dance groove, Pentris in 5/4 grouped 3+2, and Sextris in 6/4 grouped 3+3. Monotris repeats after eight tiny bars; the other pure modes repeat after four bars.

Fusion changes meter at complete bar boundaries. A 3 + 5 + 6 mix cycles through 3/4, 5/4 and 6/4, advancing each size's own short phrase when it returns. The footer shows your selected meters; hover its label for tempo information.

A pitched kick body, deep sub sweep and short click drive every quarter beat. Open offbeat hats, claps, syncopated bass and a centered sine sub add weight. Each kick briefly ducks the melody and stereo echoes, then lets them swell back over 300 milliseconds for a pumping club feel. The drums retain their attack. The three atmospheres change key and timbre; progress increases intensity while the concise hook and stable harmony keep looping.

Development and verification commands are in [AGENTS.md](AGENTS.md). Test evidence and remaining verification limits are in [TEST-REPORT.md](TEST-REPORT.md).

Original artwork, synthesis, musical arrangement and game implementation. The melody is traditional; no game recording or modern game arrangement is reused. MIT license for this project. Three.js and bundled fonts retain their own licenses.
