# Runtime verification

Run `npm run build` and start `npm run dev` in a second terminal. Browser checks expect the local server at http://127.0.0.1:5173.

On a fresh development machine, install the test browser with `npx playwright install chromium`.
An existing compatible Chromium executable can be selected with the `POLYPHASE_BROWSER` environment variable.

- `node tests/browser-smoke.mjs`: full effects by default even with an OS reduced-motion preference, all six named previews without score changes, GPU startup, focused-button keyboard behavior, retained page lifecycle, all seven game modes, custom 3+5+6 Fusion, nonempty selection, movement/rotation/hold/drop, pause/resume, top-out, separate mix records, settings persistence and mobile controls. Spoken callouts are disabled through Settings before automated previews to keep OS speech quiet.
- `node tests/media-smoke.mjs`: native Web Audio output for every pure meter and a custom mix; mute silence and theme/effect graph exercise. An OfflineAudioContext probe isolates the melodic bus and measures its gain dip and recovery across two kicks. The particle helper checks a substantial early landing footprint and sustained sparks after the first flash, drop trails, isolated clear and Resonance bursts, layering, expiration, reset, disposal and reduced motion. Real legal one-through-six-line clears in both Flow and Rush verify delayed entry, an unchanged queue during the gap, next-piece spawning after the burst, increasing explosions beyond the well, tier labels, audio cues and expiry. Same-frame level changes cannot overwrite the clear, and paused gameplay does not announce pending clears. Inspect composited screenshots as well as canvas pixels.
- `npm run coverage`: deterministic rules tests and honest full-source unit coverage.
- `npm run lint` and `npm run format:check`: static and formatting checks.
- `node tests/mobile-smoke.mjs`: native Chromium touch emulation at 320x568, 390x844 and 844x390; visible board, no horizontal overflow, 44-pixel minimum control targets, movement/rotation/hold/drop, pause/resume, leaderboard fit and simultaneous pointer handling. Set `POLYPHASE_URL` to the LAN URL printed by `npm run dev:lan` to exercise the phone-serving path. The touch fixture is served normally to preserve Chromium's private-network address-space classification.
- `node tests/release-smoke.mjs`: checks the built game without source imports. First run `npm run build:pages` and `npm run preview -- --base=/polyphase/`, or set `POLYPHASE_URL=https://mtschoen.github.io/polyphase/` for the deployed site. Desktop and phone probes verify assets/favicon, WebGL startup, gameplay, mood switching, pause, saved rankings and the desktop Konami code.

The browser harnesses close their isolated browsers. Screenshots and runtime results are written under ignored `artifacts/`. Inspect desktop and mobile screenshots after layout changes. Perceived musical quality and game feel still benefit from human playtesting with headphones.

Hosted previews: run `Publish Polyphase` from `main` with `preview=4` (or another PR
number/branch). Check the completed deployment summary for its URL. Run the revision's
`tests/release-smoke.mjs` with `POLYPHASE_URL` pointing to that URL, then check production
separately. Compare each URL's `deployed-version.json` with the expected source commit.
After another production deployment, confirm the preview still works; remove a manual
branch preview with the workflow's `remove` checkbox and verify that production and
other previews survive. PR closure removes that PR's preview. Keep environment
protection restricted to `main`; never deploy a standalone preview artifact to Pages.

Mobile release checks also assert visible Pause/Resume labels, 44-pixel atmosphere targets, mood changes without pausing, no controls obscured by the music bar, and stable dock geometry while the game surface shakes. Inspect `mobile-play-*.png` and `release-*.png` after changes to this layout. Hardware-backed Chrome is the verified production browser; a software-only legacy Chromium headless shell may lose its WebGL context while initializing the production bundle.

The media harness also measures final output after compression at 100% master volume. Paired offline renders compare unity output against the production boost for all six sizes and three themes, overlapping opening music with a six-line clear. They verify the 1.5x signal increase and peak headroom without evicting scheduled voices.

Impact controls: `tests/impact-options-checks.mjs` runs inside the browser harness, checking fresh 100% defaults, the saved 60/60/175 mix, normalized 0-300% endpoints, keyboard control, persistence, reset and reduced motion. `tests/juice-lab-checks.mjs` verifies the hidden Konami panel, wrong-code rejection, repeated landing previews, synchronized Settings controls, pause behavior, native keyboard actions, closing/reopening, reload hiding and desktop/mobile fit. The main harness previews all six clear tiers without reopening the panel. Inspect `polyphase-juice-lab.png` and its mobile counterpart in `artifacts/`.

Action cues: `tests/action-audio-checks.mjs` runs inside the media harness. Native offline renders exercise movement, rotation, soft drop, hard drop, lock and hold in all three themes, both alone and against identical energetic music. They measure each cue's signal contribution and finite full-volume peak headroom.

Rankings: the browser harness records actual completed games in all seven modes, including custom Fusion, verifies each score is saved once and reproduces a same-turn topout/restart. `tests/leaderboard-checks.mjs` also exercises player names as text, filters, persistence, duplicate IDs, blocked storage and the non-secure HTTP UUID fallback. Unit checks cover stale-tab merges and storage recovery. Inspect `polyphase-leaderboard.png` and `mobile-leaderboard-*.png`.

Performance: `node tests/particle-benchmark.mjs current` runs a manual native particle benchmark, with completed raster-work timings, frame cadence, an empty-frame baseline and visible-particle checks. It uses `POLYPHASE_BROWSER` and `POLYPHASE_URL`; optional `POLYPHASE_BENCHMARK_SCENE=landing`, `POLYPHASE_BENCHMARK_DENSITY=100` and `POLYPHASE_BENCHMARK_DPR=2` narrow the scenario. `POLYPHASE_BENCHMARK_SOURCE` selects an alternate served effects module for a before/after comparison. Run benchmarks alone to avoid GPU contention. Results are measurements, not timing assertions or CI gates. Physical phones and Safari still require device testing.
