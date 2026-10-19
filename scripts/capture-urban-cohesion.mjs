// Optional visual-evidence capture from the production bundle; not a test or CI/deploy gate.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const url = process.env.BASE_URL || 'http://127.0.0.1:4200/foundations/';
const directory = process.env.CAPTURE_DIR || 'docs/evidence/urban-cohesion/before';
const browser = await chromium.launch({ headless: true });
const captures = [];
const errors = [];
const observations = {};
const warnings = [];
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const workingTreeDirty =
  execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
    encoding: 'utf8',
  }).trim().length > 0;

await mkdir(directory, { recursive: true });

async function openPreview(viewport, mobile = false) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  const label = `${viewport.width}x${viewport.height}`;
  page.on('pageerror', (error) => errors.push(`${label}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${label}: ${message.text()}`);
    if (message.type() === 'warning') warnings.push(`${label}: ${message.text()}`);
  });
  await page.addInitScript(() => {
    window.__THREE_DEVTOOLS__ = new EventTarget();
    window.__visual = { renderer: null, scene: null, camera: null };
    window.__THREE_DEVTOOLS__.addEventListener('observe', (event) => {
      const renderer = event.detail;
      if (!renderer.isWebGLRenderer) return;
      window.__visual.renderer = renderer;
      const render = renderer.render.bind(renderer);
      renderer.render = (scene, camera) => {
        render(scene, camera);
        Object.assign(window.__visual, { scene, camera });
      };
    });
  });
  await page.goto(url);
  await page.locator('canvas[data-rendered="true"]').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Developer Preview', exact: true }).click();
  await page.getByRole('button', { name: 'Enter Developer Preview' }).click();
  await page.getByTestId('preview-badge').waitFor({ state: 'visible' });
  return { context, page };
}

async function selectChapter(page, name) {
  const toggle = page.locator('app-developer-panel button.toggle');
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  await page.getByRole('button', { name, exact: true }).click();
}

async function setScenario(page, chapter, selector, value) {
  await selectChapter(page, chapter);
  await page.locator(selector).selectOption(value);
  await page.waitForTimeout(450);
}

async function setCamera(page, x, z, zoom, angle = Math.PI / 4, distance = 34) {
  await page.evaluate(
    ({ x, z, zoom, angle, distance }) => {
      const visual = window.__visual;
      if (!visual?.camera || !visual.scene || !visual.renderer)
        throw new Error('Three.js scene is unavailable for visual capture.');
      const camera = visual.camera;
      camera.up.set(0, 1, 0);
      camera.position.set(
        x + Math.sin(angle) * distance,
        1.8 + (distance * 28) / 34,
        z + Math.cos(angle) * distance,
      );
      camera.zoom = zoom;
      camera.lookAt(x, 1.8, z);
      camera.updateProjectionMatrix();
      visual.renderer.render(visual.scene, camera);
    },
    { x, z, zoom, angle, distance },
  );
  await page.waitForTimeout(150);
}

async function setOverhead(page, x, z, zoom) {
  await page.evaluate(
    ({ x, z, zoom }) => {
      const visual = window.__visual;
      if (!visual?.camera || !visual.scene || !visual.renderer)
        throw new Error('Three.js scene is unavailable for visual capture.');
      const camera = visual.camera;
      camera.up.set(0, 0, -1);
      camera.position.set(x, 100, z);
      camera.zoom = zoom;
      camera.lookAt(x, 0, z);
      camera.updateProjectionMatrix();
      visual.renderer.render(visual.scene, camera);
    },
    { x, z, zoom },
  );
  await page.waitForTimeout(150);
}

async function panel(page, open) {
  const toggle = page.locator('app-developer-panel button.toggle');
  if ((await toggle.getAttribute('aria-expanded')) !== String(open)) await toggle.click();
}

async function diagnostics(page) {
  return page.evaluate(() => {
    const renderer = window.__visual?.renderer;
    const gl = renderer?.getContext?.();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      canvasRendered: document.querySelector('canvas')?.dataset['rendered'] === 'true',
      sceneMeshes: (() => {
        let count = 0;
        window.__visual?.scene?.traverse((object) => {
          if (object.isMesh && object.visible) count++;
        });
        return count;
      })(),
      cityAssets: (() => {
        const scene = window.__visual?.scene;
        return [
          'town-center-infrastructure',
          'project-asset:city-main-street',
          'project-asset:city-library',
          'project-asset:city-plaza',
          'project-asset:city-greenway',
          'project-asset:monorail',
        ].map((name) => ({ name, present: !!scene?.getObjectByName(name) }));
      })(),
      trainWorldPosition: (() => {
        const train = window.__visual?.scene
          ?.getObjectByName('project-asset:monorail')
          ?.getObjectByName('train');
        if (!train) return null;
        const position = { x: train.position.x, y: train.position.y, z: train.position.z };
        let parent = train.parent;
        while (parent) {
          position.x += parent.position.x;
          position.y += parent.position.y;
          position.z += parent.position.z;
          parent = parent.parent;
        }
        return position;
      })(),
      drawCalls: renderer?.info?.render?.calls ?? null,
      triangles: renderer?.info?.render?.triangles ?? null,
      webglRenderer: (() => {
        if (!gl) return null;
        const extension = gl.getExtension('WEBGL_debug_renderer_info');
        return extension
          ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)
          : gl.getParameter(gl.RENDERER);
      })(),
      webglError: gl?.getError?.() ?? null,
      contextLost: gl?.isContextLost?.() ?? null,
    };
  });
}

async function measureFramePacing(page, durationMs = 1600) {
  return page.evaluate(
    (duration) =>
      new Promise((resolve) => {
        const frameTimes = [];
        const startedAt = performance.now();
        let previousFrame;
        const sample = (now) => {
          if (previousFrame !== undefined) frameTimes.push(now - previousFrame);
          previousFrame = now;
          if (now - startedAt >= duration) {
            const sorted = [...frameTimes].sort((a, b) => a - b);
            const percentile = (value) => sorted[Math.floor((sorted.length - 1) * value)] ?? null;
            resolve({
              elapsedMs: Math.round(now - startedAt),
              frames: frameTimes.length,
              approximateFps: Math.round((frameTimes.length * 1000) / (now - startedAt)),
              medianFrameMs: percentile(0.5),
              p95FrameMs: percentile(0.95),
            });
            return;
          }
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }),
    durationMs,
  );
}

async function capture(page, name, note, sampleFramePacing = false) {
  const file = `${directory}/${name}.jpg`;
  await page.screenshot({ path: file, type: 'jpeg', quality: 90 });
  captures.push({
    name,
    file,
    note,
    ...(await diagnostics(page)),
    ...(sampleFramePacing ? { framePacing: await measureFramePacing(page) } : {}),
  });
}

async function lighting(page, value) {
  await selectChapter(page, 'Shared');
  await page.locator('#preview-light').selectOption(value);
  await panel(page, false);
  await page.waitForTimeout(100);
}
async function targetStation(page, id) {
  return page.evaluate((id) => {
    const node = window.__visual.scene.getObjectByName(id);
    if (!node) throw new Error(`Missing station ${id}`);
    node.updateWorldMatrix(true, false);
    const position = node.matrixWorld.elements;
    return [position[12], position[14]];
  }, id);
}

async function cameraSnapshot(page) {
  return page.evaluate(() => ({
    position: window.__visual.camera.position.toArray(),
    zoom: window.__visual.camera.zoom,
  }));
}
async function touchInspection(page, viewport) {
  await page.getByRole('button', { name: 'Return to your first home' }).click();
  const original = await cameraSnapshot(page);
  const cdp = await page.context().newCDPSession(page),
    x = viewport.width / 2,
    y = viewport.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: x + 45, y: y + 25 }],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const dragged = await cameraSnapshot(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: x - 35, y },
      { x: x + 35, y },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: x - 65, y },
      { x: x + 65, y },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const pinched = await cameraSnapshot(page);
  await page.getByRole('button', { name: 'Return to your first home' }).click();
  const home = await cameraSnapshot(page);
  await cdp.detach();
  return {
    touchPan: JSON.stringify(original.position) !== JSON.stringify(dragged.position),
    pinchZoom: pinched.zoom !== dragged.zoom,
    homeReset: JSON.stringify(original) === JSON.stringify(home),
  };
}
async function assemblyInspection(page) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await setScenario(page, 'Chapter 3', '#city-scenario', 'town-center');
  await lighting(page, 'day');
  const play = async (speed) => {
    await selectChapter(page, 'Shared');
    await page.locator('#assembly-speed').selectOption(speed);
    await selectChapter(page, 'Chapter 3');
    const details = page
      .locator('details.project-preview')
      .filter({ has: page.locator('[data-build-preview="city-main-street"]') });
    if (!(await details.evaluate((node) => node.open))) await details.locator('summary').click();
    await page.locator('[data-build-preview="city-main-street"]').click();
    await panel(page, false);
  };
  await play('0.25');
  await page.waitForTimeout(400);
  observations.skipAvailable = await page
    .getByRole('button', { name: 'Skip construction' })
    .isVisible();
  await capture(page, 'assembly-mid', 'Main Street at slow assembly speed before skip.');
  if (observations.skipAvailable)
    await page.getByRole('button', { name: 'Skip construction' }).click();
  await capture(page, 'assembly-skipped', 'Completed Main Street after Skip.');
  await play('1');
  await page
    .getByRole('button', { name: 'Skip construction' })
    .waitFor({ state: 'hidden', timeout: 20000 });
  await capture(page, 'assembly-complete', 'Main Street after normal-speed assembly.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await play('1');
  await page
    .getByRole('button', { name: 'Skip construction' })
    .waitFor({ state: 'hidden', timeout: 5000 });
  observations.reducedMotionCompleted = true;
  await capture(page, 'assembly-reduced-motion', 'Completed Main Street with reduced motion.');
  await selectChapter(page, 'Chapter 3');
  await page.getByRole('button', { name: 'Replay Chapter 3 welcome' }).click();
  await page.locator('.chapter-transition').waitFor({ state: 'visible' });
  await capture(page, 'chapter-transition', 'Existing chapter welcome over the recomposed town.');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
}

try {
  const desktop = await openPreview({ width: 1600, height: 1000 });
  const { page } = desktop;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setScenario(page, 'Chapter 3', '#city-scenario', 'town-center');
  await lighting(page, 'day');
  for (const [name, x, z, zoom, angle] of [
    ['city-normal', 58, 1, 0.22, Math.PI / 4],
    ['residential-transition', 64, 5, 0.64, Math.PI / 4],
    ['main-street-gameplay', 86, 3, 0.62, (Math.PI * 7) / 4],
    ['civic-greenway', 108, 6, 0.55, Math.PI / 4],
  ]) {
    await setCamera(page, x, z, zoom, angle);
    await capture(
      page,
      name,
      'Chapter 3 only, fixed comparison camera, afternoon, reduced motion.',
    );
  }
  await setOverhead(page, 53, 0, 0.18);
  await capture(page, 'city-overhead', 'Chapter 3 only, fixed overhead, afternoon.');
  await lighting(page, 'night');
  await setCamera(page, 86, 3, 0.62, (Math.PI * 7) / 4);
  await capture(page, 'main-street-night', 'Same Main Street camera at night.');
  await setScenario(page, 'Chapter 4', '#rail-scenario', 'monorail-city');
  await lighting(page, 'day');
  for (const id of ['neighborhood-station', 'town-station']) {
    const [x, z] = await targetStation(page, id);
    await setCamera(page, x, z, 0.6, Math.PI / 4);
    await capture(page, id, 'Station-local comparison camera, same angle and zoom, afternoon.');
  }
  await setOverhead(page, 53, 0, 0.18);
  await capture(page, 'full-rail-loop', 'Chapter 4 complete, fixed overhead, afternoon.');
  await setCamera(page, 58, 1, 0.22, Math.PI / 4);
  await capture(page, 'rail-city-normal', 'Chapter 4 complete, fixed normal camera, afternoon.');
  if (process.env.EXTRA_CHECKS) {
    await page.getByRole('button', { name: 'Return to your first home' }).click();
    const original = await cameraSnapshot(page);
    await page.mouse.move(800, 400);
    await page.mouse.down();
    await page.mouse.move(870, 445, { steps: 4 });
    await page.mouse.up();
    const dragged = await cameraSnapshot(page);
    await page.mouse.wheel(0, -160);
    await page.waitForTimeout(100);
    const zoomed = await cameraSnapshot(page);
    await page.getByRole('button', { name: 'Rotate town clockwise' }).click();
    const rotated = await cameraSnapshot(page);
    observations.desktopCamera = {
      mousePan: JSON.stringify(original.position) !== JSON.stringify(dragged.position),
      wheelZoom: zoomed.zoom !== dragged.zoom,
      rotate: JSON.stringify(rotated.position) !== JSON.stringify(zoomed.position),
    };
    await assemblyInspection(page);
  }
  await desktop.context.close();
  for (const [name, viewport, scenario, selector, chapter, camera] of [
    [
      'portrait',
      { width: 390, height: 844 },
      'town-center',
      '#city-scenario',
      'Chapter 3',
      [86, 3, 0.48, (Math.PI * 7) / 4],
    ],
    [
      'landscape',
      { width: 844, height: 390 },
      'monorail-city',
      '#rail-scenario',
      'Chapter 4',
      [78, 3, 0.34, (Math.PI * 7) / 4],
    ],
  ]) {
    const session = await openPreview(viewport, true);
    await setScenario(session.page, chapter, selector, scenario);
    await lighting(session.page, 'day');
    await setCamera(session.page, ...camera);
    await capture(
      session.page,
      `mobile-${name}`,
      'Fixed gameplay comparison camera; emulated mobile viewport, afternoon, ambient motion enabled.',
      true,
    );
    if (process.env.EXTRA_CHECKS) {
      observations[name] = await touchInspection(session.page, viewport);
      if (name === 'landscape') {
        const first = await diagnostics(session.page);
        await session.page.waitForTimeout(650);
        const second = await diagnostics(session.page);
        observations.trainMoves =
          JSON.stringify(first.trainWorldPosition) !== JSON.stringify(second.trainWorldPosition);
      }
    }
    await session.context.close();
  }
  const result = {
    source: url,
    sourceCommit,
    workingTreeDirty,
    capturedAt: new Date().toISOString(),
    environment:
      'Production Angular bundle in headless Chromium. Desktop static views respect reduced motion; mobile views enable ambient motion. No physical-device or Safari testing.',
    procedure:
      'Optional manual visual evidence, not an E2E test or CI/deployment gate. Fixed world cameras except station-local targets.',
    errors,
    warnings,
    observations,
    captures,
  };
  await writeFile(`${directory}/metrics.json`, `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(
    `${directory}/index.html`,
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Urban cohesion evidence</title><style>body{background:#eff0e7;font:16px system-ui;margin:24px;color:#273e32}main{max-width:1600px;margin:auto}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:20px}figure{margin:0}img{width:100%;height:auto}figcaption{padding:12px}</style><main><h1>Urban cohesion comparison evidence</h1><p>Source ${sourceCommit}. See metrics.json for renderer, viewport, and error diagnostics.</p><div class="grid">${captures.map(({ name, note }) => `<figure><a href="${name}.jpg"><img src="${name}.jpg" alt="${name}"></a><figcaption>${name}: ${note}</figcaption></figure>`).join('')}</div></main></html>`,
  );
  console.log(
    JSON.stringify({ sourceCommit, captures: captures.length, errors, warnings: warnings.length }),
  );
} finally {
  await browser.close();
}
