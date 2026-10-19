// Optional visual-evidence capture from the production bundle; not a test or CI/deploy gate.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const url = process.env.BASE_URL || 'http://127.0.0.1:4200/foundations/';
const directory = process.env.CAPTURE_DIR || 'docs/evidence/autonomous-city-build/browser-captures';
const browser = await chromium.launch({ headless: true });
const captures = [];
const errors = [];
const warnings = [];
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const workingTreeDirty =
  execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0;

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
      webglError: gl?.getError?.() ?? null,
      contextLost: gl?.isContextLost?.() ?? null,
    };
  });
}

async function capture(page, name, note) {
  const file = `${directory}/${name}.jpg`;
  await page.screenshot({ path: file, type: 'jpeg', quality: 90 });
  captures.push({ name, file, note, ...(await diagnostics(page)) });
}

try {
  const desktop = await openPreview({ width: 1600, height: 1000 });
  const { page } = desktop;
  await panel(page, true);
  await selectChapter(page, 'Shared');
  await page.locator('#preview-light').selectOption('day');
  await page.waitForTimeout(300);
  await setScenario(page, 'Chapter 3', '#city-scenario', 'town-center');
  await setCamera(page, 88, -3, 0.42, Math.PI / 4, 34);
  await panel(page, false);
  await capture(
    page,
    'town-center-landscape',
    'Chapter 3 Town Center in the same continuous neighborhood world.',
  );
  await setCamera(page, 102, 3, 0.42, (Math.PI * 3) / 2, 34);
  await capture(
    page,
    'town-center-main-street',
    'Front-facing view of all three distinct Main Street storefronts.',
  );
  await setCamera(page, 96.2, -11, 0.8, (Math.PI * 3) / 2, 34);
  await capture(
    page,
    'town-center-shopfront',
    'Street-level shop frontage, doors, windows, awning and pedestrian approach.',
  );
  await setCamera(page, 70, 19, 0.8, Math.PI / 4, 34);
  await capture(
    page,
    'town-center-library',
    'Community Library with its direct sidewalk connection.',
  );
  await setCamera(page, 129, -10, 0.7, Math.PI / 4, 34);
  await capture(
    page,
    'town-center-square',
    'Public square with selected fountain, benches and planted edges.',
  );

  await panel(page, true);
  await selectChapter(page, 'Shared');
  await page.locator('#assembly-speed').selectOption('0.25');
  await selectChapter(page, 'Chapter 3');
  await page
    .locator('app-developer-panel details.project-preview')
    .filter({ has: page.locator('[data-build-preview="city-main-street"]') })
    .locator('summary')
    .click();
  await page.locator('[data-build-preview="city-main-street"]').click();
  await page.waitForTimeout(500);
  await panel(page, false);
  const skipShownDuringAssembly = await page
    .getByRole('button', { name: 'Skip construction' })
    .isVisible();
  if (!skipShownDuringAssembly) throw new Error('Skip control was not available during assembly.');
  await capture(
    page,
    'town-center-assembly-mid',
    'Mid-construction state of the Main Street assembly.',
  );
  const skip = page.getByRole('button', { name: 'Skip construction' });
  if (await skip.isVisible().catch(() => false)) await skip.click({ timeout: 1000 });
  await page.waitForTimeout(180);
  await capture(
    page,
    'town-center-assembly-skipped',
    'Completed Main Street after skipping its construction animation.',
  );

  await panel(page, true);
  await selectChapter(page, 'Shared');
  await page.locator('#preview-light').selectOption('night');
  await page.waitForTimeout(300);
  await panel(page, false);
  await setCamera(page, 102, 3, 0.42, (Math.PI * 7) / 4, 34);
  await capture(
    page,
    'town-center-night',
    'Night lighting on connected storefronts, lamps and windows.',
  );

  await setScenario(page, 'Chapter 4', '#rail-scenario', 'monorail-city');
  await panel(page, true);
  await selectChapter(page, 'Shared');
  await page.locator('#preview-light').selectOption('auto');
  await page.waitForTimeout(250);
  await panel(page, false);
  await setCamera(page, 58, 0, 0.3, Math.PI / 4, 34);
  await capture(
    page,
    'monorail-city-overview',
    'The connected city and elevated loop with both integrated stations.',
  );

  await panel(page, true);
  await selectChapter(page, 'Chapter 3');
  await page.getByRole('button', { name: 'Replay Chapter 3 welcome' }).click();
  await page.locator('.chapter-transition').waitFor({ state: 'visible' });
  await capture(
    page,
    'town-center-chapter-transition',
    'Chapter 3 welcome transition shown over the live city.',
  );
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await desktop.context.close();

  for (const [name, viewport, mobile, scenario, selector, chapter, camera] of [
    [
      'portrait',
      { width: 390, height: 844 },
      true,
      'town-center',
      '#city-scenario',
      'Chapter 3',
      [102, 3, 0.46, (Math.PI * 7) / 4],
    ],
    [
      'landscape-mobile',
      { width: 844, height: 390 },
      true,
      'monorail-city',
      '#rail-scenario',
      'Chapter 4',
      [58, 0, 0.3],
    ],
  ]) {
    const session = await openPreview(viewport, mobile);
    await setScenario(session.page, chapter, selector, scenario);
    await setCamera(session.page, ...camera);
    await panel(session.page, false);
    await capture(
      session.page,
      `mobile-${name}`,
      `${scenario} scene at emulated ${name} viewport.`,
    );
    await session.context.close();
  }

  const result = {
    source: url,
    sourceCommit,
    workingTreeDirty,
    capturedAt: new Date().toISOString(),
    environment:
      'Headless Chromium, production Angular bundle, emulated viewports; no physical-device or Safari testing.',
    procedure:
      'Manual visual evidence only. This script is optional and is not part of automated tests, CI, or deployment.',
    errors,
    warnings,
    captures,
  };
  await writeFile(`${directory}/metrics.json`, `${JSON.stringify(result, null, 2)}\n`);
  const gallery = captures
    .map(
      ({ name, note }) =>
        `<figure><a href="${name}.jpg"><img src="${name}.jpg" alt="${note}"></a><figcaption><strong>${name}</strong><br>${note}</figcaption></figure>`,
    )
    .join('');
  await writeFile(
    `${directory}/index.html`,
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Foundations autonomous city evidence</title><style>body{margin:0;padding:24px;background:#f3f0e7;color:#344239;font:15px system-ui}main{max-width:1500px;margin:auto}h1{font:500 32px Georgia,serif}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}figure{margin:0;padding:8px;background:white;border-radius:12px;box-shadow:0 4px 18px #20302016}img{display:block;width:100%;height:auto;border-radius:8px}figcaption{padding:9px;line-height:1.5}</style><main><h1>Foundations · Autonomous City</h1><p>Production-bundle visual captures for the Town Center, elevated monorail, chapter transition, and emulated mobile viewports. See metrics.json for browser, layout, and WebGL diagnostics. These captures are inspection evidence, not a browser-test gate.</p><div class="grid">${gallery}</div></main></html>`,
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
