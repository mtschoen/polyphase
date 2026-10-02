# Polyphase

An original browser falling-block game with one-cell through six-cell polyominoes and custom Fusion mixes.

## Development

- Node.js 22.12 or newer. `npm install`, then `npm run dev`.
- `npm run dev:lan` or `PLAY-ON-PHONE.bat`: serve on the local network for phone play.
- `npm run build`: TypeScript validation and production bundle.
- `npm run build:pages`: production bundle with the `/polyphase/` GitHub Pages prefix. Preview with `npm run preview -- --base=/polyphase/`.
- `npm test`: deterministic rules tests. `npm run coverage`: full source coverage report.
- `npm run lint`, `npm run format:check`: code checks.
- `npm run preview`: serve the production build.
- `node tests/browser-smoke.mjs`, `node tests/media-smoke.mjs` and `node tests/mobile-smoke.mjs`: real browser checks against a running dev server. See SMOKE.md for browser setup and TEST-REPORT.md for the latest evidence.
- `node tests/release-smoke.mjs`: production-bundle checks against the Pages preview, or `POLYPHASE_URL` for the live site. `.github/workflows/pages.yml` verifies and publishes pushes to `main`.

## Architecture

- `src/game/`: deterministic rules, polyomino generation, and shared types.
- `src/audio.ts`, `src/club-kick.ts`: Web Audio graph, synthesis, layered kick and melodic side-chain envelope.
- `src/score.ts`, `src/score-melodies.ts`, `src/groove.ts`: piece-count meters, short repeating folk hooks and percussion/bass arrangement.
- `src/clear-tiers.ts`, `src/feedback.ts`, `src/sound-effects.ts`, `src/announcer.ts`: shared clear tiers, coordinated feedback, synthesized stingers and optional browser speech.
- `src/universe.ts`: Three.js animated cosmic environment.
- `src/renderer.ts`, `src/effects.ts`: board drawing and unclipped gameplay particles.
- `src/main.ts`, `src/interface.ts`, `src/input.ts`, `src/storage.ts`: UI, controls, persistence and game loop.
- `src/leaderboard.ts`, `src/leaderboard-panel.ts`: validated local rankings, stale-tab merging and the trophy dialog. Save completed runs before replacing game state.
- `src/impact-settings.ts`, `src/juice-lab.ts`: normalized impact controls and the hidden Konami preview panel. Stored multipliers stay absolute; percentages are relative to the tuned defaults.
- `src/style.css`, `src/styles/`: shared tokens, board, panels, dialogs and responsive layouts.

The footer, keyboard strip and touch control deck are mounted outside `#app`; this keeps the mobile music bar below the header and bottom controls independent of the game's shake transform. Keep mobile root overflow clipped and size the board to the available dynamic viewport so setup and play do not scroll. Touch layouts apply only to coarse pointers.

The touch D-pad owns one contact at a time; actions stay captured until release. Touch horizontal repeat waits 320 ms, then repeats at 110 ms with at most one step per frame; retain the faster keyboard repeat. D-pad side buttons span its height and rotation icons use centered SVGs. Up hard-drops once, Down soft-drops, and the right grid has both rotations above Hold. Project Hold and Resonance availability from the engine independently of preview-image caching; synchronize disabled controls immediately on status changes. Resonance's charged pulse respects both app and OS reduced motion.

Keep a wider inactive margin between the D-pad and action pad (20px on the narrowest screen, scaling to 64px). `touch-telemetry.css` owns readable mobile statistics and available-height compaction; do not let previews cover Resonance or the control deck. The mobile music bar exposes the effects shortcut, synchronized with the desktop shortcut and Settings through `updateEffectsControls`. Fullscreen stays in the header; Help retains the GitHub link. Compacting the sidebar must preserve personal best, Hold and Resonance.

Inject random sources and advance simulation time explicitly in tests. No wall-clock assertions.
Keyboard Up, W and Space hard-drop once per press; X/E rotate clockwise and Z/Q counterclockwise. Keep the help dialog, keyboard strip and browser gameplay checks aligned with these bindings. The Konami sequence still uses arrow keys.
Keep game logic independent of DOM, audio, and graphics. Never use em dashes.
Writing agents must use sibling worktrees; the primary checkout remains on main.
Browser visual and audio paths require runtime smoke testing; report measured coverage honestly.
