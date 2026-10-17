// Actual browser captures with fresh synthetic progress. No diagnostics ship in the application.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const url = process.env.BASE_URL || 'http://127.0.0.1:4200/foundations/';
const directory = process.env.CAPTURE_DIR || 'docs/evidence/visual-pass-1/final';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
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
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.addInitScript(() => {
      window.__THREE_DEVTOOLS__ = new EventTarget();
      window.__visual = { renderer: null, scene: null, camera: null };
      window.__THREE_DEVTOOLS__.addEventListener('observe', (event) => {
        const r = event.detail;
        if (!r.isWebGLRenderer) return;
        window.__visual.renderer = r;
        const original = r.render.bind(r);
        r.render = (scene, camera) => {
          original(scene, camera);
          window.__visual.scene = scene;
          window.__visual.camera = camera;
        };
      });
    });
    await page.goto(url);
    await page.locator('canvas[data-rendered="true"]').waitFor();
    async function lighting(value) {
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await page.getByLabel('Town lighting').selectOption(value);
      await page.getByRole('button', { name: 'Close dialog' }).click();
    }
    async function design(project, name) {
      await page.getByRole('button', { name: 'Your town', exact: true }).click();
      await page.getByRole('button', { name: `Design ${project}`, exact: true }).click();
      await page.getByRole('button', { name: new RegExp(name) }).click();
      await page.getByRole('heading', { name: 'Your growing town', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Close dialog' }).click();
    }
    async function capture(name) {
      await page.waitForTimeout(350);
      // Let the notification fade before capturing the environment.
      await page.evaluate(() =>
        document.querySelector('.toast')?.setAttribute('style', 'visibility:hidden'),
      );
      await page.screenshot({ path: `${directory}/${name}.png`, scale: 'css' });
      const metrics = await page.evaluate(async () => {
        const { renderer: r, scene, camera } = window.__visual;
        if (!r || !scene) throw new Error('Three.js diagnostic observer did not attach');
        let meshes = 0,
          shadowCasters = 0;
        scene.traverse((o) => {
          if (o.isMesh) {
            meshes++;
            if (o.castShadow) shadowCasters++;
          }
        });
        const submissions = [];
        for (let i = 0; i < 12; i++) {
          await new Promise(requestAnimationFrame);
          const t = performance.now();
          r.render(scene, camera);
          submissions.push(performance.now() - t);
        }
        submissions.sort((a, b) => a - b);
        const steady = { ...r.info.render };
        r.shadowMap.needsUpdate = true;
        r.render(scene, camera);
        const shadowRefresh = { ...r.info.render };
        const rect = (selector) => {
          const b = document.querySelector(selector).getBoundingClientRect();
          return { x: b.x, y: b.y, width: b.width, height: b.height };
        };
        return {
          viewport: { width: innerWidth, height: innerHeight },
          canvas: rect('canvas'),
          panel: rect('.habit-panel'),
          headline: rect('.scene-heading'),
          pixelRatio: r.getPixelRatio(),
          steady,
          shadowRefresh,
          meshes,
          shadowCasters,
          resources: { ...r.info.memory, programs: r.info.programs.length },
          renderSubmissionCpuMs: {
            samples: submissions.length,
            median: submissions[6],
            p95: submissions[11],
          },
          webglError: r.getContext().getError(),
          contextLost: r.getContext().isContextLost(),
        };
      });
      assert.equal(metrics.webglError, 0, `${name}: WebGL error`);
      assert.equal(metrics.contextLost, false, `${name}: lost context`);
      assert.deepEqual(errors, [], `${name}: browser errors`);
      results.push({ name, ...metrics, errors: [...errors] });
    }
    await lighting('day');
    await capture(`${layout}-day-expanded`);
    if (layout === 'portrait') {
      // Unlock the existing backyard with the three real starter completions (six stars).
      for (const name of [
        'Step outside for a little walk',
        'Make a moment to unwind',
        'Move in a way you enjoy',
      ])
        await page.getByRole('button', { name: `Complete ${name}`, exact: true }).click();
      await design('Your backyard retreat', 'Quiet waters');
      for (const [name, id] of [
        ['Classic Cottage', 'cottage'],
        ['Modern Craftsman', 'craftsman'],
        ['Traditional Brick', 'brick'],
      ]) {
        await design('A place to begin', name);
        await capture(`house-${id}-portrait`);
      }
      await design('A place to begin', 'Classic Cottage');
    }
    if (layout === 'desktop') {
      for (const name of [
        'Step outside for a little walk',
        'Make a moment to unwind',
        'Move in a way you enjoy',
      ])
        await page.getByRole('button', { name: `Complete ${name}`, exact: true }).click();
      await design('Your backyard retreat', 'Quiet waters');
      for (const [name, id] of [
        ['Classic Cottage', 'cottage'],
        ['Modern Craftsman', 'craftsman'],
        ['Traditional Brick', 'brick'],
      ]) {
        await design('A place to begin', name);
        await capture(`house-${id}-desktop`);
      }
      await design('A place to begin', 'Classic Cottage');
    }
    await page.getByRole('button', { name: 'Collapse habits' }).click();
    await page.getByRole('button', { name: 'Expand habits' }).waitFor();
    await capture(`${layout}-day-collapsed`);
    if (layout === 'portrait') {
      for (const lightingValue of ['sunrise', 'sunset', 'night']) {
        await lighting(lightingValue);
        await capture(`portrait-${lightingValue}-collapsed`);
      }
      await lighting('day');
      // All nine combinations are real UI changes; rear camera makes yard clearance reviewable.
      for (const [home, hid] of [
        ['Classic Cottage', 'cottage'],
        ['Modern Craftsman', 'craftsman'],
        ['Traditional Brick', 'brick'],
      ]) {
        await design('A place to begin', home);
        await page.getByRole('button', { name: 'Return to your first home' }).click();
        for (let i = 0; i < 4; i++)
          await page.getByRole('button', { name: 'Rotate town clockwise' }).click();
        for (const [yard, yid] of [
          ['Quiet waters', 'pool'],
          ['Woodland fort', 'fort'],
          ['A little lift', 'trampoline'],
        ]) {
          await design('Your backyard retreat', yard);
          await capture(`rear-${hid}-${yid}`);
          const stars = await page.evaluate(() =>
            JSON.parse(localStorage.getItem('foundations.v1')).completions.reduce(
              (n, c) => n + c.stars,
              0,
            ),
          );
          assert.equal(stars, 6, 'Customization must preserve lifetime stars');
        }
      }
      await page.reload();
      await page.locator('canvas[data-rendered="true"]').waitFor();
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('foundations.v1')));
      assert.equal(saved.designs.home, 'blue');
      assert.equal(saved.designs.backyard, 'trampoline');
      await capture('rear-brick-trampoline-reloaded');
    }
    if (layout === 'desktop') {
      for (let i = 0; i < 4; i++)
        await page.getByRole('button', { name: 'Rotate town clockwise' }).click();
      for (const [name, id] of [
        ['Quiet waters', 'pool'],
        ['Woodland fort', 'fort'],
        ['A little lift', 'trampoline'],
      ]) {
        await design('Your backyard retreat', name);
        await capture(`backyard-${id}-desktop`);
      }
      // Advance this synthetic profile one local day and earn the existing twelve-star roof project.
      await page.clock.install({ time: new Date(Date.now() + 24 * 60 * 60 * 1000) });
      await page.reload();
      await page.getByRole('button', { name: 'Expand habits' }).click();
      await page.getByRole('button', { name: 'Return to your first home' }).click();
      for (const name of [
        'Step outside for a little walk',
        'Make a moment to unwind',
        'Move in a way you enjoy',
      ])
        await page.getByRole('button', { name: `Complete ${name}`, exact: true }).click();
      for (const [name, id] of [
        ['Terracotta', 'clay'],
        ['Evening slate', 'slate'],
        ['Forest green', 'moss'],
      ]) {
        await design('A fresh welcome', name);
        await capture(`exterior-${id}-desktop`);
      }
    }
    const before = await page.evaluate(() => window.__visual.renderer.info.render.frame);
    await page.waitForTimeout(700);
    const after = await page.evaluate(() => window.__visual.renderer.info.render.frame);
    results.push({ name: `${layout}-idle`, framesOver700ms: after - before, errors });
    await context.close();
  }
  await writeFile(
    `${directory}/metrics.json`,
    `${JSON.stringify({ url, sourceCommit, capturedAt: new Date().toISOString(), note: 'Windows headless Chromium, fresh synthetic profile. Warm CPU submission only, not GPU timings or physical-phone FPS. Shadow refresh is directly comparable with the uncached-shadow baseline.', results }, null, 2)}\n`,
  );
  console.log(
    JSON.stringify(
      {
        directory,
        captures: results.filter((r) => r.steady).length,
        errors: results.flatMap((r) => r.errors),
        representative: results[0],
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
