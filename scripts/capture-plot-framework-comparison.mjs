// Manual production-app evidence capture for the universal plot framework.
// Run against the same production bundle before and after enabling the preview proof lot.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const url = process.env.BASE_URL || 'http://127.0.0.1:4200/foundations/';
const directory = process.env.CAPTURE_DIR || 'docs/evidence/universal-plot-framework/baseline';
const proof = process.env.FRAMEWORK_PROOF === '1';
const viewport = {
  width: Number(process.env.CAPTURE_WIDTH || 1600),
  height: Number(process.env.CAPTURE_HEIGHT || 1000),
};
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
await mkdir(directory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport,
  deviceScaleFactor: 1,
  reducedMotion: 'no-preference',
});
const page = await context.newPage();
await page.emulateMedia({ reducedMotion: 'no-preference' });
const errors = [];
const warnings = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
  if (message.type() === 'warning') warnings.push(message.text());
});

try {
  await page.addInitScript(() => {
    window.__THREE_DEVTOOLS__ = new EventTarget();
    window.__frameworkVisual = { renderer: null, scene: null, camera: null };
    window.__THREE_DEVTOOLS__.addEventListener('observe', (event) => {
      const renderer = event.detail;
      if (!renderer.isWebGLRenderer) return;
      window.__frameworkVisual.renderer = renderer;
      const render = renderer.render.bind(renderer);
      renderer.render = (scene, camera) => {
        render(scene, camera);
        Object.assign(window.__frameworkVisual, { scene, camera });
      };
    });
  });
  await page.goto(url);
  await page.locator('canvas[data-rendered="true"]').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Developer Preview', exact: true }).click();
  await page.getByRole('button', { name: 'Enter Developer Preview' }).click();
  await page.getByTestId('preview-badge').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Chapter 2', exact: true }).click();
  await page.locator('#chapter-two-scenario').selectOption('neighborhood');
  const lot = page.locator('details.project-preview:has([data-preview-project="ch2-neighbor-1"])');
  if (!(await lot.evaluate((node) => node.open))) await lot.locator('summary').click();
  await page.locator('[data-preview-project="ch2-neighbor-1"]').selectOption('craftsman');
  let assemblyDiagnostics = null;
  if (proof) {
    await page.getByRole('button', { name: 'Preview Chapter 1-built neighbor' }).click();
    await page.getByRole('button', { name: 'Shared', exact: true }).click();
    await page.locator('#assembly-speed').selectOption('1');
    await page.waitForTimeout(80);
    assemblyDiagnostics = {
      configuredSpeed: await page.locator('#assembly-speed').inputValue(),
      forceReducedMotion: await page.locator('#force-reduced-motion').isChecked(),
      reducedMotionPreference: await page.evaluate(
        () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      ),
    };
    await page.getByRole('button', { name: 'Chapter 2', exact: true }).click();
  }

  await page.evaluate(() => {
    const visual = window.__frameworkVisual;
    const camera = visual.camera;
    if (!camera || !visual.scene || !visual.renderer)
      throw new Error('Three.js instrumentation did not attach.');
    const target = { x: 5.25, y: 1.8, z: -4 };
    camera.position.set(target.x + 24, target.y + 19.8, target.z + 24);
    camera.zoom = 0.72;
    camera.lookAt(target.x, target.y, target.z);
    camera.updateProjectionMatrix();
    visual.renderer.render(visual.scene, camera);
  });
  await page.waitForTimeout(300);
  const capture = async (name) => {
    await page.locator('app-town').screenshot({
      path: `${directory}/${name}.png`,
      animations: 'disabled',
    });
    return page.evaluate(() => {
      const { renderer, scene, camera } = window.__frameworkVisual;
      let meshes = 0;
      scene.traverse((object) => {
        if (object.isMesh) meshes++;
      });
      return {
        viewport: { width: innerWidth, height: innerHeight },
        camera: { position: camera.position.toArray(), zoom: camera.zoom },
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        meshes,
        webglError: renderer.getContext().getError(),
        contextLost: renderer.getContext().isContextLost(),
        documentWidth: document.documentElement.scrollWidth,
        construction: document.querySelector('app-town')?.getAttribute('data-construction'),
      };
    });
  };
  const images = [];
  if (proof) {
    await page.getByRole('button', { name: 'Chapter 2', exact: true }).click();
    await page.locator('[data-build-preview="framework-proof-neighbor"]').click();
    await page.waitForTimeout(40);
    assemblyDiagnostics.constructionAtStart = await page
      .locator('app-town')
      .getAttribute('data-construction');
    const stagedFrames = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const visual = window.__frameworkVisual;
          const start = performance.now();
          const samples = [];
          const sample = (name) => {
            visual.renderer.render(visual.scene, visual.camera);
            const source = visual.renderer.domElement;
            const output = document.createElement('canvas');
            output.width = source.width;
            output.height = source.height;
            const context = output.getContext('2d');
            context.fillStyle = '#e8ede4';
            context.fillRect(0, 0, output.width, output.height);
            context.drawImage(source, 0, 0);
            let meshes = 0;
            visual.scene.traverse((object) => {
              if (object.isMesh) meshes++;
            });
            samples.push({
              name,
              elapsedMs: Math.round(performance.now() - start),
              dataUrl: output.toDataURL('image/png'),
              construction: document.querySelector('app-town')?.getAttribute('data-construction'),
              viewport: { width: innerWidth, height: innerHeight },
              camera: { position: visual.camera.position.toArray(), zoom: visual.camera.zoom },
              drawCalls: visual.renderer.info.render.calls,
              triangles: visual.renderer.info.render.triangles,
              meshes,
              webglError: visual.renderer.getContext().getError(),
              contextLost: visual.renderer.getContext().isContextLost(),
            });
          };
          setTimeout(() => sample('chapter-2-framework-proof-early'), 100);
          setTimeout(() => {
            sample('chapter-2-framework-proof-middle');
            resolve(samples);
          }, 2500);
        }),
    );
    for (const sample of stagedFrames) {
      const { dataUrl, ...metrics } = sample;
      const file = `${directory}/${metrics.name}.png`;
      await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
      images.push({ ...metrics, image: file.split(/[\\/]/).at(-1) });
    }
    await page.waitForFunction(
      () => document.querySelector('app-town')?.getAttribute('data-construction') === 'idle',
      undefined,
      { timeout: 30000 },
    );
    await page.evaluate(() => {
      const { renderer, camera } = window.__frameworkVisual;
      const target = { x: 5.25, y: 1.8, z: -4 };
      camera.position.set(target.x + 24, target.y + 19.8, target.z + 24);
      camera.zoom = 0.72;
      camera.lookAt(target.x, target.y, target.z);
      camera.updateProjectionMatrix();
      renderer.render(window.__frameworkVisual.scene, camera);
    });
    await page.waitForTimeout(200);
    images.push({
      name: 'chapter-2-framework-proof-complete',
      ...(await capture('chapter-2-framework-proof-complete')),
    });
    images.push({
      name: 'chapter-2-framework-neighbor-proof',
      ...(await capture('chapter-2-framework-neighbor-proof')),
    });
  } else {
    const name = 'chapter-2-original-neighbor-baseline';
    images.push({ name, ...(await capture(name)) });
  }
  const metrics = images.at(-1);
  const result = {
    sourceCommit,
    scenario:
      'Chapter 2, first neighbor, Craftsman design beside a widely spaced starter property.',
    proofEnabled: proof,
    assemblyDiagnostics,
    profile: 'Fresh browser profile; preview-only state, no genuine save data.',
    image: `${metrics.name}.png`,
    images,
    errors,
    warnings,
    ...metrics,
  };
  await writeFile(`${directory}/${metrics.name}.json`, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await context.close();
  await browser.close();
}
