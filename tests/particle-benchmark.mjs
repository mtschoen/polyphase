// Explicit native performance benchmark, not a wall-clock unit test or CI timing gate.
// Run: node tests/particle-benchmark.mjs <artifact-label>
// Optional: POLYPHASE_URL, POLYPHASE_BROWSER, POLYPHASE_BENCHMARK_DPR (1 or 2),
// POLYPHASE_BENCHMARK_DENSITY (100 or 300), POLYPHASE_BENCHMARK_SCENE (clear or landing),
// POLYPHASE_BENCHMARK_SOURCE (a same-origin module prepared from a baseline commit).
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { checkParticles } from './particle-checks.mjs';
import { checkClearEscalation } from './clear-checks.mjs';

const baseUrl = process.env.POLYPHASE_URL ?? 'http://127.0.0.1:5173';
const label = process.argv[2] ?? 'current';
const source = process.env.POLYPHASE_BENCHMARK_SOURCE ?? '/src/effects.ts';
const scene = process.env.POLYPHASE_BENCHMARK_SCENE ?? 'clear';
const densities = process.env.POLYPHASE_BENCHMARK_DENSITY
  ? [Number(process.env.POLYPHASE_BENCHMARK_DENSITY)]
  : [100, 300];
const scales = process.env.POLYPHASE_BENCHMARK_DPR
  ? [Number(process.env.POLYPHASE_BENCHMARK_DPR)]
  : [1, 2];
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.POLYPHASE_BROWSER,
});
const measurements = [];
const session = await browser.newBrowserCDPSession();
const graphics = await session.send('SystemInfo.getInfo');
await mkdir('artifacts', { recursive: true });
try {
  for (const deviceScaleFactor of scales) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor,
    });
    await page.route(baseUrl + '/', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><body style="margin:0;background:#06100d"><style>.board-effects{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none}</style>',
      }),
    );
    await page.goto(baseUrl);
    for (const density of densities) {
      for (const size of [100, 300]) {
        const result = await page.evaluate(
          async ({ density, size, source, scene }) => {
            const { BoardEffects } = await import(source);
            const { impactValue } = await import('/src/impact-settings.ts');
            let state = 173;
            const random = () => {
              state = (state * 1664525 + 1013904223) >>> 0;
              return state / 2 ** 32;
            };
            const frame = document.createElement('div');
            frame.style.cssText = 'position:fixed;left:430px;top:80px';
            const board = document.createElement('canvas');
            board.width = 420;
            board.height = 660;
            board.style.cssText = 'width:420px;height:660px;border:1px solid #78e6c2';
            frame.append(board);
            document.body.append(frame);
            const effects = new BoardEffects(board, frame, random);
            effects.setImpactSettings({
              particleDensity: impactValue('particleDensity', density),
              particleSize: impactValue('particleSize', size),
              screenShake: 0,
            });
            const overlay = document.querySelector('.board-effects');
            // Read back a separate CPU canvas, leaving the production canvas GPU eligible.
            // The full-size copy and read require completion of all source canvas drawing.
            const probe = document.createElement('canvas');
            probe.width = Math.round(innerWidth * Math.min(devicePixelRatio, 2));
            probe.height = Math.round(innerHeight * Math.min(devicePixelRatio, 2));
            const probeContext = probe.getContext('2d', { willReadFrequently: true });
            const cells = Array.from({ length: scene === 'landing' ? 5 : 84 }, (_, index) => ({
              x: index % 14,
              y: 16 + Math.floor(index / 14),
              color: index % 6,
            }));
            const draw = () => {
              effects.reset();
              state = 173;
              effects.handle(
                {
                  type: scene === 'landing' ? 'lock' : 'clear',
                  amount: 6,
                  rows: [16, 17, 18, 19, 20, 21],
                  cells,
                },
                14,
              );
              effects.render(0.05, 30, false);
            };
            const completed = [];
            const submitted = [];
            const intervals = [];
            const emptyIntervals = [];
            let previous = 0;
            for (let index = 0; index < 25; index++) {
              const timestamp = await new Promise(requestAnimationFrame);
              if (index >= 5 && previous) emptyIntervals.push(timestamp - previous);
              previous = timestamp;
              effects.render(0, 30, false);
            }
            draw();
            previous = 0;
            for (let index = 0; index < 45; index++) {
              const timestamp = await new Promise(requestAnimationFrame);
              if (index >= 10 && previous) intervals.push(timestamp - previous);
              previous = timestamp;
              const started = performance.now();
              effects.render(0, 30, false);
              if (index >= 10) submitted.push(performance.now() - started);
            }
            for (let index = 0; index < 25; index++) {
              await new Promise(requestAnimationFrame);
              const started = performance.now();
              effects.render(0, 30, false);
              probeContext.clearRect(0, 0, probe.width, probe.height);
              probeContext.drawImage(overlay, 0, 0);
              probeContext.getImageData(0, 0, probe.width, probe.height);
              if (index >= 5) completed.push(performance.now() - started);
            }
            const percentile = (values, fraction) => {
              const sorted = [...values].sort((first, second) => first - second);
              return sorted[Math.floor((sorted.length - 1) * fraction)];
            };
            const result = {
              completedMedianMilliseconds: percentile(completed, 0.5),
              completedP95Milliseconds: percentile(completed, 0.95),
              frameMedianMilliseconds: percentile(intervals, 0.5),
              frameP95Milliseconds: percentile(intervals, 0.95),
              emptyFrameMedianMilliseconds: percentile(emptyIntervals, 0.5),
              submittedMedianMilliseconds: percentile(submitted, 0.5),
              retainedParticles: effects.particles.length,
            };
            window.benchmarkCleanup = () => {
              effects.dispose();
              frame.remove();
            };
            return result;
          },
          { density, size, source, scene },
        );
        measurements.push({ deviceScaleFactor, density, size, ...result });
        await page.screenshot({
          path: `artifacts/particle-${label}-${deviceScaleFactor}-${density}-${size}.png`,
        });
        await page.evaluate(() => window.benchmarkCleanup());
      }
    }
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(baseUrl);
  const acceptance = {
    particles: await checkParticles(page),
    clears: await checkClearEscalation(page),
  };
  await page.screenshot({ path: `artifacts/particle-benchmark-${label}.png` });
  const result = { source, scene, graphics: graphics.gpu, measurements, acceptance };
  await writeFile(`artifacts/particle-benchmark-${label}.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
