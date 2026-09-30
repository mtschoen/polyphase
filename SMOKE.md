# Runtime verification

Run `npm run build` and start `npm run dev` in a second terminal. Browser checks expect the local server at http://127.0.0.1:5173.

On a fresh development machine, install the test browser with `npx playwright install chromium`.
An existing compatible Chromium executable can be selected with the `POLYPHASE_BROWSER` environment variable.

- `node tests/browser-smoke.mjs`: GPU startup, focused-button keyboard behavior, retained page lifecycle, all three game modes, movement/rotation/hold/drop, pause/resume, top-out, saved records, settings persistence and mobile controls.
- `node tests/media-smoke.mjs`: native Web Audio output and mute silence; theme/effect graph exercise; actual engine line clear into Canvas effects; Resonance; reduced-motion shake suppression.
- `npm run coverage`: deterministic rules tests and honest full-source unit coverage.
- `npm run lint` and `npm run format:check`: static and formatting checks.

The browser harnesses close their isolated browsers. Screenshots and runtime results are written under ignored `artifacts/`. Inspect desktop and mobile screenshots after layout changes. Perceived musical quality and game feel still benefit from human playtesting with headphones.
