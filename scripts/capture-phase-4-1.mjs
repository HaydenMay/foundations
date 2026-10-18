// Bounded manual visual evidence only. This is not a test or a deployment gate.
// Captures the production bundle in a fresh synthetic profile using disposable Developer Preview.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const url = process.env.BASE_URL || 'http://127.0.0.1:4200/foundations/';
const directory = process.env.CAPTURE_DIR || 'docs/evidence/phase-4-1';
const browser = await chromium.launch({ headless: true });
const captures = [];
const errors = [];
const sourceCommit =
  process.env.APP_SOURCE_COMMIT ||
  execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

await mkdir(directory, { recursive: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
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
  await page.getByLabel('Test scenario').selectOption('all');

  async function settle(ms = 160) {
    await page.waitForTimeout(ms);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
  }

  async function setChoice(id, choice) {
    const select = page.locator(`[data-preview-project="${id}"]`);
    const details = page.locator(`details.project-preview:has([data-preview-project="${id}"])`);
    if (await details.count()) {
      const open = await details.getAttribute('open');
      if (open === null) await details.locator('summary').click();
    }
    await select.selectOption(choice);
    await settle();
  }

  async function resetCamera() {
    const button = page.getByRole('button', { name: 'Reset preview camera' });
    await button.scrollIntoViewIfNeeded();
    await button.click();
    await settle();
  }

  async function rotateCamera(steps) {
    const button = page.getByRole('button', { name: 'Rotate town clockwise' });
    for (let step = 0; step < steps; step++) await button.click();
    await settle();
  }

  async function replay(projectId) {
    const build = page.locator(`[data-build-preview="${projectId}"]`);
    await build.scrollIntoViewIfNeeded();
    await build.click();
    await page.waitForFunction(
      () => document.querySelector('app-town')?.getAttribute('data-construction') === 'active',
      null,
      { timeout: 8000 },
    );
  }

  async function waitForConstruction() {
    await page.waitForFunction(
      () => document.querySelector('app-town')?.getAttribute('data-construction') === 'idle',
      null,
      { timeout: 20000 },
    );
  }

  async function capture(name, note) {
    const constructionAtCapture = await page.locator('app-town').getAttribute('data-construction');
    await settle();
    const file = `${directory}/${name}.png`;
    await page.locator('app-town').screenshot({ path: file, type: 'png', timeout: 8000 });
    const metrics = await page.evaluate(() => {
      const town = document.querySelector('app-town');
      const renderer = window.__visual?.renderer;
      return {
        viewport: { width: innerWidth, height: innerHeight },
        lighting: town?.getAttribute('data-lighting'),
        construction: town?.getAttribute('data-construction'),
        camera: window.__visual?.camera?.position?.toArray?.(),
        zoom: window.__visual?.camera?.zoom,
        drawCalls: renderer?.info?.render?.calls,
        triangles: renderer?.info?.render?.triangles,
        webglError: renderer?.getContext?.().getError?.(),
        contextLost: renderer?.getContext?.().isContextLost?.(),
      };
    });
    captures.push({ name, note, file, constructionAtCapture, ...metrics });
  }

  // Confirm that the unbuilt starting parcel reads as a deliberate empty lot.
  await page.getByLabel('Test scenario').selectOption('new');
  await page.getByLabel('Preview lighting').selectOption('day');
  await resetCamera();
  await capture('empty-lot', 'Brand-new player scenario before the first home.');

  // Compare each house and porch combination from the road-facing view so the seating reads.
  await page.getByLabel('Test scenario').selectOption('home');
  await page.getByLabel('Preview lighting').selectOption('day');
  await page.locator('#assembly-speed').selectOption('2');
  for (const [house, label] of [
    ['sage', 'cottage'],
    ['cream', 'craftsman'],
    ['blue', 'brick'],
  ]) {
    await page.locator('#preview-house').selectOption(house);
    for (const [porch, porchLabel] of [
      ['rockingChairs', 'rockers'],
      ['porchSwing', 'swing'],
      ['benchLanterns', 'bench'],
    ]) {
      await setChoice('porch', porch);
      await resetCamera();
      await replay('porch');
      await waitForConstruction();
      await rotateCamera(7);
      await capture(`house-${label}-porch-${porchLabel}`, `${label} with ${porchLabel} porch.`);
    }
  }
  await page.locator('#assembly-speed').selectOption('1');

  // Capture actual production animation starts, partial assembly and settled result.
  const animationCases = [
    { id: 'gardenExpansion', choice: 'wildflowerBeds', name: 'wildflower-beds', description: 'Natural wildflower beds' },
    { id: 'backyard', choice: 'fort', name: 'backyard-fort', description: 'Wooden play fort' },
    {
      id: 'outdoorLighting',
      choice: 'stringLights',
      name: 'string-lights',
      description: 'Lighting and supported cable runs',
    },
  ];
  await page.locator('#assembly-speed').selectOption('0.25');
  for (const item of animationCases) {
    await page.getByLabel('Test scenario').selectOption('home');
    if (item.id === 'backyard') {
      await page.getByLabel('Preview backyard').selectOption(item.choice);
    } else {
      await setChoice(item.id, item.choice);
    }
    await page.getByLabel('Preview lighting').selectOption('day');
    await resetCamera();
    await capture(`animation-${item.name}-initial`, `${item.description}: before replay.`);
    await replay(item.id);
    await page.waitForTimeout(250);
    await capture(`animation-${item.name}-middle`, `${item.description}: in ordered assembly.`);
    await waitForConstruction();
    await capture(`animation-${item.name}-completed`, `${item.description}: construction settled.`);
  }
  await page.locator('#assembly-speed').selectOption('1');

  // Record a few repaired assets in context, including night-only house sconces and torches.
  const detailCases = [
    { id: 'gardenExpansion', choice: 'flowerBeds', name: 'garden-expansion-flower-beds', light: 'day' },
    { id: 'gardenExpansion', choice: 'evergreenShrubs', name: 'garden-expansion-evergreens', light: 'day' },
    { id: 'boundary', choice: 'trimmedHedge', name: 'continuous-trimmed-hedge', light: 'day' },
    { id: 'retreat', choice: 'stonePatio', name: 'stone-patio-umbrella', light: 'day' },
    { id: 'outdoorLighting', choice: 'wallSconces', name: 'wall-sconces-night', light: 'night' },
    { id: 'outdoorLighting', choice: 'gardenTorches', name: 'garden-torches-night', light: 'night' },
  ];
  for (const item of detailCases) {
    await page.getByLabel('Test scenario').selectOption('home');
    await setChoice(item.id, item.choice);
    await page.getByLabel('Preview lighting').selectOption(item.light);
    await resetCamera();
    await replay(item.id);
    await waitForConstruction();
    if (item.id === 'retreat' || (item.id === 'outdoorLighting' && item.choice === 'gardenTorches'))
      await rotateCamera(3);
    await capture(item.name, `${item.choice} with ${item.light} lighting.`);
  }

  const result = {
    source: url,
    sourceCommit,
    capturedAt: new Date().toISOString(),
    profile: 'Fresh synthetic browser profile; all simulated progress stayed in Developer Preview.',
    note: 'Production app rendered by headless Chromium with emulated desktop viewport. This is not physical-device or Safari testing.',
    errors,
    captures,
  };
  await writeFile(`${directory}/metrics.json`, `${JSON.stringify(result, null, 2)}\n`);

  const gallery = captures
    .map(
      ({ name, note }) =>
        `<figure><img src="${name}.png" alt="${note}"><figcaption><strong>${name}</strong><br>${note}</figcaption></figure>`,
    )
    .join('');
  await writeFile(
    `${directory}/index.html`,
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Foundations Phase 4.1 visual evidence</title><style>body{margin:0;padding:24px;background:#f3f0e7;color:#344239;font:15px system-ui}main{max-width:1400px;margin:auto}h1{font:500 32px Georgia,serif}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}figure{margin:0;padding:8px;background:white;border-radius:12px;box-shadow:0 4px 18px #20302016}img{display:block;width:100%;height:auto;border-radius:8px}figcaption{padding:9px;line-height:1.5}</style><main><h1>Foundations · Phase 4.1</h1><p>Production-bundle captures of the empty lot, the three house models with all porch designs, and before/during/after frames from three existing construction recipes.</p><div class="grid">${gallery}</div></main></html>`,
  );
  await context.close();

  // Short viewport check of the updated mobile controls. This remains manual evidence, not a test gate.
  const responsive = [];
  for (const [layout, viewport] of [
    ['portrait', { width: 390, height: 844 }],
    ['landscape', { width: 844, height: 390 }],
  ]) {
    const mobile = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
    const mobilePage = await mobile.newPage();
    mobilePage.setDefaultTimeout(8000);
    mobilePage.on('pageerror', (error) => errors.push(`${layout}: ${error.message}`));
    mobilePage.on('console', (message) => {
      if (message.type() === 'error') errors.push(`${layout}: ${message.text()}`);
    });
    await mobilePage.goto(url);
    await mobilePage.locator('canvas[data-rendered="true"]').waitFor({ state: 'visible' });
    await mobilePage.getByRole('button', { name: 'Settings', exact: true }).click();
    await mobilePage.getByRole('button', { name: 'Developer Preview', exact: true }).click();
    await mobilePage.getByRole('button', { name: 'Enter Developer Preview' }).click();
    await mobilePage.getByLabel('Test scenario').selectOption('all');
    await mobilePage.getByLabel('Preview lighting').selectOption('day');
    await mobilePage.waitForTimeout(200);
    await mobilePage.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
    await mobilePage.screenshot({ path: `${directory}/controls-${layout}.png`, fullPage: true });
    responsive.push({
      layout,
      viewport,
      documentWidth: await mobilePage.evaluate(() => document.documentElement.scrollWidth),
      documentHeight: await mobilePage.evaluate(() => document.documentElement.scrollHeight),
    });
    await mobile.close();
  }

  await writeFile(
    `${directory}/responsive-metrics.json`,
    `${JSON.stringify({ responsive, errors }, null, 2)}\n`,
  );
  console.log(JSON.stringify({ directory, captures: captures.length, responsive, errors }, null, 2));
} finally {
  await browser.close();
}
