# Polyphase verification

Verified on 2026-09-30 against the final implementation following scaffold commit `c823420`.

## Results

| Check                                | Result                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| TypeScript and production build      | Passed (`npm run build`)                                                       |
| ESLint                               | Passed (`npm run lint`)                                                        |
| Prettier                             | Passed (`npm run format:check`)                                                |
| Rules tests                          | 41 passed across two test files                                                |
| Browser playthrough                  | Passed in real headless Chromium; no browser errors                            |
| Native Web Audio and rendering smoke | Passed; no browser errors                                                      |
| Independent code review              | Rules, universe, audio and application integration reviewed by separate agents |

Browser checks covered all three modes: movement, rotation, hold, hard drop, pause/resume, top-out, records and return to menu. Settings, themes, mute and records persisted across reload. Focused native controls retained Space/Enter behavior. A persisted page-hide event retained the renderer. The 390 by 844 viewport had no horizontal overflow and usable touch controls. Desktop and mobile screenshots were visually inspected.

The audio harness used the browser's native AudioContext and analyser, observed nonzero music and effect output, and confirmed silence after mute. Rendering checks exercised an actual line clear, visible particles, screen shake, charged Resonance and suppression of shake with reduced motion. These checks do not substitute for listening on physical headphones or testing a physical touchscreen.

Reproduction commands and browser setup are in [SMOKE.md](SMOKE.md). Generated screenshots and smoke-result JSON are in the ignored `artifacts/` directory.

## Unit coverage

Coverage includes every production TypeScript file. Browser smoke tests are separate and are not counted as unit coverage.

| Scope                          | Statements | Branches | Functions | Lines  |
| ------------------------------ | ---------- | -------- | --------- | ------ |
| All production source          | 22.62%     | 21.39%   | 30.43%    | 21.73% |
| Rules, shapes and shared types | 100%       | 99.21%   | 100%      | 100%   |

The remaining core branch is the defensive active-piece guard during Resonance. Browser-facing modules have no unit coverage; their integration behavior was checked by the two Chromium harnesses above. This is not a claim of full application coverage. Reports are generated in `coverage/` by `npm run coverage`.

## Static review and limitations

The full Aislop pass identified dynamic HTML writes, which were replaced with DOM construction and textContent. A targeted follow-up on the changed modules reported zero errors. Its remaining findings are a 442-line audio module size warning, intentional arrow glyphs in controls, and an unavailable dependency audit in the sandbox. The audio module remains cohesive around one native audio graph; musical composition is already separate in `score.ts`. No rules or thresholds were disabled. Dependency installation separately reported zero vulnerabilities.

Vite reports a size advisory for the Three.js chunk (about 533 KB before compression, 133 KB gzip). The application chunk is about 52 KB before compression. The advisory threshold remains unchanged.

Verification used Chromium on Windows. Firefox, Safari, physical touch input, subjective speaker/headphone output and the Windows double-click launcher were not independently exercised. The launcher's underlying development-server command was exercised and serves the game successfully.
