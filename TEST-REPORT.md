# Polyphase verification

Verified on 2026-09-30 against `0951cf4` plus the accompanying integration changes: restored landing glow, independent impact sliders, tuned percentages, stronger action cues and a hidden Konami Juice lab. Audio, visual rendering, normalization and panel integration received independent reviews. Coverage is best effort for an existing application with browser-driven modules; unit line coverage is 51.85%, down from 53.01% as the new UI adds browser-tested code outside the unit harness. Native browser checks are reported separately, not counted as unit coverage.

## Results

| Check                                | Result                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------- |
| TypeScript and production build      | Passed (`npm run build`)                                                |
| ESLint                               | Passed (`npm run lint`)                                                 |
| Prettier                             | Passed after formatting integrated files                                |
| Unit tests                           | 183 passed across ten test files                                        |
| Browser playthrough                  | All seven modes and custom 3+5+6 Fusion passed; no browser errors       |
| Native Web Audio and rendering smoke | Passed: 18 action/theme cases, pumping, output boost and 12 real clears |
| Independent code review              | Visuals, action cues, normalization and hidden panel reviewed           |

Browser checks covered movement, rotation, hold, hard drop, pause/resume, top-out, personal records and return to menu. Custom Fusion selection persisted across reload, rejected an empty selection, locked during play, changed the board size and meter label, and saved its own personal best. Settings, themes and mute also persisted. Focused native controls retained Space/Enter behavior, and a persisted page-hide event retained the renderer. The 390 by 844 layout had no horizontal overflow and usable touch controls. Desktop and mobile screenshots were inspected, including the 6/4 label and visible landing sparks.

New checks verified all impact defaults read 100%, every range spans 0-300%, and the saved raw 60/60/175 mix retains its values while reading 100/100/100. Keyboard endpoints, reset, reload persistence and reduced-motion disabling passed. The hidden lab rejected an incorrect code, opened with the full Konami sequence, stayed visible through repeated previews, synchronized sliders both ways with Settings, paused an active run, preserved native control behavior, closed with Escape or its button, reopened by code, and hid after reload. Desktop/mobile panel screenshots were inspected. Existing higher values are clamped to the new requested maxima.

## Music and sound

The audio harness uses native AudioContext and an analyser. It observed nonzero music output for each pure size and custom 3+5+6, nonzero effect output, and silence after mute. A native OfflineAudioContext probe measured the melodic bus around two kicks: RMS fell from 0.707 to 0.152 on each kick and recovered to 0.702 and 0.709 between kicks. This verifies actual gain automation through the browser's audio graph, with finite output samples.

The live analyser now taps final output after compression at 100% volume. Paired offline renders with deterministic noise verified a 1.5x RMS increase for all six sizes and three themes. These overlap dense opening music with Hexageddon at full volume and high intensity; final peaks were approximately 0.42 to 0.45, below clipping. Each probe retained 34 voices, avoiding the scheduling cap. This checks representative impact overlap, not every possible complete track or effect combination.

Deterministic music tests verify exact short-loop repetition, stable harmony, meter-specific accents, whole-bar Fusion transitions, per-size phrase progress, 132-quarter-note tempo, bass register and theme changes. Monotris repeats eight one-beat bars; sizes two through six repeat four bars. Six-cell music uses six quarter beats, grouped 3+3. Independent full-arrangement scheduling probes across modes, themes and low/high energy found at most 24 scheduled music voices, including the layered kick, below the 48-voice limit.

Audio graph tests cover melodic and echo routing through the pump, percussion bypass, pause/mute/volume/mode/theme reset, stinger ducking and disposal. A regression removes `cancelAndHoldAtTime` from the fake AudioParam to verify the portable automation path. Announcer tests cover voice choice, mute, volume, cancellation and disposal; speech availability and pronunciation depend on browser voices.

Movement, rotation, soft drop, hard drop, lock and hold were rendered individually and over identical seeded energetic music in all three themes. All 18 action/theme cases produced finite samples, measurable isolated output and a measurable contribution to the music. The largest mixed peak was 0.5813 at full volume, below clipping; the smallest isolated RMS was 0.001770. Deterministic tests cover successful manual soft-drop emission, silent blocked/gravity steps, per-action cooldowns, mute and disposal.

## Particles and clear timing

The isolated effects layer produced 4,545 visible landing pixels at 0.05 seconds and 9,110 after approximately 0.167 seconds with the tuned defaults. Drop trails, isolated clears, Resonance, layering, pointer transparency, expiry, reset, disposal and reduced motion passed. Deterministic tests verify independent density, size and shake scaling; zero size/density remove existing sparks and trails and prevent new allocation; zero shake immediately clears transforms; retained particles stay bounded at 8,000.

Real legal one-through-six-line clears were exercised in both Flow and Rush. Every case held the queue and active piece during its 0.36 to 0.66 second entry gap, then spawned the expected next piece. Simulation time was advanced explicitly. Clear bursts increased from approximately 20,796 visible pixels for one line to 123,271 for six in Flow; Rush measured approximately 20,538 to 125,437. Fewer than 1% of peak visible pixels remained when the next piece entered, and all effects had expired by 1.5 simulated seconds. Labels and sound cues matched their tiers; same-frame level changes did not replace the clear, and pending gameplay clears did not announce while paused. Clears replace the preceding landing spray and fade their main glow before entry.

The UI harness confirmed full effects on fresh settings even when the OS requests reduced motion, plus all six named previews without score changes. Explicitly saved reduced motion remained respected. Automated previews disable spoken callouts through Settings to keep OS speech quiet. Composited landing, single-clear, six-clear and next-piece screenshots were inspected.

Reproduction commands are in [SMOKE.md](SMOKE.md). Generated screenshots and logs are in the ignored `artifacts/` directory.

## Unit coverage

The final integration run measured every production TypeScript file after the hidden panel and normalized defaults. Browser smoke tests are separate and do not contribute to these coverage figures.

| Scope                          | Statements | Branches | Functions | Lines  |
| ------------------------------ | ---------- | -------- | --------- | ------ |
| All production source          | 51.29%     | 55.61%   | 50.15%    | 51.85% |
| Rules, shapes and shared types | 100%       | 99.32%   | 100%      | 100%   |
| Musical score                  | 100%       | 90.47%   | 100%      | 100%   |
| Melody data and dance groove   | 100%       | 100%     | 100%      | 100%   |
| Club kick and pump             | 100%       | 100%     | 100%      | 100%   |
| Audio engine                   | 89.05%     | 81.42%   | 87.50%    | 93.69% |
| Clear tiers                    | 100%       | 100%     | 100%      | 100%   |
| Gameplay effects               | 96.66%     | 89.92%   | 95.23%    | 96.88% |
| Announcer                      | 95.12%     | 88%      | 90%       | 97.05% |
| Settings persistence           | 52.63%     | 82.14%   | 60%       | 52.63% |
| Impact normalization           | 100%       | 100%     | 100%      | 100%   |

The remaining core branch is the defensive active-piece guard during Resonance. UI, the Juice lab, feedback coordination and rendering use native Chromium integration checks and have no unit coverage. Persistence and older sound-effect paths have partial unit coverage plus native checks. This is not a claim of full application coverage. Reports are in `coverage/`.

## Static review and limits

The full Aislop pass scored 94 with zero errors and four warnings. Two repeated action-cue literals were replaced with named constants; their focused follow-up scored 100. The final changed-source follow-up scored 97, with a non-mechanical 447-line main-module advisory. The 481-line audio module also retains its size advisory. The kick's two oscillator configurations were flagged as duplicate blocks; these are intentionally distinct body and sub layers with different pitch, duration, envelope, gain and filtering, so the explicit calls were retained. Arrow glyphs in controls/documentation and punctuation emitted by the scanner in its own ignored log remain informational findings. No rules or thresholds were disabled. The security engine reported no issues.

Vite retains its size advisory for the Three.js chunk (about 533 KB before compression, 133 KB gzip). The application chunk is about 77 KB before compression.

Verification used Chromium on Windows. Firefox, Safari, physical touch input, subjective speaker/headphone quality and the Windows double-click launcher were not independently exercised. The launcher's underlying development-server command was exercised successfully. Music was verified structurally and through real audio output, not by a subjective listening evaluation.
