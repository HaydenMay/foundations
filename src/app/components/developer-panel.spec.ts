import { afterEach, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DeveloperPanel } from './developer-panel';
import { PROJECTS } from '../domain/progression';

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

  const speed = fixture.nativeElement.querySelector('#assembly-speed') as HTMLSelectElement;
  speed.value = '2';
  speed.dispatchEvent(new Event('change', { bubbles: true }));
  const reduced = fixture.nativeElement.querySelector('#force-reduced-motion') as HTMLInputElement;
  reduced.checked = true;
  reduced.dispatchEvent(new Event('change', { bubbles: true }));
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

it('offers production Build Preview controls for every existing milestone, including locked ones', () => {
  TestBed.configureTestingModule({ imports: [DeveloperPanel] });
  const fixture = TestBed.createComponent(DeveloperPanel);
  fixture.detectChanges();
  const store = fixture.componentInstance.store;
  store.enterPreview();
  store.previewScenario('new');
  fixture.detectChanges();

  const ids = [...fixture.nativeElement.querySelectorAll('[data-build-preview]')].map(
    (button: HTMLButtonElement) => button.dataset['buildPreview'],
  );
  expect(ids).toEqual([
    'chapter',
    'home',
    'backyard',
    ...PROJECTS.filter((project) => project.id !== 'home' && project.id !== 'backyard').map(
      (project) => project.id,
    ),
  ]);
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
  const speed = fixture.nativeElement.querySelector('#assembly-speed') as HTMLSelectElement;
  speed.value = '2';
  speed.dispatchEvent(new Event('change', { bubbles: true }));
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
