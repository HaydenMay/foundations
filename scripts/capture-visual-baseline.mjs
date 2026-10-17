// Read-only application instrumentation. Captures use a fresh, synthetic browser profile.
// Run `npm run build` and `npm run preview` first. No application state is published.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const url = process.env.BASE_URL || 'http://127.0.0.1:4200/foundations/';
const directory = 'docs/evidence/visual-pass-1/baseline';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const [layout, viewport, mobile] of [
    ['portrait', { width: 390, height: 844 }, true],
    ['compact-portrait', { width: 390, height: 664 }, true],
    ['landscape', { width: 844, height: 390 }, true],
    ['desktop', { width: 1440, height: 1000 }, false],
  ]) {
    const context = await browser.newContext({
      viewport,
      isMobile: mobile,
      hasTouch: mobile,
      deviceScaleFactor: mobile ? 2 : 1,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.addInitScript(() => {
      // Three.js exposes its renderer to its optional developer-tools observer.
      // Keep this hook in the test page only; no diagnostics enter the shipped app.
      window.__THREE_DEVTOOLS__ = new EventTarget();
      window.__visualBaseline = { samples: [], renderer: null, scene: null, camera: null };
      window.__THREE_DEVTOOLS__.addEventListener('observe', (event) => {
        const renderer = event.detail;
        if (!renderer.isWebGLRenderer) return;
        window.__visualBaseline.renderer = renderer;
        const original = renderer.render.bind(renderer);
        renderer.render = (scene, camera) => {
          const begin = performance.now();
          original(scene, camera);
          const state = window.__visualBaseline;
          state.scene = scene;
          state.camera = camera;
          state.samples.push(performance.now() - begin);
          if (state.samples.length > 256) state.samples.shift();
        };
      });
    });
    await page.goto(url);
    await page.locator('canvas[data-rendered="true"]').waitFor();
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByLabel('Town lighting').selectOption('day');
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await page.waitForTimeout(400);
    async function capture(name) {
      await page.screenshot({ path: `${directory}/${name}.png`, scale: 'css' });
      const metrics = await page.evaluate(() => {
        const state = window.__visualBaseline,
          renderer = state.renderer;
        if (!renderer || !state.scene) throw new Error('Renderer diagnostics did not attach.');
        let meshes = 0,
          shadowCasters = 0,
          lights = 0;
        state.scene.traverse((object) => {
          if (object.isMesh) {
            meshes++;
            if (object.castShadow) shadowCasters++;
          }
          if (object.isLight) lights++;
        });
        const rect = (selector) => {
          const r = document.querySelector(selector).getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        };
        const samples = [...state.samples].sort((a, b) => a - b);
        const context = renderer.getContext();
        return {
          viewport: { width: innerWidth, height: innerHeight },
          pixelRatio: renderer.getPixelRatio(),
          canvas: rect('canvas'),
          headline: rect('.scene-heading'),
          panel: rect('.habit-panel'),
          renderer: {
            calls: renderer.info.render.calls,
            triangles: renderer.info.render.triangles,
            geometries: renderer.info.memory.geometries,
            textures: renderer.info.memory.textures,
            programs: renderer.info.programs.length,
          },
          meshes,
          shadowCasters,
          lights,
          webglError: context.getError(),
          renderSubmissionCpuMs: {
            samples: samples.length,
            median: samples[Math.floor(samples.length * 0.5)],
            p95: samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.95))],
          },
          note: 'Short Windows Chromium headless sample; CPU renderer submission timings include warmup and are not GPU or physical-phone FPS measurements.',
        };
      });
      results.push({ name, ...metrics, errors: [...errors] });
    }
    await capture(`${layout}-day-expanded`);
    await page.getByRole('button', { name: 'Collapse habits' }).click();
    await page.getByRole('button', { name: 'Expand habits' }).waitFor();
    await capture(`${layout}-day-collapsed`);
    if (layout === 'portrait') {
      for (const lighting of ['sunrise', 'sunset', 'night']) {
        await page.getByRole('button', { name: 'Settings' }).click();
        await page.getByLabel('Town lighting').selectOption(lighting);
        await page.getByRole('button', { name: 'Close dialog' }).click();
        await capture(`portrait-${lighting}-collapsed`);
      }
    }
    const before = await page.evaluate(() => window.__visualBaseline.renderer.info.render.frame);
    await page.waitForTimeout(700);
    const after = await page.evaluate(() => window.__visualBaseline.renderer.info.render.frame);
    results.push({ name: `${layout}-idle`, framesOver700ms: after - before, errors });
    await context.close();
  }
  await writeFile(`${directory}/metrics.json`, `${JSON.stringify(results, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        directory,
        captures: results.filter((r) => r.renderer).length,
        errors: results.flatMap((r) => r.errors),
        representative: results.find((r) => r.name === 'portrait-day-expanded'),
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
