# Polyphase verification

Verified on 2026-09-30: visible landing sparks, stronger clear explosions with delayed piece entry, concise piece-count music loops and kick-driven club pumping. Rules, effects, composition and audio graph changes received independent reviews. Coverage is best effort for an existing application with browser-driven modules; the previous full-source line baseline was 40.93%.

## Results

| Check                                | Result                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------- |
| TypeScript and production build      | Passed (`npm run build`)                                                   |
| ESLint                               | Passed (`npm run lint`)                                                    |
| Prettier                             | Passed after formatting integrated files                                   |
| Unit tests                           | 159 passed across nine test files                                          |
| Browser playthrough                  | All seven modes and custom 3+5+6 Fusion passed; no browser errors          |
| Native Web Audio and rendering smoke | Passed, including measured pumping and 12 real clear cases                 |
| Independent code review              | Clear delay, particle rendering, short meter loops and club audio approved |

Browser checks covered movement, rotation, hold, hard drop, pause/resume, top-out, personal records and return to menu. Custom Fusion selection persisted across reload, rejected an empty selection, locked during play, changed the board size and meter label, and saved its own personal best. Settings, themes and mute also persisted. Focused native controls retained Space/Enter behavior, and a persisted page-hide event retained the renderer. The 390 by 844 layout had no horizontal overflow and usable touch controls. Desktop and mobile screenshots were inspected, including the 6/4 label and visible landing sparks.

## Music and sound

The audio harness uses native AudioContext and an analyser. It observed nonzero music output for each pure size and custom 3+5+6, nonzero effect output, and silence after mute. A native OfflineAudioContext probe measured the melodic bus around two kicks: RMS fell from 0.707 to 0.152 on each kick and recovered to 0.702 and 0.709 between kicks. This verifies actual gain automation through the browser's audio graph, with finite output samples.

Deterministic music tests verify exact short-loop repetition, stable harmony, meter-specific accents, whole-bar Fusion transitions, per-size phrase progress, 132-quarter-note tempo, bass register and theme changes. Monotris repeats eight one-beat bars; sizes two through six repeat four bars. Six-cell music uses six quarter beats, grouped 3+3. Independent full-arrangement scheduling probes across modes, themes and low/high energy found at most 24 scheduled music voices, including the layered kick, below the 48-voice limit.

Audio graph tests cover melodic and echo routing through the pump, percussion bypass, pause/mute/volume/mode/theme reset, stinger ducking and disposal. A regression removes `cancelAndHoldAtTime` from the fake AudioParam to verify the portable automation path. Announcer tests cover voice choice, mute, volume, cancellation and disposal; speech availability and pronunciation depend on browser voices.

## Particles and clear timing

The isolated effects layer produced 1,062 visible landing pixels at 0.05 seconds and 806 after approximately 0.167 seconds. The former dim landing implementation failed the stronger footprint check before the fix. Drop trails, isolated clears, Resonance, layering, pointer transparency, expiry, reset, disposal and reduced motion also passed.

Real legal one-through-six-line clears were exercised in both Flow and Rush. Every case held the queue and active piece during its 0.36 to 0.66 second entry gap, then spawned the expected next piece. Simulation time was advanced explicitly. Clear bursts increased from approximately 9,625 visible pixels for one line to 64,690 for six in Flow; Rush measured approximately 9,630 to 65,762. Six-line bursts extended about 18,000 to 19,000 pixels beyond the board. Fewer than 4% of peak visible pixels remained when the next piece entered, and all effects had expired by 1.5 simulated seconds. Labels and sound cues matched their tiers; same-frame level changes did not replace the clear, and pending gameplay clears did not announce while paused.

The UI harness confirmed full effects on fresh settings even when the OS requests reduced motion, plus all six named previews without score changes. Explicitly saved reduced motion remained respected. Automated previews disable spoken callouts through Settings to keep OS speech quiet. Composited landing, single-clear, six-clear and next-piece screenshots were inspected.

Reproduction commands are in [SMOKE.md](SMOKE.md). Generated screenshots and logs are in the ignored `artifacts/` directory.

## Unit coverage

The full integration run measured every production TypeScript file at `4efdfbf`. A subsequent behavior-preserving tempo-label extraction passed all 44 focused music tests. Browser smoke tests are separate and do not contribute to these coverage figures.

| Scope                          | Statements | Branches | Functions | Lines  |
| ------------------------------ | ---------- | -------- | --------- | ------ |
| All production source          | 52.45%     | 53.69%   | 52.23%    | 52.84% |
| Rules, shapes and shared types | 100%       | 99.32%   | 100%      | 100%   |
| Musical score                  | 100%       | 90.47%   | 100%      | 100%   |
| Melody data and dance groove   | 100%       | 100%     | 100%      | 100%   |
| Club kick and pump             | 100%       | 100%     | 100%      | 100%   |
| Audio engine                   | 87.30%     | 77.03%   | 87.50%    | 92.27% |
| Clear tiers                    | 100%       | 100%     | 100%      | 100%   |
| Gameplay effects               | 96.27%     | 87.37%   | 94.73%    | 96.53% |
| Announcer                      | 95.12%     | 88%      | 90%       | 97.05% |

The remaining core branch is the defensive active-piece guard during Resonance. UI, persistence, feedback coordination and rendering primarily use native Chromium integration checks and have no unit coverage. Older sound-effect paths have partial unit coverage plus native output checks. This is not a claim of full application coverage. Reports are in `coverage/`.

## Static review and limits

The full Aislop pass scored 95 with zero errors. Its repeated tempo-label warning was fixed by deriving the shared label and beat duration from one tempo constant; a focused score scan then had zero findings. The 475-line audio module remains a non-mechanical size advisory. The kick's two different oscillator configurations were flagged as duplicate blocks; these are intentionally distinct body and sub layers with different pitch, duration, envelope, gain and filtering, so the explicit calls were retained. Arrow glyphs in controls/documentation remain informational findings. No rules or thresholds were disabled. The security engine reported no issues.

Vite retains its size advisory for the Three.js chunk (about 533 KB before compression, 133 KB gzip). The application chunk is about 69 KB before compression.

Verification used Chromium on Windows. Firefox, Safari, physical touch input, subjective speaker/headphone quality and the Windows double-click launcher were not independently exercised. The launcher's underlying development-server command was exercised successfully. Music was verified structurally and through real audio output, not by a subjective listening evaluation.
