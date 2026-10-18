// Real Chromium UI captures with disposable synthetic profiles; no diagnostics ship in the app.
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const url = process.env.BASE_URL || 'http://127.0.0.1:4200/foundations/';
const directory = process.env.CAPTURE_DIR || 'docs/evidence/phase-2/local';
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
    if (process.env.CAPTURE_LAYOUTS && !process.env.CAPTURE_LAYOUTS.split(',').includes(layout))
      continue;
    const context = await browser.newContext({
      viewport,
      isMobile: mobile,
      hasTouch: mobile,
      deviceScaleFactor: mobile ? 2 : 1,
    });
    const page = await context.newPage();
    const errors = [];
    const requestHosts = new Set();
    page.on('request', (request) => {
      const target = new URL(request.url());
      if (target.protocol.startsWith('http')) requestHosts.add(target.hostname);
    });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.addInitScript(() => {
      window.__THREE_DEVTOOLS__ = new EventTarget();
      window.__visual = { renderer: null, scene: null, camera: null, renders: 0 };
      window.__THREE_DEVTOOLS__.addEventListener('observe', (event) => {
        const r = event.detail;
        if (!r.isWebGLRenderer) return;
        window.__visual.renderer = r;
        const original = r.render.bind(r);
        r.render = (scene, camera) => {
          original(scene, camera);
          Object.assign(window.__visual, { scene, camera, renders: window.__visual.renders + 1 });
        };
      });
    });
    await page.goto(url);
    await expect(page.locator('canvas[data-rendered="true"]')).toBeVisible();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByLabel('Town lighting').selectOption('day');
    await page.getByRole('button', { name: 'Close dialog' }).click();
    async function capture(name, settle = true) {
      if (settle) await page.waitForTimeout(400);
      await page.screenshot({ path: `${directory}/${name}.png`, scale: 'css' });
      const metrics = await page.evaluate(() => {
        const { renderer: r, scene, camera } = window.__visual;
        if (!r || !scene) throw new Error('Missing Three.js observer');
        const home = scene.getObjectByName('starting-home');
        const lastUpdate = { ...r.info.render };
        const activeAnimation =
          document.querySelector('app-town').dataset.construction === 'active';
        // Separate the last UI update (which may include shadows) from a cached static draw.
        if (!activeAnimation) r.render(scene, camera);
        let meshes = 0;
        scene.traverse((o) => {
          if (o.isMesh) meshes++;
        });
        return {
          viewport: { width: innerWidth, height: innerHeight },
          overflow: document.documentElement.scrollWidth > innerWidth,
          canvas: (() => {
            const b = r.domElement.getBoundingClientRect();
            return { x: b.x, y: b.y, width: b.width, height: b.height };
          })(),
          calls: r.info.render.calls,
          triangles: r.info.render.triangles,
          lastUpdate,
          measurement: activeAnimation ? 'active animation' : 'cached static render',
          meshes,
          resources: { ...r.info.memory, programs: r.info.programs.length },
          home: home ? { visible: home.visible, scale: home.scale.x, y: home.position.y } : null,
          position: camera.position.toArray(),
          zoom: camera.zoom,
          webglError: r.getContext().getError(),
          contextLost: r.getContext().isContextLost(),
        };
      });
      assert.equal(metrics.overflow, false, `${name}: layout overflow`);
      assert.equal(metrics.webglError, 0, `${name}: WebGL error`);
      assert.equal(metrics.contextLost, false, `${name}: context lost`);
      assert.deepEqual(errors, [], `${name}: console errors`);
      assert.deepEqual(
        [...requestHosts],
        [new URL(url).hostname],
        `${name}: unexpected external requests`,
      );
      results.push({ name, ...metrics, requestHosts: [...requestHosts] });
    }
    await capture(`${layout}-empty-lot`);
    assert.deepEqual(
      await page.evaluate(() => JSON.parse(localStorage.getItem('foundations.v1')).designs),
      {},
    );
    await page
      .getByRole('button', { name: 'Complete Make a moment to unwind', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Your first home is ready!', exact: true }),
    ).toBeVisible();
    await capture(`${layout}-home-selection-cottage`);
    if (layout === 'portrait') {
      for (const [name, id] of [
        ['Modern Craftsman', 'craftsman'],
        ['Traditional Brick', 'brick'],
      ]) {
        await page.getByRole('button', { name: `Preview ${name}`, exact: true }).click();
        await capture(`portrait-home-selection-${id}`);
      }
      await page.getByRole('button', { name: 'Preview Classic Cottage', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Build my home', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Skip construction', exact: true }),
    ).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('foundations.v1')));
    assert.equal(stored.designs.home, 'sage', 'Home must be durable before animation');
    const animationStart = await page.evaluate(() => ({
      time: performance.now(),
      renders: window.__visual.renders,
    }));
    if (layout === 'portrait') {
      await page.waitForTimeout(750);
      await capture('portrait-construction', false);
    }
    await expect(page.locator('app-town')).toHaveAttribute('data-construction', 'idle');
    const animationEnd = await page.evaluate(() => ({
      time: performance.now(),
      renders: window.__visual.renders,
    }));
    results.push({
      name: `${layout}-animation`,
      elapsedAfterObservedStartMs: animationEnd.time - animationStart.time,
      renderCalls: animationEnd.renders - animationStart.renders,
      durableBeforeAnimation: true,
    });
    await page.waitForTimeout(4600); // Let the actual celebratory toast leave naturally.
    await capture(`${layout}-first-home`);
    await page.waitForTimeout(350); // Camera preference debounce has settled before isolation assertion.
    const genuine = await page.evaluate(() => localStorage.getItem('foundations.v1'));
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Developer Preview', exact: true }).click();
    await capture(`${layout}-preview-entry`);
    await page.getByRole('button', { name: 'Enter Developer Preview', exact: true }).click();
    await expect(page.getByTestId('preview-badge')).toBeVisible();
    await capture(`${layout}-preview-controls`);
    if (layout === 'portrait') {
      for (const scenario of ['new', 'ready', 'home', 'several', 'all']) {
        await page.getByLabel('Test scenario').selectOption(scenario);
        if (scenario === 'ready') {
          await capture('preview-scenario-ready');
          await page.getByRole('button', { name: 'Choose later', exact: true }).click();
        } else await capture(`preview-scenario-${scenario}`);
      }
      await page.getByLabel('Preview backyard').selectOption('fort');
      await page.getByLabel('Preview lighting').selectOption('sunset');
      await capture('portrait-preview-backyard-lighting');
      await page
        .getByRole('button', { name: 'Reset preview camera', exact: true })
        .scrollIntoViewIfNeeded();
      await capture('portrait-preview-camera-controls');
    }
    await page.getByRole('button', { name: 'Collapse preview controls', exact: true }).click();
    await capture(`${layout}-preview-collapsed`);
    const frame = await page.evaluate(() => window.__visual.renders);
    await page.waitForTimeout(700);
    const idle = await page.evaluate(() => window.__visual.renders);
    results.push({ name: `${layout}-idle`, rendersOver700ms: idle - frame });
    assert.equal(idle - frame, 0, 'No ongoing animation/render loop after construction');
    assert.equal(
      await page.evaluate(() => localStorage.getItem('foundations.v1')),
      genuine,
      'Preview must not alter genuine persistence',
    );
    await page.getByRole('button', { name: 'Exit Developer Preview', exact: true }).click();
    await page.waitForTimeout(500);
    assert.equal(
      await page.evaluate(() => localStorage.getItem('foundations.v1')),
      genuine,
      'Exit must restore real state without leaked camera changes',
    );
    assert.deepEqual(errors, []);
    await context.close();
  }
  await writeFile(
    `${directory}/metrics.json`,
    JSON.stringify(
      {
        url,
        sourceCommit,
        capturedAt: new Date().toISOString(),
        note: 'Windows headless Chromium, synthetic profiles. Emulated viewports, not physical device FPS. Render calls are CPU submissions, not GPU timings. Source commit may have documented uncommitted UI changes in local captures.',
        results,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    JSON.stringify(
      {
        directory,
        captures: results.filter((r) => r.viewport).length,
        observations: results.filter((r) => !r.viewport),
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
