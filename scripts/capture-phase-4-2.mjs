// Optional production-bundle visual evidence. This is a manual capture aid, not a test or deploy gate.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const url = process.env.BASE_URL || 'http://127.0.0.1:4200/foundations/';
const directory = process.env.CAPTURE_DIR || 'docs/evidence/phase-4-2';
const browser = await chromium.launch({ headless: true });
const captures = [];
const errors = [];
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

await mkdir(directory, { recursive: true });

function attachDiagnostics(page, label) {
  page.on('pageerror', (error) => errors.push(`${label}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${label}: ${message.text()}`);
  });
}

async function initializePage(page, scenario = 'all') {
  page.setDefaultTimeout(10000);
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
  await page.getByLabel('Test scenario').selectOption(scenario);
}

async function panel(page, open) {
  const toggle = page.locator('app-developer-panel button.toggle');
  const expanded = await toggle.getAttribute('aria-expanded');
  if (expanded !== String(open)) await toggle.click();
  await page.waitForFunction(
    (expected) =>
      document.querySelector('app-developer-panel button.toggle')?.getAttribute('aria-expanded') ===
      expected,
    String(open),
  );
}

async function choose(page, projectId, choice) {
  await panel(page, true);
  if (projectId === 'home') {
    await page.locator('#preview-house').selectOption(choice);
  } else if (projectId === 'backyard') {
    await page.locator('#preview-yard').selectOption(choice);
  } else {
    const select = page.locator(`[data-preview-project="${projectId}"]`);
    const details = page.locator(
      `details.project-preview:has([data-preview-project="${projectId}"])`,
    );
    if ((await details.getAttribute('open')) === null)
      await details.evaluate((node) => (node.open = true));
    await select.selectOption(choice);
  }
  await page.waitForTimeout(120);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
}

async function light(page, value) {
  await panel(page, true);
  await page.getByLabel('Preview lighting').selectOption(value);
  await page.waitForTimeout(180);
}

async function frame(page, x, z, zoom = 1.35, angle = Math.PI / 4) {
  await page.evaluate(
    ({ x, z, zoom, angle }) => {
      const visual = window.__visual;
      const camera = visual?.camera;
      if (!camera || !visual.scene || !visual.renderer)
        throw new Error('Three.js scene is unavailable.');
      const target = { x, y: 1.8, z };
      camera.position.set(x + Math.sin(angle) * 34, target.y + 28, z + Math.cos(angle) * 34);
      camera.zoom = zoom;
      camera.lookAt(target.x, target.y, target.z);
      camera.updateProjectionMatrix();
      visual.renderer.render(visual.scene, camera);
    },
    { x, z, zoom, angle },
  );
  await page.waitForTimeout(80);
}

async function frontPorchFrame(page) {
  await page.evaluate(() => {
    const visual = window.__visual;
    const camera = visual?.camera;
    if (!camera || !visual.scene || !visual.renderer)
      throw new Error('Three.js scene is unavailable.');
    camera.position.set(-5.35, 4.2, 9.5);
    camera.zoom = 1.7;
    camera.lookAt(-5.35, 2.7, -1.66);
    camera.updateProjectionMatrix();
    visual.renderer.render(visual.scene, camera);
  });
  await page.waitForTimeout(80);
}

async function captureScene(page, name, note) {
  await panel(page, false);
  const file = `${directory}/${name}.jpg`;
  await page.locator('app-town').screenshot({ path: file, type: 'jpeg', quality: 88 });
  const diagnostics = await page.evaluate(() => {
    const renderer = window.__visual?.renderer;
    return {
      viewport: { width: innerWidth, height: innerHeight },
      rendered: document.querySelector('canvas')?.dataset['rendered'] === 'true',
      lighting: document.querySelector('app-town')?.getAttribute('data-lighting'),
      construction: document.querySelector('app-town')?.getAttribute('data-construction'),
      drawCalls: renderer?.info?.render?.calls,
      triangles: renderer?.info?.render?.triangles,
      webglError: renderer?.getContext?.().getError?.(),
      contextLost: renderer?.getContext?.().isContextLost?.(),
    };
  });
  captures.push({ name, note, file, ...diagnostics });
}

async function capturePage(page, name, note) {
  const file = `${directory}/${name}.jpg`;
  await page.screenshot({ path: file, type: 'jpeg', quality: 88 });
  captures.push({
    name,
    note,
    file,
    viewport: await page.evaluate(() => ({ width: innerWidth, height: innerHeight })),
  });
}

async function build(page, projectId) {
  await panel(page, true);
  const details = page.locator(
    `details.project-preview:has([data-preview-project="${projectId}"])`,
  );
  if ((await details.count()) && (await details.getAttribute('open')) === null)
    await details.evaluate((node) => (node.open = true));
  const button = page.locator(`[data-build-preview="${projectId}"]`);
  await button.scrollIntoViewIfNeeded();
  await button.waitFor({ state: 'visible' });
  await button.click();
  await page.waitForFunction(
    () => document.querySelector('app-town')?.getAttribute('data-construction') === 'active',
    null,
    { timeout: 10000 },
  );
  await panel(page, false);
}

async function waitForBuild(page) {
  await page.waitForFunction(
    () => document.querySelector('app-town')?.getAttribute('data-construction') === 'idle',
    null,
    { timeout: 30000 },
  );
}

try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  attachDiagnostics(page, 'desktop');
  await initializePage(page, 'home');

  // Show only the home chapter and porch so every seat/step remains easy to inspect.
  await panel(page, true);
  const porchDetails = page.locator('details.project-preview:has([data-preview-visible="porch"])');
  if ((await porchDetails.getAttribute('open')) === null)
    await porchDetails.evaluate((node) => (node.open = true));
  const porchVisible = page.locator('[data-preview-visible="porch"]');
  await porchVisible.scrollIntoViewIfNeeded();
  if (!(await porchVisible.isChecked())) await porchVisible.check();

  // Required 3 × 3 porch and house comparison from the road-facing elevation.
  for (const [house, houseName] of [
    ['sage', 'cottage'],
    ['cream', 'craftsman'],
    ['blue', 'brick'],
  ]) {
    await choose(page, 'home', house);
    for (const [design, designName] of [
      ['rockingChairs', 'rocking-chairs'],
      ['porchSwing', 'porch-swing'],
      ['benchLanterns', 'entry-bench'],
    ]) {
      await choose(page, 'porch', design);
      await frontPorchFrame(page);
      await captureScene(
        page,
        `porch-${houseName}-${designName}`,
        `${houseName} with ${designName}; selected style is reversible in preview.`,
      );
    }
  }

  await panel(page, true);
  await page.getByLabel('Test scenario').selectOption('all');
  await page.waitForTimeout(120);

  // Stone wall composition with each deliberate garden expansion; unrelated planting stays in its own zone.
  await choose(page, 'boundary', 'stoneWall');
  for (const [garden, name] of [
    ['flowerBeds', 'flower-beds'],
    ['evergreenShrubs', 'evergreen-shrubs'],
    ['wildflowerBeds', 'wildflowers'],
  ]) {
    await choose(page, 'gardenExpansion', garden);
    await frame(page, -9.8, -0.7, 1.2);
    await captureScene(page, `stone-wall-${name}`, `Stone wall with the ${name} expansion.`);
  }

  // Pathway lanterns by day and night, framed around the actual front walk.
  await choose(page, 'outdoorLighting', 'wallSconces');
  await light(page, 'day');
  await frame(page, -5.35, 0.5, 1.6);
  await captureScene(
    page,
    'pathway-lanterns-afternoon',
    'The legacy wallSconces save ID renders Pathway Lanterns in afternoon light.',
  );
  await light(page, 'night');
  await frame(page, -5.35, 0.5, 1.6);
  await captureScene(
    page,
    'pathway-lanterns-night',
    'Pathway Lanterns remain visible at night without added point lights.',
  );

  // Render all 27 house × backyard × retreat combinations with the single supported string-light run.
  for (const [house, houseName] of [
    ['sage', 'cottage'],
    ['cream', 'craftsman'],
    ['blue', 'brick'],
  ])
    for (const [yard, yardName] of [
      ['pool', 'pool'],
      ['fort', 'fort'],
      ['trampoline', 'trampoline'],
    ])
      for (const [retreat, retreatName] of [
        ['pergolaSeating', 'pergola'],
        ['stonePatio', 'stone-patio'],
        ['gardenLounge', 'garden-lounge'],
      ]) {
        await choose(page, 'home', house);
        await choose(page, 'backyard', yard);
        await choose(page, 'retreat', retreat);
        await choose(page, 'outdoorLighting', 'stringLights');
        await light(page, 'day');
        await frame(page, -5.5, -9.05, 1.38);
        await captureScene(
          page,
          `string-lights-${houseName}-${yardName}-${retreatName}`,
          `Supported string lights with ${houseName}, ${yardName}, and ${retreatName}.`,
        );
      }

  // First/middle/final captures for individual wall sections, then a second multipart project.
  await choose(page, 'boundary', 'stoneWall');
  await panel(page, true);
  await page.locator('#assembly-speed').selectOption('0.5');
  await frame(page, -5.7, -5.45, 0.92);
  await build(page, 'boundary');
  await page.waitForTimeout(120);
  await capturePage(
    page,
    'animation-stone-wall-start',
    'First visible wall spans begin before camera movement finishes.',
  );
  await page.waitForTimeout(1800);
  await capturePage(
    page,
    'animation-stone-wall-middle',
    'Multiple short stone-wall spans are arriving in sequence.',
  );
  await waitForBuild(page);
  await frame(page, -5.7, -5.45, 0.92);
  await captureScene(
    page,
    'animation-stone-wall-complete',
    'All stone-wall sections are assembled.',
  );

  await choose(page, 'retreat', 'pergolaSeating');
  await frame(page, -5.18, -10.22, 1.5);
  await build(page, 'retreat');
  await page.waitForTimeout(120);
  await capturePage(
    page,
    'animation-pergola-start',
    'Pergola retreat starts with individual structural pieces.',
  );
  await page.waitForTimeout(1100);
  await capturePage(
    page,
    'animation-pergola-middle',
    'Pergola posts and beams are staged as separate pieces.',
  );
  await waitForBuild(page);
  await frame(page, -5.18, -10.22, 1.5);
  await captureScene(
    page,
    'animation-pergola-complete',
    'Pergola, bench, and side table after construction.',
  );

  // Replay and skip in the disposable preview copy.
  await panel(page, true);
  await page.locator('#assembly-speed').selectOption('2');
  const boundaryDetails = page.locator(
    'details.project-preview:has([data-preview-project="boundary"])',
  );
  if ((await boundaryDetails.getAttribute('open')) === null)
    await boundaryDetails.locator('summary').click();
  await page.locator('[data-build-preview="boundary"]').scrollIntoViewIfNeeded();
  await page.locator('[data-build-preview="boundary"]').click();
  await page.waitForFunction(
    () => document.querySelector('app-town')?.getAttribute('data-construction') === 'active',
  );
  await page.getByRole('button', { name: 'Skip construction' }).click();
  await waitForBuild(page);
  await panel(page, false);
  await frame(page, -5.7, -5.45, 0.92);
  await captureScene(
    page,
    'replay-skip-preview',
    'A second preview replay can be skipped and leaves the selected design complete.',
  );
  await context.close();

  // Portrait and landscape screenshots; portrait also captures the toast/Preview badge relationship.
  for (const [layout, viewport] of [
    ['portrait', { width: 390, height: 844 }],
    ['landscape', { width: 844, height: 390 }],
  ]) {
    const mobileContext = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'no-preference',
    });
    const mobile = await mobileContext.newPage();
    attachDiagnostics(mobile, layout);
    await initializePage(mobile);
    await mobile.getByLabel('Preview lighting').selectOption('day');
    await mobile.screenshot({
      path: `${directory}/controls-${layout}.jpg`,
      type: 'jpeg',
      quality: 88,
    });
    captures.push({
      name: `controls-${layout}`,
      note: `Developer Preview controls at ${layout} mobile viewport.`,
      viewport,
    });

    await choose(mobile, 'boundary', 'stoneWall');
    await panel(mobile, true);
    await mobile.locator('#assembly-speed').selectOption('0.5');
    await mobile.locator('[data-build-preview="boundary"]').scrollIntoViewIfNeeded();
    await mobile.locator('[data-build-preview="boundary"]').click();
    await mobile.waitForFunction(
      () => document.querySelector('app-town')?.getAttribute('data-construction') === 'active',
    );
    await panel(mobile, false);
    await mobile.waitForTimeout(120);
    const layoutMetrics = await mobile.evaluate(() => {
      const rect = (selector) => {
        const item = document.querySelector(selector);
        if (!item) return null;
        const { x, y, width, height, top, right, bottom, left } = item.getBoundingClientRect();
        return { x, y, width, height, top, right, bottom, left };
      };
      return {
        viewport: { width: innerWidth, height: innerHeight },
        documentWidth: document.documentElement.scrollWidth,
        preview: rect('.preview-banner'),
        status: rect('.construction-status'),
        skip: rect('.construction-status button'),
        webglError: window.__visual?.renderer?.getContext?.().getError?.(),
        contextLost: window.__visual?.renderer?.getContext?.().isContextLost?.(),
      };
    });
    captures.push({
      name: `construction-toast-${layout}`,
      note: `Construction toast and Skip while Developer Preview remains active at ${layout}.`,
      ...layoutMetrics,
    });
    await mobile.screenshot({
      path: `${directory}/construction-toast-${layout}.jpg`,
      type: 'jpeg',
      quality: 88,
    });
    await waitForBuild(mobile);
    await mobileContext.close();
  }

  const result = {
    source: url,
    sourceCommit,
    capturedAt: new Date().toISOString(),
    profile:
      'Fresh synthetic browser profiles; all test scenarios and changes stayed in disposable Developer Preview.',
    note: 'Production bundle rendered by headless Chromium. Mobile screenshots use emulated viewport/touch; this is not physical-device or Safari testing. Script is manual evidence only and is not used by unit tests or deployment.',
    errors,
    captures,
  };
  await writeFile(`${directory}/metrics.json`, `${JSON.stringify(result, null, 2)}\n`);
  const gallery = captures
    .filter(({ name }) => !name.startsWith('construction-toast-'))
    .map(
      ({ name, note }) =>
        `<figure><img src="${name}.jpg" alt="${note}"><figcaption><strong>${name}</strong><br>${note}</figcaption></figure>`,
    )
    .join('');
  await writeFile(
    `${directory}/index.html`,
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Foundations Phase 4.2 evidence</title><style>body{margin:0;padding:24px;background:#f3f0e7;color:#344239;font:15px system-ui}main{max-width:1400px;margin:auto}h1{font:500 32px Georgia,serif}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}figure{margin:0;padding:8px;background:white;border-radius:12px;box-shadow:0 4px 18px #20302016}img{display:block;width:100%;height:auto;border-radius:8px}figcaption{padding:9px;line-height:1.5}</style><main><h1>Foundations · Phase 4.2</h1><p>Production-bundle captures for porch combinations, boundary and garden mixes, all 27 string-light combinations, both lighting moods, and live assembly states. For detailed viewport checks see metrics.json.</p><div class="grid">${gallery}</div></main></html>`,
  );
  console.log(JSON.stringify({ directory, captures: captures.length, errors }, null, 2));
} finally {
  await browser.close();
}
