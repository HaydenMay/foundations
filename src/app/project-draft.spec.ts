import { afterEach, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { FoundationsStore } from './state.service';
import { completeHabit } from './domain/habits';
import { exportState, initialState, STORAGE_KEY } from './domain/state';
import { PROJECTS } from './domain/progression';

afterEach(() => {
  TestBed.resetTestingModule();
  localStorage.clear();
  vi.restoreAllMocks();
});

function earnedOriginalHome() {
  let state = initialState('2026-10-01');
  for (const date of ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'])
    state = completeHabit(state, state.habits[0].id, date);
  state.onboarding.firstHomeUnlocked = true;
  state.designs['home'] = 'sage';
  return state;
}

function mount() {
  TestBed.configureTestingModule({ imports: [App] }).overrideComponent(App, {
    set: { template: '<dialog #dialog></dialog>', imports: [] },
  });
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  const app = fixture.componentInstance;
  vi.spyOn(app, 'show').mockImplementation((kind) => app.overlay.set(kind));
  return { fixture, app, store: TestBed.inject(FoundationsStore) };
}

it('shows a selected complete design in the real town without saving it before confirmation', () => {
  localStorage.setItem(STORAGE_KEY, exportState(earnedOriginalHome()));
  const { fixture, app, store } = mount(),
    before = localStorage.getItem(STORAGE_KEY),
    project = PROJECTS.find((candidate) => candidate.id === 'frontGarden')!;
  app.choose(project);
  app.select('roses');
  fixture.detectChanges();

  expect(app.renderDesigns()['frontGarden']).toBe('roses');
  expect(store.realState().designs['frontGarden']).toBeUndefined();
  expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
});

it('cancels an in-world design preview and restores the committed design', () => {
  const initial = earnedOriginalHome();
  initial.designs['frontGarden'] = 'orange';
  localStorage.setItem(STORAGE_KEY, exportState(initial));
  const { fixture, app, store } = mount();
  app.choose(PROJECTS.find((candidate) => candidate.id === 'frontGarden')!);
  app.select('blue');
  fixture.detectChanges();
  expect(app.renderDesigns()['frontGarden']).toBe('blue');
  app.cancelProject();
  fixture.detectChanges();
  expect(app.renderDesigns()['frontGarden']).toBe('orange');
  expect(store.realState().designs['frontGarden']).toBe('orange');
});

it('keeps a complete design preview visible after closing the choice dialog', () => {
  const initial = earnedOriginalHome();
  initial.designs['frontGarden'] = 'orange';
  localStorage.setItem(STORAGE_KEY, exportState(initial));
  const { fixture, app, store } = mount(),
    before = localStorage.getItem(STORAGE_KEY),
    camera = { focusProjectPreview: vi.fn(), restoreProjectPreviewCamera: vi.fn() };
  vi.spyOn(app, 'town').mockReturnValue(camera as never);
  app.choose(PROJECTS.find((candidate) => candidate.id === 'frontGarden')!);
  app.select('blue');
  app.viewProjectPreview();
  fixture.detectChanges();

  expect(app.previewingProject()).toBe(true);
  expect(camera.focusProjectPreview).toHaveBeenCalledWith('frontGarden');
  expect(app.renderDesigns()['frontGarden']).toBe('blue');
  expect(store.realState().designs['frontGarden']).toBe('orange');
  expect(localStorage.getItem(STORAGE_KEY)).toBe(before);

  app.cancelProject();
  fixture.detectChanges();
  expect(camera.restoreProjectPreviewCamera).toHaveBeenCalledOnce();
  expect(app.previewingProject()).toBe(false);
  expect(app.renderDesigns()['frontGarden']).toBe('orange');
});

it('durably confirms a milestone design before requesting its assembly reveal', async () => {
  localStorage.setItem(STORAGE_KEY, exportState(earnedOriginalHome()));
  const { fixture, app, store } = mount();
  app.choose(PROJECTS.find((candidate) => candidate.id === 'frontGarden')!);
  app.select('blue');
  await app.confirmProject();
  fixture.detectChanges();

  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).designs['frontGarden']).toBe('blue');
  expect(store.realState().designs['frontGarden']).toBe('blue');
  expect(app.constructionProject()).toBe('frontGarden');
  expect(app.construction()).toBeGreaterThan(0);
});

it('reveals the connected neighborhood when lifetime stars cross 100 and does not replay after reload', async () => {
  let state = initialState('2026-01-01');
  for (let day = 0; day < 48; day++) {
    const date = new Date(Date.UTC(2026, 0, 1 + day)).toISOString().slice(0, 10);
    state = completeHabit(state, state.habits[0].id, date);
  }
  const lastDate = new Date(Date.UTC(2026, 0, 49)).toISOString().slice(0, 10);
  state = completeHabit(state, state.habits[1].id, lastDate);
  state.onboarding.firstHomeUnlocked = true;
  state.designs['home'] = 'sage';
  localStorage.setItem(STORAGE_KEY, exportState(state));
  TestBed.configureTestingModule({ imports: [App] }).overrideComponent(App, {
    set: { template: '<dialog #dialog></dialog>', imports: [] },
  });
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  const app = fixture.componentInstance,
    store = TestBed.inject(FoundationsStore);
  expect(store.stars()).toBe(97);
  expect(app.renderDesigns()['ch2-neighborhood']).toBeUndefined();
  await store.complete(state.habits[2].id);
  fixture.detectChanges();
  expect(store.stars()).toBe(100);
  expect(app.renderDesigns()['ch2-neighborhood']).toBe('reveal');
  expect(app.constructionProject()).toBe('ch2-neighborhood');
  expect(app.construction()).toBeGreaterThan(0);
  await store.acknowledgeChapterNotice('neighborhood');

  fixture.destroy();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [App] }).overrideComponent(App, {
    set: { template: '<dialog #dialog></dialog>', imports: [] },
  });
  const reopened = TestBed.createComponent(App);
  reopened.detectChanges();
  expect(reopened.componentInstance.renderDesigns()['ch2-neighborhood']).toBe('reveal');
  expect(reopened.componentInstance.construction()).toBe(0);
});

it('queues a genuine chapter reveal delivered by another tab while preview is active', () => {
  let state = initialState('2026-01-01');
  for (let day = 0; day < 48; day++) {
    const date = new Date(Date.UTC(2026, 0, day + 1)).toISOString().slice(0, 10);
    state = completeHabit(state, state.habits[0].id, date);
  }
  state = completeHabit(state, state.habits[1].id, '2026-02-18');
  state.onboarding.firstHomeUnlocked = true;
  state.designs['home'] = 'sage';
  localStorage.setItem(STORAGE_KEY, exportState(state));
  const { fixture, app, store } = mount();
  expect(store.stars()).toBe(97);
  store.enterPreview();
  store.previewScenario('all');
  fixture.detectChanges();
  expect(app.construction()).toBe(0);

  const genuine = completeHabit(state, state.habits[2].id, '2026-02-19'),
    raw = exportState(genuine);
  localStorage.setItem(STORAGE_KEY, raw);
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: raw }));
  fixture.detectChanges();
  expect(store.stars()).toBe(200);
  expect(app.construction()).toBe(0);

  store.exitPreview();
  fixture.detectChanges();
  expect(store.stars()).toBe(100);
  expect(app.constructionProject()).toBe('ch2-neighborhood');
  expect(app.construction()).toBeGreaterThan(0);
});
