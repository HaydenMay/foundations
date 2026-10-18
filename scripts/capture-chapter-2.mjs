// Manual production-bundle evidence capture for the Chapter 2 review handoff.
// This is an evidence aid only; it is not a browser test or deployment gate.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const url = process.env.BASE_URL || 'http://127.0.0.1:4200/foundations/';
const directory = process.env.CAPTURE_DIR || 'docs/evidence/chapter-2';
const browser = await chromium.launch({ headless: true });
const captures = [];
const errors = [];
const warnings = [];
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

await mkdir(directory, { recursive: true });

function attachDiagnostics(page, label) {
  page.on('pageerror', (error) => errors.push(`${label}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${label}: ${message.text()}`);
    if (message.type() === 'warning') warnings.push(`${label}: ${message.text()}`);
  });
}

async function openPreview(viewport = { width: 1600, height: 1000 }, mobile = false) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  attachDiagnostics(page, `${viewport.width}x${viewport.height}`);
  await page.addInitScript(() => {
    window.__THREE_DEVTOOLS__ = new EventTarget();
    window.__visual = { renderer: null, scene: null, camera: null, renders: 0 };
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
  await page.locator('canvas[data-rendered="true"]').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Developer Preview', exact: true }).click();
  await page.getByRole('button', { name: 'Enter Developer Preview' }).click();
  await page.getByTestId('preview-badge').waitFor({ state: 'visible' });
  return { context, page };
}

async function panel(page, open) {
  const toggle = page.locator('app-developer-panel button.toggle');
  if ((await toggle.getAttribute('aria-expanded')) !== String(open)) await toggle.click();
}

async function tab(page, name) {
  await panel(page, true);
  await page.getByRole('button', { name, exact: true }).click();
}

async function scenario(page, value) {
  await tab(page, 'Chapter 2');
  await page.locator('#chapter-two-scenario').selectOption(value);
  await page.waitForTimeout(180);
}

async function choose(page, projectId, choice) {
  await tab(page, 'Chapter 2');
  const details = page.locator(
    `details.project-preview:has([data-preview-project="${projectId}"])`,
  );
  if ((await details.count()) && !(await details.evaluate((node) => node.open)))
    await details.locator('summary').click();
  const selector = page.locator(`[data-preview-project="${projectId}"]`);
  await selector.scrollIntoViewIfNeeded();
  await selector.selectOption(choice, { force: true });
  await page.waitForTimeout(160);
}

async function lighting(page, value) {
  await tab(page, 'Shared');
  await page.getByLabel('Preview lighting').selectOption(value);
  await page.waitForTimeout(180);
}

async function frame(page, x, z, zoom = 1.3, angle = Math.PI / 4, distance = 34) {
  await page.evaluate(
    ({ x, z, zoom, angle, distance }) => {
      const visual = window.__visual;
      const camera = visual?.camera;
      if (!camera || !visual.scene || !visual.renderer)
        throw new Error('Three.js scene is unavailable.');
      const target = { x, y: 1.8, z };
      camera.position.set(
        x + Math.sin(angle) * distance,
        target.y + (distance * 28) / 34,
        z + Math.cos(angle) * distance,
      );
      camera.zoom = zoom;
      camera.lookAt(target.x, target.y, target.z);
      camera.updateProjectionMatrix();
      visual.renderer.render(visual.scene, camera);
    },
    { x, z, zoom, angle, distance },
  );
  await page.waitForTimeout(90);
}

async function metrics(page) {
  return page.evaluate(() => {
    const renderer = window.__visual?.renderer;
    const gl = renderer?.getContext?.();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      documentWidth: document.documentElement.scrollWidth,
      rendered: document.querySelector('canvas')?.dataset['rendered'] === 'true',
      lighting: document.querySelector('app-town')?.getAttribute('data-lighting'),
      construction: document.querySelector('app-town')?.getAttribute('data-construction'),
      drawCalls: renderer?.info?.render?.calls ?? null,
      triangles: renderer?.info?.render?.triangles ?? null,
      webglError: gl?.getError?.() ?? null,
      contextLost: gl?.isContextLost?.() ?? null,
      homeCameraReadout: document
        .querySelector('output[aria-label="Preview camera position"]')
        ?.textContent?.replace(/\s+/g, ' ')
        .trim() ?? null,
      camera: renderer && window.__visual?.camera
        ? {
            position: window.__visual.camera.position.toArray(),
            zoom: window.__visual.camera.zoom,
          }
        : null,
    };
  });
}

async function capture(page, name, note, fullPage = false) {
  const file = `${directory}/${name}.jpg`;
  await page.screenshot({ path: file, type: 'jpeg', quality: 90, fullPage });
  captures.push({ name, note, file, ...(await metrics(page)) });
}

async function captureScene(page, name, note) {
  await panel(page, false);
  await page.locator('app-town').screenshot({
    path: `${directory}/${name}.jpg`,
    type: 'jpeg',
    quality: 90,
  });
  captures.push({ name, note, file: `${directory}/${name}.jpg`, ...(await metrics(page)) });
}

async function setStyleSet(page, style) {
  for (const id of ['ch2-neighbor-1', 'ch2-neighbor-2', 'ch2-neighbor-3', 'ch2-neighbor-4'])
    await choose(page, id, style);
}

async function waitForBuild(page) {
  await page.waitForFunction(
    () => document.querySelector('app-town')?.getAttribute('data-construction') === 'idle',
    null,
    { timeout: 60000 },
  );
}

async function buildSequence(page, projectId, filePrefix, focus, angle) {
  await tab(page, 'Chapter 2');
  const details = page.locator(
    `details.project-preview:has([data-preview-project="${projectId}"])`,
  );
  if ((await details.count()) && !(await details.evaluate((node) => node.open)))
    await details.locator('summary').click();
  await tab(page, 'Shared');
  await page.locator('#assembly-speed').selectOption('0.25');
  await tab(page, 'Chapter 2');
  if (!(await details.evaluate((node) => node.open))) await details.locator('summary').click();
  await page.locator(`[data-build-preview="${projectId}"]`).scrollIntoViewIfNeeded();
  await page.locator(`[data-build-preview="${projectId}"]`).click({ force: true });
  await page.waitForFunction(
    () => document.querySelector('app-town')?.getAttribute('data-construction') === 'active',
    null,
    { timeout: 10000 },
  );
  await panel(page, false);
  await page.waitForTimeout(850);
  await capture(
    page,
    `${filePrefix}-start`,
    'Early assembly frame; lifecycle status and render diagnostics are recorded in metrics.json.',
  );
  await page.waitForTimeout(3500);
  await capture(
    page,
    `${filePrefix}-middle`,
    'Later assembly timing sample; see the evidence README for the staged-visibility limitation.',
  );
  await waitForBuild(page);
  await frame(page, focus.x, focus.z, 1.12, angle, 30);
  await captureScene(page, `${filePrefix}-complete`, 'Completed construction in the persistent Chapter 2 preview world.');
}

try {
  const { context, page } = await openPreview();
  await scenario(page, 'complete');
  await lighting(page, 'day');

  // The completed neighborhood overview anchors all further evidence.
  for (const [project, choice] of [
    ['ch2-street-trees', 'flowering-trees'],
    ['ch2-gardens', 'flowering-borders'],
    ['ch2-entrance', 'stone-pillars'],
    ['ch2-community-park', 'flower-garden'],
    ['ch2-landmark', 'fountain-plaza'],
  ]) await choose(page, project, choice);
  await setStyleSet(page, 'cottage');
  await frame(page, 21, -7, 0.37, Math.PI / 4, 34);
  await captureScene(
    page,
    'neighborhood-overview',
    'Elevated overview: original home, four neighbors, curved street, park, entrance and landmark.',
  );

  // Three cohesive choice sets make the per-style neighborhood palette easy to compare.
  for (const [style, option, label] of [
    ['cottage', 'A', 'Classic Cottage'],
    ['craftsman', 'B', 'Modern Craftsman'],
    ['brick', 'C', 'Traditional Brick'],
  ]) {
    await setStyleSet(page, style);
    await frame(page, 21, -7, 0.37, Math.PI / 4, 34);
    await captureScene(
      page,
      `style-set-option-${option.toLowerCase()}`,
      `All four distinct neighbor lots in the ${label} style, with the original home retained.`,
    );
  }

  // Focused production views document every lot footprint paired with each house style.
  const lots = [
    { index: 1, id: 'ch2-neighbor-1', x: 5.8, z: -3.3, angle: Math.PI / 4 },
    { index: 2, id: 'ch2-neighbor-2', x: 19.5, z: 12.5, angle: (3 * Math.PI) / 4 },
    { index: 3, id: 'ch2-neighbor-3', x: 30.5, z: -8.5, angle: Math.PI / 4 },
    { index: 4, id: 'ch2-neighbor-4', x: 41.5, z: 12.5, angle: (3 * Math.PI) / 4 },
  ];
  for (const [style, styleLabel] of [
    ['cottage', 'cottage'],
    ['craftsman', 'craftsman'],
    ['brick', 'brick'],
  ]) {
    for (const lot of lots) {
      await choose(page, lot.id, style);
      await frame(page, lot.x, lot.z, lot.index === 1 ? 1.8 : 1.58, lot.angle, 31);
      await captureScene(
        page,
        `lot-${lot.index}-${styleLabel}`,
        `Neighbor lot ${lot.index}, ${styleLabel} style; close view shows its footprint, roofline, porch and entry.`
      );
    }
  }

  // Deliberately mix independent house and shared-space selections.
  for (const [id, style] of [
    ['ch2-neighbor-1', 'cottage'],
    ['ch2-neighbor-2', 'craftsman'],
    ['ch2-neighbor-3', 'brick'],
    ['ch2-neighbor-4', 'cottage'],
  ]) await choose(page, id, style);
  for (const [id, choice] of [
    ['ch2-street-trees', 'autumn-maples'],
    ['ch2-gardens', 'ornamental-grasses'],
    ['ch2-entrance', 'timber-sign'],
    ['ch2-community-park', 'playground'],
    ['ch2-landmark', 'natural-stone'],
  ]) await choose(page, id, choice);
  await frame(page, 21, -7, 0.37, Math.PI / 4, 34);
  await captureScene(
    page,
    'mixed-independent-choices',
    'Mixed house styles and independent street, garden, entrance, park and landmark choices.',
  );

  // Each shared space is framed closely, with its selected alternative captured beside it.
  for (const [id, primary, alternate, focus, angle, label] of [
    ['ch2-entrance', 'stone-pillars', 'flowering-entrance', { x: 17.2, z: 0.25 }, Math.PI / 4, 'entrance'],
    ['ch2-community-park', 'flower-garden', 'playground', { x: 38.5, z: -22 }, Math.PI / 4, 'community-park'],
    ['ch2-landmark', 'fountain-plaza', 'natural-stone', { x: 52, z: -22 }, Math.PI / 4, 'landmark'],
  ]) {
    for (const [variant, choice] of [['primary', primary], ['alternative', alternate]]) {
      await choose(page, id, choice);
      await frame(page, focus.x, focus.z, 1.28, angle, 31);
      await captureScene(
        page,
        `shared-${label}-${variant}`,
        `${label} with ${variant} selectable design: ${choice}.`,
      );
    }
  }

  // A night overview records the current lighting implementation for visual comparison.
  await lighting(page, 'night');
  await frame(page, 21, -7, 0.37, Math.PI / 4, 34);
  await captureScene(page, 'neighborhood-night', 'Chapter 2 overview in manually selected night lighting.');
  await lighting(page, 'day');

  // Capture the two durable chapter messages with their available actions visible.
  await scenario(page, 'neighborhood');
  await tab(page, 'Chapter 2');
  await page.getByRole('button', { name: 'Replay Chapter 2 welcome' }).click();
  await panel(page, false);
  await capture(page, 'chapter-2-welcome-transition', '100-star chapter introduction with Continue and Skip reveal controls.');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  // Verify the Home control still targets the original Chapter 1 lot.
  await page.getByRole('button', { name: 'Return to your first home' }).click();
  await tab(page, 'Shared');
  const homeReadout = page.locator('output[aria-label="Preview camera position"]');
  await homeReadout.scrollIntoViewIfNeeded();
  const homeCameraText = (await homeReadout.innerText()).replace(/\s+/g, ' ').trim();
  const homeCameraValues = homeCameraText.match(
    /Position X\s+(-?\d+(?:\.\d+)?)[\s\S]*?Y\s+(-?\d+(?:\.\d+)?)[\s\S]*?Z\s+(-?\d+(?:\.\d+)?)[\s\S]*?Zoom\s+(\d+(?:\.\d+)?)[\s\S]*?Rotation\s+(\d+)/,
  );
  if (
    !homeCameraValues ||
    Math.abs(Number(homeCameraValues[1]) - 19.04) > 0.15 ||
    Math.abs(Number(homeCameraValues[2]) - 29.8) > 0.15 ||
    Math.abs(Number(homeCameraValues[3]) - 19.44) > 0.15 ||
    Math.abs(Number(homeCameraValues[4]) - 1) > 0.05 ||
    Math.abs(Number(homeCameraValues[5]) - 45) > 1
  )
    throw new Error(`Home camera did not return to the Chapter 1 property: ${homeCameraText}`);
  await capture(page, 'home-camera-original-home', 'Home button returns to the original Chapter 1 lot camera position at zoom 1 and 45°.', true);

  await scenario(page, 'complete');
  await tab(page, 'Chapter 2');
  await page.getByRole('button', { name: 'Replay Chapter 2 completion' }).click();
  await panel(page, false);
  await capture(page, 'chapter-2-completion-transition', '200-star chapter completion notice with Continue.');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  // Responsive evidence uses isolated browser profiles and the same production bundle.
  for (const [name, viewport] of [
    ['portrait', { width: 390, height: 844 }],
    ['landscape', { width: 844, height: 390 }],
  ]) {
    const mobileSession = await openPreview(viewport, true);
    await scenario(mobileSession.page, 'complete');
    await tab(mobileSession.page, 'Chapter 2');
    await frame(mobileSession.page, 20, -7, 0.3, Math.PI / 4, 34);
    await capture(
      mobileSession.page,
      `mobile-${name}`,
      `Chapter 2 overview and grouped preview controls at the ${name} viewport; emulated browser capture.`,
      true,
    );
    await mobileSession.context.close();
  }

  // Representative staged assembly for one house and one shared-space project.
  await scenario(page, 'neighborhood');
  await buildSequence(page, 'ch2-neighbor-1', 'assembly-neighbor', { x: 5.8, z: -3.3 }, Math.PI / 4);
  await scenario(page, 'neighborhood');
  await tab(page, 'Chapter 2');
  await page.locator('#sim-stars').fill('170');
  await page.getByRole('button', { name: 'Apply simulated stars' }).click();
  await buildSequence(page, 'ch2-community-park', 'assembly-community-park', { x: 38.5, z: -22 }, Math.PI / 4);

  // A reload during preview must return to the genuine, zero-star synthetic profile.
  await page.reload();
  await page.locator('canvas[data-rendered="true"]').waitFor({ state: 'visible' });
  await page.waitForFunction(
    () =>
      !document.querySelector('[data-testid="preview-badge"]') &&
      document.querySelector('header')?.innerText.replace(/\s+/g, ' ').includes('0 lifetime stars'),
    null,
    { timeout: 10000 },
  );
  await capture(page, 'preview-reload-restores-real-state', 'Reload exits disposable preview and retains the genuine new profile at zero stars.', true);

  // Exercise the explicit Exit control too, then check the same real profile remains intact.
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Developer Preview', exact: true }).click();
  await page.getByRole('button', { name: 'Enter Developer Preview' }).click();
  await page.getByTestId('preview-badge').waitFor({ state: 'visible' });
  await scenario(page, 'complete');
  await page.getByRole('button', { name: 'Exit Developer Preview' }).click();
  await page.waitForFunction(
    () =>
      !document.querySelector('[data-testid="preview-badge"]') &&
      document.querySelector('header')?.innerText.replace(/\s+/g, ' ').includes('0 lifetime stars'),
    null,
    { timeout: 10000 },
  );

  await context.close();

  const result = {
    source: url,
    sourceCommit,
    build: 'Angular production bundle from npm run build; served with scripts/serve.mjs under /foundations/.',
    capturedAt: new Date().toISOString(),
    profile: 'Fresh synthetic browser profiles; all scenario and construction actions stayed in disposable Developer Preview.',
    note: 'Headless Chromium production-app evidence. Portrait and landscape use emulated viewport and touch; no physical-device or Safari testing was performed.',
    errors,
    warnings,
    isolation: {
      previewReloadRestoredZeroStarRealProfile: true,
      previewExitRestoredZeroStarRealProfile: true,
    },
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
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Foundations Chapter 2 evidence</title><style>body{margin:0;padding:24px;background:#f3f0e7;color:#344239;font:15px system-ui}main{max-width:1500px;margin:auto}h1{font:500 32px Georgia,serif}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}figure{margin:0;padding:8px;background:white;border-radius:12px;box-shadow:0 4px 18px #20302016}img{display:block;width:100%;height:auto;border-radius:8px}figcaption{padding:9px;line-height:1.5}</style><main><h1>Foundations · Chapter 2</h1><p>Production-app captures for the expanded neighborhood, all 12 lot/style combinations, mixed choices, shared spaces, chapter transitions, responsive viewports, and staged construction. See README.md and metrics.json for provenance and render diagnostics.</p><div class="grid">${gallery}</div></main></html>`,
  );
  console.log(JSON.stringify({ directory, captures: captures.length, errors, warnings }, null, 2));
} finally {
  await browser.close();
}
