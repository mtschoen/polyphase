# POLYPHASE

**A familiar rhythm. A whole new dimension.**

An original falling-block arcade with every piece size from one to six squares, custom Fusion mixes, and a folk soundtrack that changes meter with your pieces.

**[Play Polyphase](https://mtschoen.github.io/polyphase/)** on desktop or phone. No installation or account required. Use headphones for the original adaptive soundtrack.

To run locally, double-click **PLAY.bat**, then open [the local game](http://127.0.0.1:5173).

For a phone on the same local network, launch **PLAY-ON-PHONE.bat** (or `npm run dev:lan`) and open the printed **Network** address in its browser. Keep the computer and server running. During play, the board and large touch controls fit portrait or landscape; you can hold a direction while using another finger to rotate or drop. Audio starts with your first play gesture.

During phone play, the bright **Pause / Resume** button stays above the board. The bottom music bar shows the current track and keeps all three atmosphere buttons within reach, so you can change the music and mood without pausing. It stays anchored during screen shake.

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
- Glowing sparks, white-hot centers, shards and dust fan out on landing, with short trails on hard drops. Clear beams and broad shockwaves burst beyond the board edges, with stronger screen shake for bigger clears. The landing guide stays readable through the effects.
- A GPU-rendered orbital halo, moving aurora, stars and drifting geometry.
- Three atmospheres: Eventide, Afterglow and Deep Blue, with matching original musical palettes.
- Procedural stereo music with a short folk hook, thumping layered kicks, sub-bass, offbeat hats and kick-driven pumping. Intensity responds to progress, combos and charge.
- Multitouch controls, fullscreen, local rankings and personal bests for each mix/pace, automatic pause when focus is lost, and reduced motion.
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

## Your leaderboard

Open the trophy button or **View leaderboard** after a game. Set your player name and browse the best ten completed runs for each pure mode or custom Fusion mix, separately for Flow and Rush. Rankings include score, lines, level, duration and date. The name selected when a run ends is saved with that run; previous names stay unchanged. Opening the leaderboard pauses active play.

Rankings are stored in this browser on this device. They do not sync between computers, phones or different site addresses, and clearing site data removes them. Existing personal-best numbers remain available, but only newly completed runs populate the leaderboard. If storage is unavailable, rankings remain usable for the current session.

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

Bright clear sparks fade before the next piece enters, with a few faint embers lasting less than a second. Landing sparks retain their glow for roughly 0.65 to 1 second, and ordinary placements have no entry delay. A clear replaces the preceding landing spray so the two bursts do not obscure the next piece. Larger clears briefly duck the music to give their stinger room.

**Settings → More juice** has independent particle density, particle size and screen shake sliders from **0% to 300%**. The tuned mix (previously 60% density, 60% size and 175% shake) is now **100%** on each slider. That saved mix keeps the same feel. Reset juice returns to these defaults. Zero density or size removes sparks and drop trails; zero shake stops camera movement. Reduced motion overrides effects while retaining your choices.

Above 100% particle size, the effects layer lowers its sampling resolution to limit the cost of oversized glows. Particle counts, on-screen sizes, brightness and lifetimes stay the same, and the board and text remain sharp. Very large effects are slightly softer. Default-size rendering is unchanged.

Enter **Up, Up, Down, Down, Left, Right, Left, Right, B, A** outside an input to unlock the hidden **Juice lab**. Its sliders stay synchronized with Settings, and **Try landing** and **Try explosion** can be clicked repeatedly without reopening a menu. Choose any of the six clear tiers. Opening the lab pauses an active run; previews preserve your board and score. Close it with its X or Escape, then enter the code again to reopen it. Reloading hides the lab.

Movement, rotation, soft drop, hard drop, landing and hold each have a distinct synthesized cue. Successful manual soft-drop steps tick; gravity and blocked drops stay silent. **Spoken clear callouts** can be switched off separately; speech is skipped when the browser has no suitable English voice. Mute and master volume also apply to the announcer.

## Familiar melody, unfamiliar steps

The traditional [Korobeiniki folk melody](https://commons.wikimedia.org/wiki/File:Korobeiniki.svg) is arranged anew as short, repeating hooks at 132 quarter notes per minute. Each size has its own rhythm: a one-beat pulse, duple call and answer, a three-beat waltz, a four-beat dance groove, Pentris in 5/4 grouped 3+2, and Sextris in 6/4 grouped 3+3. Monotris repeats after eight tiny bars; the other pure modes repeat after four bars.

Fusion changes meter at complete bar boundaries. A 3 + 5 + 6 mix cycles through 3/4, 5/4 and 6/4, advancing each size's own short phrase when it returns. The footer shows your selected meters; hover its label for tempo information.

A pitched kick body, deep sub sweep and short click drive every quarter beat. Open offbeat hats, claps, syncopated bass and a centered sine sub add weight. Each kick briefly ducks the melody and stereo echoes, then lets them swell back over 300 milliseconds for a pumping club feel. The drums retain their attack. The three atmospheres change key and timbre; progress increases intensity while the concise hook and stable harmony keep looping.

Music and synthesized effects receive a 50% output boost after compression, including when your saved master volume is already at 100%. The master slider and mute still control the full mix.

Development and verification commands are in [AGENTS.md](AGENTS.md). Test evidence and remaining verification limits are in [TEST-REPORT.md](TEST-REPORT.md).

Source lives at [mtschoen/polyphase](https://github.com/mtschoen/polyphase). Pushes to `main` run lint, formatting, unit coverage and the production build before GitHub Actions deploys to Pages. `npm run build:pages` sets the `/polyphase/` asset prefix; `npm run preview -- --base=/polyphase/` previews that build locally.

### Preview a PR or branch online

Same-repository PRs targeting `main` automatically publish at
`https://mtschoen.github.io/polyphase/pr-preview/pr-N/` (replace `N` with the PR number).
New commits update that URL; closing or merging the PR removes it. The preview uses
the PR's exact head commit, so it does not require merging first. Fork PRs are skipped.

For an existing PR or any branch, open
[Actions > Publish Polyphase](https://github.com/mtschoen/polyphase/actions/workflows/pages.yml),
choose **Run workflow**, leave **Use workflow from** set to **main**, and enter the PR
number (such as `4`) or branch name in **preview**. The completed run's **deploy**
summary contains the link. Branch previews use a stable name plus a hash under
`branch-preview/`; rerun the form to refresh them, or select **remove** to delete one.
An empty preview field republishes production while preserving existing previews.

Production and previews share one Pages site. The workflow always builds production
from `main`, preserves other previews on the generated `gh-pages` branch, and publishes
one combined artifact. Keep Pages set to **GitHub Actions** and keep the `github-pages`
environment restricted to `main`. A separate environment name does not isolate a Pages
deployment. Preview code builds in read-only jobs without secrets, saved credentials
or shared caches; the publishing jobs only handle static files. Browser settings and
local scores share the site's origin, so previews can see the same local storage.

Original artwork, synthesis, musical arrangement and game implementation. The melody is traditional; no game recording or modern game arrangement is reused. MIT license for this project. Three.js and bundled fonts retain their own licenses.

## How it was made

The first playable version came largely from a one-shot prompt, then evolved through roughly four hours of playtesting and refinement in a single Codex session using GPT-6-astra in fast mode. Human feedback drove the music, particles, screen shake, game modes and mobile controls, with eight subagents working in parallel and six context compactions in the main thread. By the release wrap, combined main-thread and subagent usage totaled about 139.5 million input tokens (135.5 million cached) and 660,000 output tokens, including reasoning. Subagents accounted for 69.9 million input and 339,000 output tokens within those totals. These are cumulative counts, including repeated context, summed from each thread's own usage records without double-counting responses.
