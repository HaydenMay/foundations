// Manual visual evidence only. This is deliberately not a test or a deployment gate.
// It uses the running production app and a disposable Developer Preview profile.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const url = process.env.BASE_URL || 'http://127.0.0.1:4200/foundations/';
const directory = process.env.CAPTURE_DIR || 'docs/evidence/phase-4';
const options = [
  {
    set: 'A',
    house: 'sage',
    backyard: 'pool',
    choices: [
      'roses',
      'floweringTree',
      'rockingChairs',
      'pergolaSeating',
      'flowerBeds',
      'picketFence',
      'stringLights',
      'pond',
    ],
  },
  {
    set: 'B',
    house: 'cream',
    backyard: 'trampoline',
    choices: [
      'orange',
      'fountain',
      'porchSwing',
      'stonePatio',
      'evergreenShrubs',
      'trimmedHedge',
      'gardenTorches',
      'gazebo',
    ],
  },
  {
    set: 'C',
    house: 'blue',
    backyard: 'fort',
    choices: [
      'blue',
      'birdbath',
      'benchLanterns',
      'gardenLounge',
      'wildflowerBeds',
      'stoneWall',
      'wallSconces',
      'displayGarden',
    ],
  },
];
const projectIds = [
  'frontGarden',
  'centerpiece',
  'porch',
  'retreat',
  'gardenExpansion',
  'boundary',
  'outdoorLighting',
  'signature',
];
const browser = await chromium.launch({ headless: true });
const captures = [];
const layouts = [];
const errors = [];
const requestHosts = new Set();
const sourceCommit =
  process.env.APP_SOURCE_COMMIT ||
  execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

await mkdir(directory, { recursive: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('request', (request) => {
    const target = new URL(request.url());
    if (target.protocol.startsWith('http')) requestHosts.add(target.hostname);
  });
  await page.addInitScript(() => {
    window.__THREE_DEVTOOLS__ = new EventTarget();
    window.__visual = { renderer: null, scene: null, renders: 0 };
    window.__THREE_DEVTOOLS__.addEventListener('observe', (event) => {
      const renderer = event.detail;
      if (!renderer.isWebGLRenderer) return;
      window.__visual.renderer = renderer;
      const render = renderer.render.bind(renderer);
      renderer.render = (scene, camera) => {
        render(scene, camera);
        Object.assign(window.__visual, { scene, camera, renders: window.__visual.renders + 1 });
      };
    });
  });
  await page.goto(url);
  await page.locator('canvas[data-rendered="true"]').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Developer Preview', exact: true }).click();
  await page.getByRole('button', { name: 'Enter Developer Preview' }).click();
  await page.getByTestId('preview-badge').waitFor({ state: 'visible' });

  async function settle() {
    await page.waitForTimeout(180);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
  }

  async function setChoice(id, choice) {
    const details = page.locator(`details.project-preview:has([data-preview-project="${id}"])`);
    if (!(await details.locator('select').isVisible())) await details.locator('summary').click();
    await details.locator('select').selectOption(choice);
  }

  async function setLighting(light) {
    const expand = page.getByRole('button', { name: 'Expand preview controls' });
    if (await expand.isVisible()) await expand.click();
    await page.getByLabel('Preview lighting').selectOption(light);
    const collapse = page.getByRole('button', { name: 'Collapse preview controls' });
    if (await collapse.isVisible()) await collapse.click();
  }

  async function resetCamera(zoomOut = false) {
    await page.getByRole('button', { name: 'Return to your first home' }).click();
    if (zoomOut) await page.getByRole('button', { name: 'Zoom out' }).click();
  }

  async function rotateToBack() {
    for (let i = 0; i < 4; i++)
      await page.getByRole('button', { name: 'Rotate town clockwise' }).click();
  }

  async function capture(name, view, light = 'day') {
    await setLighting(light);
    await resetCamera(view === 'overview');
    if (view === 'rear') await rotateToBack();
    await settle();
    const file = `${directory}/${name}.jpg`;
    const visualOnly = await page.addStyleTag({
      content:
        '.preview-banner, app-developer-panel, .camera-controls, .camera-hint, .scene-heading, .place-tag, .scene-caption { visibility: hidden !important; }',
    });
    await page.locator('app-town').screenshot({ path: file, type: 'jpeg', quality: 90 });
    await visualOnly.evaluate((element) => element.remove());
    const metrics = await page.evaluate(() => {
      const town = document.querySelector('app-town');
      const renderer = window.__visual?.renderer;
      const camera = window.__visual?.camera;
      return {
        viewport: { width: innerWidth, height: innerHeight },
        overflow: document.documentElement.scrollWidth > innerWidth,
        lighting: town?.getAttribute('data-lighting'),
        homeVisible: town?.getAttribute('data-home-visible'),
        construction: town?.getAttribute('data-construction'),
        camera: camera?.position?.toArray?.(),
        zoom: camera?.zoom,
        drawCalls: renderer?.info?.render?.calls,
        triangles: renderer?.info?.render?.triangles,
        meshes: (() => {
          let count = 0;
          window.__visual?.scene?.traverse((object) => {
            if (object.isMesh) count++;
          });
          return count;
        })(),
        webglError: renderer?.getContext?.().getError?.(),
        contextLost: renderer?.getContext?.().isContextLost?.(),
      };
    });
    captures.push({ name, view, light, file, ...metrics });
  }

  // The preview scenario creates all current projects using their A composition.
  for (const set of options) {
    await page.getByLabel('Test scenario').selectOption('all');
    await page.locator('#preview-house').selectOption(set.house);
    for (let i = 0; i < projectIds.length; i++) await setChoice(projectIds[i], set.choices[i]);
    await page.getByLabel('Preview backyard').selectOption(set.backyard);
    await capture(`set-${set.set}-front-three-quarter`, 'front');
    await capture(`set-${set.set}-rear-three-quarter`, 'rear');
    await capture(`set-${set.set}-elevated-overview`, 'overview');
    await capture(`set-${set.set}-evening-night`, 'front', 'night');
    await page.getByTestId('preview-badge').click();
  }

  // A mixed palette check: cottage + blue garden + B backyard retreat + warm A lighting.
  await page.getByLabel('Test scenario').selectOption('all');
  await page.locator('#preview-house').selectOption('sage');
  await setChoice('frontGarden', 'blue');
  await setChoice('retreat', 'stonePatio');
  await setChoice('outdoorLighting', 'stringLights');
  await page.getByLabel('Preview backyard').selectOption('pool');
  await capture('mixed-front-three-quarter', 'front');
  await capture('mixed-rear-three-quarter', 'rear');
  await page.getByTestId('preview-badge').click();
  await page.getByLabel('Test scenario').selectOption('all');
  await page.locator('#preview-house').selectOption('blue');
  await page.getByLabel('Preview backyard').selectOption('pool');
  await setChoice('frontGarden', 'orange');
  await setChoice('centerpiece', 'fountain');
  await setChoice('retreat', 'pergolaSeating');
  await setChoice('boundary', 'stoneWall');
  await setChoice('outdoorLighting', 'gardenTorches');
  await capture('mixed-brick-front-three-quarter', 'front');
  await capture('mixed-brick-rear-three-quarter', 'rear');
  await context.close();

  // Manual responsive screenshots, not assertions or an automated test suite.
  for (const [layout, viewport, isMobile] of [
    ['portrait', { width: 390, height: 844 }, true],
    ['landscape', { width: 844, height: 390 }, true],
  ]) {
    const mobileContext = await browser.newContext({ viewport, isMobile, hasTouch: true });
    const mobilePage = await mobileContext.newPage();
    mobilePage.on('pageerror', (error) => errors.push(`${layout}: ${error.message}`));
    mobilePage.on('console', (message) => {
      if (message.type() === 'error') errors.push(`${layout}: ${message.text()}`);
    });
    mobilePage.on('request', (request) => {
      const target = new URL(request.url());
      if (target.protocol.startsWith('http')) requestHosts.add(target.hostname);
    });
    await mobilePage.goto(url);
    await mobilePage.locator('canvas[data-rendered="true"]').waitFor({ state: 'visible' });
    await mobilePage.getByRole('button', { name: 'Settings', exact: true }).click();
    await mobilePage.getByRole('button', { name: 'Developer Preview', exact: true }).click();
    await mobilePage.getByRole('button', { name: 'Enter Developer Preview' }).click();
    await mobilePage.getByLabel('Test scenario').selectOption('all');
    await mobilePage.waitForTimeout(120);
    for (const mode of ['expanded', 'collapsed']) {
      if (mode === 'collapsed')
        await mobilePage.getByRole('button', { name: 'Collapse preview controls' }).click();
      const file = `${directory}/ui-${layout}-${mode}.png`;
      await mobilePage.screenshot({ path: file, fullPage: true });
      layouts.push({
        name: `${layout}-${mode}`,
        file,
        ...(await mobilePage.evaluate(() => ({
          viewport: { width: innerWidth, height: innerHeight },
          document: {
            width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight,
          },
          canvas: (() => {
            const bounds = document.querySelector('app-town canvas')?.getBoundingClientRect();
            return (
              bounds && { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
            );
          })(),
        }))),
      });
    }
    await mobileContext.close();
  }

  const result = {
    source: url,
    sourceCommit,
    capturedAt: new Date().toISOString(),
    profile: 'fresh synthetic browser profile; all changes in disposable Developer Preview',
    note: 'Screenshots are from the running production bundle. The built-in orthographic camera keeps a fixed elevated isometric pitch; overview uses wider zoom. Browser viewport emulation is not physical-device testing.',
    requestHosts: [...requestHosts],
    errors,
    captures,
    layouts,
  };
  await writeFile(`${directory}/metrics.json`, `${JSON.stringify(result, null, 2)}\n`);
  const setRows = options
    .map((set) => {
      const house =
        set.set === 'A'
          ? 'Classic Cottage'
          : set.set === 'B'
            ? 'Modern Craftsman'
            : 'Traditional Brick';
      const headings = ['Front three-quarter', 'Rear three-quarter', 'Elevated overview', 'Night'];
      const files = [
        'front-three-quarter',
        'rear-three-quarter',
        'elevated-overview',
        'evening-night',
      ];
      return `<section><h2>Set ${set.set} · ${house}</h2><div class="grid">${files
        .map((suffix, i) => {
          const name = `set-${set.set}-${suffix}`;
          return `<figure><img src="${name}.jpg" alt="Set ${set.set}, ${headings[i]}"><figcaption>${headings[i]}</figcaption></figure>`;
        })
        .join('')}</div></section>`;
    })
    .join('');
  const mixedRows = [
    {
      name: 'mixed-front-three-quarter',
      label: 'Cottage · blue garden · pool · stone patio retreat · string lights',
    },
    {
      name: 'mixed-rear-three-quarter',
      label: 'Cottage · blue garden · pool · stone patio retreat · string lights',
    },
    {
      name: 'mixed-brick-front-three-quarter',
      label: 'Brick · orange garden · fountain · pool · pergola · stone wall · garden torches',
    },
    {
      name: 'mixed-brick-rear-three-quarter',
      label: 'Brick · orange garden · fountain · pool · pergola · stone wall · garden torches',
    },
  ]
    .map(
      ({ name, label }) =>
        `<figure><img src="${name}.jpg" alt="${label}"><figcaption>${label}</figcaption></figure>`,
    )
    .join('');
  await writeFile(
    `${directory}/index.html`,
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Foundations Phase 4 visual review</title><style>body{margin:0;padding:24px;background:#f4f1e8;color:#303c32;font:16px system-ui}main{max-width:1400px;margin:auto}h1,h2{font-family:Georgia,serif;font-weight:500}p{max-width:78ch;line-height:1.5}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}figure{margin:0;background:white;padding:8px;border-radius:12px;box-shadow:0 4px 14px #24341e16}img{width:100%;height:auto;border-radius:8px}figcaption{padding:8px;font-size:14px}section{margin:28px 0}</style><main><h1>Foundations · Phase 4</h1><p>Three complete in-engine property sets, each using one choice at all nine selectable milestones. No cars. Night views use the app's manual night lighting. These are running-app screenshots from a disposable Developer Preview profile.</p>${setRows}<section><h2>Mixed palette clearance checks</h2><p>Two mixed combinations are shown from front and rear viewpoints.</p><div class="grid">${mixedRows}</div></section><h2>Choice legend</h2><p>A: Cottage · Red Rose Bushes · Flowering Ornamental Tree · Swimming Pool · Rocking Chairs + Planters · Pergola Seating · Colorful Flowering Beds · Picket Fence · String Lights · Decorative Pond.</p><p>B: Craftsman · Orange Flowering Bushes · Stone Fountain · Trampoline · Porch Swing + Planters · Stone Patio Seating · Evergreen Shrubs · Trimmed Hedge · Garden Torches · Garden Gazebo.</p><p>C: Brick · Blue Flowering Bushes · Birdbath · Wooden Play Fort · Bench + Lanterns · Garden Lounge · Wildflower Beds · Stone Wall · Wall Sconces · Ornamental Display Garden.</p></main></html>`,
  );
  await context.close();
  console.log(
    JSON.stringify(
      {
        directory,
        captures: captures.length,
        layouts: layouts.length,
        errors,
        requestHosts: [...requestHosts],
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
