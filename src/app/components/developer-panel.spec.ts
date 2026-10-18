import { afterEach, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DeveloperPanel } from './developer-panel';
import { CHAPTER_TWO_PROJECTS, PROJECTS } from '../domain/progression';

afterEach(() => {
  TestBed.resetTestingModule();
  localStorage.clear();
});

it('emits selected assembly speed and the optional reduced-motion override', () => {
  TestBed.configureTestingModule({ imports: [DeveloperPanel] });
  const fixture = TestBed.createComponent(DeveloperPanel),
    emitted = vi.fn();
  fixture.componentInstance.construct.subscribe(emitted);
  fixture.detectChanges();
  (
    fixture.nativeElement.querySelector(
      '[aria-label="Preview chapter"] button:nth-child(3)',
    ) as HTMLButtonElement
  ).click();
  fixture.detectChanges();

  const speed = fixture.nativeElement.querySelector('#assembly-speed') as HTMLSelectElement;
  speed.value = '2';
  speed.dispatchEvent(new Event('change', { bubbles: true }));
  const reduced = fixture.nativeElement.querySelector('#force-reduced-motion') as HTMLInputElement;
  reduced.checked = true;
  reduced.dispatchEvent(new Event('change', { bubbles: true }));
  (
    fixture.nativeElement.querySelector(
      '[aria-label="Preview chapter"] button:nth-child(1)',
    ) as HTMLButtonElement
  ).click();
  fixture.detectChanges();
  const action = fixture.nativeElement.querySelector(
    '[data-build-preview="home"]',
  ) as HTMLButtonElement;
  action.click();

  expect(emitted).toHaveBeenCalledWith({
    projectId: 'home',
    override: { speed: 2, reducedMotion: true },
  });
});

it('leaves operating-system reduced-motion preference in control unless forced', () => {
  TestBed.configureTestingModule({ imports: [DeveloperPanel] });
  const fixture = TestBed.createComponent(DeveloperPanel),
    emitted = vi.fn();
  fixture.componentInstance.construct.subscribe(emitted);
  fixture.detectChanges();
  const action = fixture.nativeElement.querySelector(
    '[data-build-preview="home"]',
  ) as HTMLButtonElement;
  action.click();
  expect(emitted).toHaveBeenCalledWith({ projectId: 'home', override: { speed: 1 } });
});

it('supports extra-slow preview replays for inspecting construction frames', () => {
  TestBed.configureTestingModule({ imports: [DeveloperPanel] });
  const fixture = TestBed.createComponent(DeveloperPanel),
    emitted = vi.fn();
  fixture.componentInstance.construct.subscribe(emitted);
  fixture.detectChanges();
  fixture.componentInstance.setAssemblySpeed({ target: { value: '0.25' } } as unknown as Event);
  fixture.nativeElement.querySelector('[data-build-preview="porch"]').click();

  expect(emitted).toHaveBeenCalledWith({ projectId: 'porch', override: { speed: 0.25 } });
});

it('groups preview controls by chapter and keeps only the selected chapter visible', () => {
  TestBed.configureTestingModule({ imports: [DeveloperPanel] });
  const fixture = TestBed.createComponent(DeveloperPanel);
  fixture.detectChanges();
  const store = fixture.componentInstance.store;
  store.enterPreview();
  store.previewScenario('new');
  fixture.detectChanges();

  const chapterOne = [...fixture.nativeElement.querySelectorAll('[data-build-preview]')].map(
    (button: HTMLButtonElement) => button.dataset['buildPreview'],
  );
  expect(chapterOne).toEqual([
    'home',
    'backyard',
    ...PROJECTS.filter((project) => project.id !== 'home' && project.id !== 'backyard').map(
      (project) => project.id,
    ),
  ]);

  (
    fixture.nativeElement.querySelector(
      '[aria-label="Preview chapter"] button:nth-child(2)',
    ) as HTMLButtonElement
  ).click();
  fixture.detectChanges();
  const chapterTwo = [...fixture.nativeElement.querySelectorAll('[data-build-preview]')].map(
    (button: HTMLButtonElement) => button.dataset['buildPreview'],
  );
  expect(chapterTwo).toEqual([
    'ch2-neighborhood',
    ...CHAPTER_TWO_PROJECTS.map((project) => project.id),
  ]);
  expect(fixture.nativeElement.querySelector('[data-preview-project="frontGarden"]')).toBeNull();

  (
    fixture.nativeElement.querySelector(
      '[aria-label="Preview chapter"] button:nth-child(3)',
    ) as HTMLButtonElement
  ).click();
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('[data-build-preview]')).toBeNull();
  expect(fixture.nativeElement.querySelector('#preview-light')).not.toBeNull();
});

it('offers each Chapter 2 neighbor style and the continuous road only in the Chapter 2 tab', () => {
  TestBed.configureTestingModule({ imports: [DeveloperPanel] });
  const fixture = TestBed.createComponent(DeveloperPanel);
  fixture.detectChanges();
  const store = fixture.componentInstance.store;
  store.enterPreview();
  store.previewScenario('neighborhood');
  (
    fixture.nativeElement.querySelector(
      '[aria-label="Preview chapter"] button:nth-child(2)',
    ) as HTMLButtonElement
  ).click();
  fixture.detectChanges();

  const lotOne = fixture.nativeElement.querySelector(
    '[data-preview-project="ch2-neighbor-1"]',
  ) as HTMLSelectElement;
  expect([...lotOne.options].map((option) => option.value)).toEqual([
    'cottage',
    'craftsman',
    'brick',
  ]);
  expect(
    fixture.nativeElement.querySelector('[data-preview-visible="ch2-neighborhood"]'),
  ).not.toBeNull();
  expect(store.realState().designs['ch2-neighborhood']).toBeUndefined();
});

it('replays the Chapter 2 welcome and completion notices in preview state only', () => {
  TestBed.configureTestingModule({ imports: [DeveloperPanel] });
  const fixture = TestBed.createComponent(DeveloperPanel);
  fixture.detectChanges();
  const store = fixture.componentInstance.store,
    real = structuredClone(store.realState());
  store.enterPreview();
  (
    fixture.nativeElement.querySelector(
      '[aria-label="Preview chapter"] button:nth-child(2)',
    ) as HTMLButtonElement
  ).click();
  fixture.detectChanges();

  const welcome = [...fixture.nativeElement.querySelectorAll('button')].find(
    (button: HTMLButtonElement) => button.textContent?.includes('Replay Chapter 2 welcome'),
  ) as HTMLButtonElement;
  welcome.click();
  expect(store.chapterNotice()).toBe('neighborhood');
  fixture.componentInstance.replayNotice('complete');
  expect(store.chapterNotice()).toBe('complete');
  expect(store.stars()).toBe(200);
  expect(store.realState()).toEqual(real);
});

it('emits the chosen locked milestone replay target without changing the genuine save', () => {
  TestBed.configureTestingModule({ imports: [DeveloperPanel] });
  const fixture = TestBed.createComponent(DeveloperPanel),
    emitted = vi.fn();
  fixture.componentInstance.construct.subscribe(emitted);
  fixture.detectChanges();
  const store = fixture.componentInstance.store,
    genuine = structuredClone(store.realState());
  store.enterPreview();
  store.previewScenario('new');
  fixture.detectChanges();
  (
    fixture.nativeElement.querySelector(
      '[aria-label="Preview chapter"] button:nth-child(3)',
    ) as HTMLButtonElement
  ).click();
  fixture.detectChanges();
  const speed = fixture.nativeElement.querySelector('#assembly-speed') as HTMLSelectElement;
  speed.value = '2';
  speed.dispatchEvent(new Event('change', { bubbles: true }));
  (
    fixture.nativeElement.querySelector(
      '[aria-label="Preview chapter"] button:nth-child(1)',
    ) as HTMLButtonElement
  ).click();
  fixture.detectChanges();
  const control = fixture.nativeElement.querySelector(
    '[data-build-preview="frontGarden"]',
  ) as HTMLButtonElement;
  control.click();

  expect(emitted).toHaveBeenCalledWith({ projectId: 'frontGarden', override: { speed: 2 } });
  expect(store.realState()).toEqual(genuine);
});

it('offers every current milestone appearance and visibility toggle inside preview only', () => {
  TestBed.configureTestingModule({ imports: [DeveloperPanel] });
  const fixture = TestBed.createComponent(DeveloperPanel);
  fixture.detectChanges();
  const store = fixture.componentInstance.store,
    genuine = structuredClone(store.realState());
  store.enterPreview();
  fixture.detectChanges();
  const projects = [...fixture.nativeElement.querySelectorAll('[data-preview-project]')].map(
    (select: HTMLSelectElement) => select.dataset['previewProject'],
  );
  expect(projects).toEqual(
    PROJECTS.filter((project) => project.id !== 'home' && project.id !== 'backyard').map(
      (project) => project.id,
    ),
  );
  const centerpiece = fixture.nativeElement.querySelector(
    '[data-preview-project="centerpiece"]',
  ) as HTMLSelectElement;
  centerpiece.value = 'fountain';
  centerpiece.dispatchEvent(new Event('change', { bubbles: true }));
  fixture.detectChanges();
  expect(store.state().designs['centerpiece']).toBe('fountain');
  const visible = fixture.nativeElement.querySelector(
    '[data-preview-visible="centerpiece"]',
  ) as HTMLInputElement;
  visible.checked = false;
  visible.dispatchEvent(new Event('change', { bubbles: true }));
  fixture.detectChanges();
  expect(store.state().designs['centerpiece']).toBeUndefined();
  expect(store.preview()?.hiddenDesigns['centerpiece']).toBe('fountain');
  expect(store.realState()).toEqual(genuine);
});
