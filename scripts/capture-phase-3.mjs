// Captures comparable completed-house baselines or final assembly playback evidence.
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const url = process.env.BASE_URL || 'http://127.0.0.1:4200/foundations/';
const directory = process.env.CAPTURE_DIR || 'docs/evidence/phase-3';
const mode = process.env.CAPTURE_MODE || 'baseline';
assert.ok(['baseline', 'final'].includes(mode), 'CAPTURE_MODE must be baseline or final');
const layouts = [
  ['portrait', { width: 390, height: 844 }, true],
  ['landscape', { width: 844, height: 390 }, true],
  ['desktop', { width: 1440, height: 1000 }, false],
];
const selectedLayouts = process.env.CAPTURE_LAYOUTS?.split(',');
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const captures = [];
const intermediateFrames = [];
const repositoryCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const applicationSourceCommit = process.env.APP_SOURCE_COMMIT || repositoryCommit;
try {
  for (const [layout, viewport, mobile] of layouts) {
    if (selectedLayouts && !selectedLayouts.includes(layout)) continue;
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
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.addInitScript(() => {
      window.__THREE_DEVTOOLS__ = new EventTarget();
      window.__visual = { renderer: null, scene: null, camera: null, renders: 0 };
      window.__assemblyFrameControl = { freezeAt: null, frozen: false, timestamp: 0 };
      const requestFrame = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) =>
        requestFrame((timestamp) => {
          const control = window.__assemblyFrameControl;
          if (control.freezeAt !== null && timestamp >= control.freezeAt) {
            control.freezeAt = null;
            control.frozen = true;
            control.timestamp = timestamp;
          }
          callback(control.frozen ? control.timestamp : timestamp);
        });
      window.__THREE_DEVTOOLS__.addEventListener('observe', (event) => {
        const renderer = event.detail;
        if (!renderer.isWebGLRenderer) return;
        window.__visual.renderer = renderer;
        const render = renderer.render.bind(renderer);
        renderer.render = (scene, camera) => {
          render(scene, camera);
          Object.assign(window.__visual, {
            scene,
            camera,
            renders: window.__visual.renders + 1,
          });
        };
      });
    });

    await page.goto(url);
    await expect(page.locator('canvas[data-rendered="true"]')).toBeVisible();
    if (mode === 'final')
      await page.addStyleTag({ content: '.toast { display: none !important; }' });
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Developer Preview', exact: true }).click();
    await page.getByRole('button', { name: 'Enter Developer Preview' }).click();
    await page.getByLabel('Test scenario').selectOption('home');
    await page.getByLabel('Preview lighting').selectOption('day');
    await expect(page.locator('app-town')).toHaveAttribute('data-home-visible', 'true');
    await expect(page.locator('app-town')).toHaveAttribute('data-lighting', 'day');
    await page.getByRole('button', { name: 'Collapse preview controls' }).click();
    await page.getByRole('button', { name: 'Return to your first home' }).click();
    await page.waitForTimeout(150);

    let referenceCamera;
    for (const [choice, style] of [
      ['sage', 'cottage'],
      ['cream', 'craftsman'],
      ['blue', 'brick'],
    ]) {
      if (await page.getByTestId('preview-badge').isVisible())
        await page.getByTestId('preview-badge').click();
      await page.locator('#preview-house').selectOption(choice);
      await expect(page.locator('app-town')).toHaveAttribute('data-home-visible', 'true');
      await page.getByRole('button', { name: 'Collapse preview controls' }).click();
      await page.waitForTimeout(180);
      const frame = await page.evaluate(() => {
        const canvas = document.querySelector('app-town canvas');
        const camera = window.__visual?.camera;
        const scene = window.__visual?.scene;
        const assemblies = [];
        scene?.traverse((object) => {
          const assemblyId = object.userData?.assemblyId;
          if (assemblyId)
            assemblies.push({ id: assemblyId, y: object.position.y, visible: object.visible });
        });
        return {
          width: canvas?.width,
          height: canvas?.height,
          position: camera?.position?.toArray?.(),
          zoom: camera?.zoom,
          homeVisible: document.querySelector('app-town')?.getAttribute('data-home-visible'),
          lighting: document.querySelector('app-town')?.getAttribute('data-lighting'),
          overflow: document.documentElement.scrollWidth > innerWidth,
          assemblies,
          drawCalls: window.__visual?.renderer?.info?.render?.calls,
          triangles: window.__visual?.renderer?.info?.render?.triangles,
        };
      });
      assert.deepEqual(frame.homeVisible, 'true');
      assert.deepEqual(frame.lighting, 'day');
      assert.equal(frame.overflow, false, `${layout}/${style} has horizontal overflow`);
      assert.ok(frame.position, `${layout}/${style} did not expose camera state`);
      if (referenceCamera) {
        assert.deepEqual(frame.position, referenceCamera.position, 'Camera position changed');
        assert.equal(frame.zoom, referenceCamera.zoom, 'Camera zoom changed');
      } else referenceCamera = frame;
      const path = `${directory}/${mode}-${layout}-${style}.png`;
      await page.locator('app-town').screenshot({ path });
      captures.push({ layout, style, ...frame, file: path });
      if (mode === 'final' && layout === 'portrait') {
        await page.getByTestId('preview-badge').click();
        await page.getByLabel('Assembly speed').selectOption('0.5');
        await page.evaluate(() => {
          window.__assemblyFrameControl.freezeAt = performance.now() + 1000;
        });
        await page.getByRole('button', { name: 'Preview construction', exact: true }).click();
        await expect(page.locator('app-town')).toHaveAttribute('data-construction', 'active');
        await expect
          .poll(() => page.evaluate(() => window.__assemblyFrameControl.frozen))
          .toBe(true);
        const during = await page.evaluate(() => {
          const scene = window.__visual?.scene;
          const state = [];
          scene?.traverse((object) => {
            const assemblyId = object.userData?.assemblyId;
            if (assemblyId)
              state.push({ id: assemblyId, y: object.position.y, visible: object.visible });
          });
          return state;
        });
        const baseline = new Map(frame.assemblies.map((part) => [part.id, part.y]));
        assert.ok(
          during.some((part) => !part.visible || Math.abs(part.y - baseline.get(part.id)) > 0.02),
          `${style} did not expose an intermediate assembly pose`,
        );
        const intermediatePath = `${directory}/assembly-portrait-${style}.png`;
        await page.locator('app-town').screenshot({ path: intermediatePath });
        intermediateFrames.push({
          layout,
          style,
          speed: 0.5,
          file: intermediatePath,
          assemblies: during,
        });
        await page.evaluate(() =>
          document.querySelector('[aria-label="Skip construction"]')?.click(),
        );
        await page.evaluate(() => {
          window.__assemblyFrameControl.frozen = false;
          window.__assemblyFrameControl.freezeAt = null;
        });
        await expect(page.locator('app-town')).toHaveAttribute('data-construction', 'idle');
      }
    }
    assert.deepEqual(errors, [], `${layout} had browser errors`);
    assert.deepEqual([...requestHosts].sort(), [new URL(url).hostname]);
    await context.close();
  }
  await writeFile(
    `${directory}/${mode}-metrics.json`,
    `${JSON.stringify({ repositoryCommit, applicationSourceCommit, url, lighting: 'day', captures, intermediateFrames }, null, 2)}\n`,
  );
  console.log(
    `Captured ${captures.length} comparable ${mode} house views and ${intermediateFrames.length} intermediate frames from ${applicationSourceCommit}.`,
  );
} finally {
  await browser.close();
}
