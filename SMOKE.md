# Runtime verification

Run `npm run build` and start `npm run dev` in a second terminal. Browser checks expect the local server at http://127.0.0.1:5173.

On a fresh development machine, install the test browser with `npx playwright install chromium`.
An existing compatible Chromium executable can be selected with the `POLYPHASE_BROWSER` environment variable.

- `node tests/browser-smoke.mjs`: GPU startup, focused-button keyboard behavior, retained page lifecycle, all seven game modes, custom 3+5+6 Fusion, nonempty selection, movement/rotation/hold/drop, pause/resume, top-out, separate mix records, settings persistence and mobile controls.
- `node tests/media-smoke.mjs`: native Web Audio output for every pure meter and a custom mix; mute silence and theme/effect graph exercise. The particle helper checks isolated lock, clear and Resonance bursts, particles escaping beyond the board after shockwaves expire, visible layering, expiration, reset, disposal and reduced motion. Inspect composited screenshots as well as canvas pixels.
- `npm run coverage`: deterministic rules tests and honest full-source unit coverage.
- `npm run lint` and `npm run format:check`: static and formatting checks.

The browser harnesses close their isolated browsers. Screenshots and runtime results are written under ignored `artifacts/`. Inspect desktop and mobile screenshots after layout changes. Perceived musical quality and game feel still benefit from human playtesting with headphones.
