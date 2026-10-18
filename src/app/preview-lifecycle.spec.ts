import { afterEach, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { FoundationsStore } from './state.service';
import { TownComponent } from './town/town.component';
import { signal } from '@angular/core';
import { initialState, STORAGE_KEY } from './domain/state';

afterEach(() => {
  TestBed.resetTestingModule();
  localStorage.clear();
});

it('clears a construction notice when the disposable scenario session changes', () => {
  localStorage.clear();
  TestBed.configureTestingModule({ imports: [App] }).overrideComponent(App, {
    set: { template: '', imports: [] },
  });
  const fixture = TestBed.createComponent(App),
    app = fixture.componentInstance;
  fixture.detectChanges();
  const store = TestBed.inject(FoundationsStore);
  store.enterPreview();
  store.previewScenario('home');
  fixture.detectChanges();
  app.construction.set(7);
  store.previewScenario('all');
  fixture.detectChanges();
  expect(app.construction()).toBe(0);
});

it('keeps assembly playback overrides outside saved preview and genuine state', () => {
  localStorage.clear();
  TestBed.configureTestingModule({ imports: [App] }).overrideComponent(App, {
    set: { template: '', imports: [] },
  });
  const fixture = TestBed.createComponent(App),
    app = fixture.componentInstance;
  fixture.detectChanges();
  const store = TestBed.inject(FoundationsStore);
  const genuine = structuredClone(store.realState());
  store.enterPreview();
  app.previewConstruction({
    projectId: 'frontGarden',
    override: { speed: 2, reducedMotion: true },
  });

  expect(app.previewAssemblyOptions()).toEqual({ speed: 2, reducedMotion: true });
  expect(app.constructionProject()).toBe('frontGarden');
  expect(store.state().designs['home']).toBe('sage');
  expect(store.state().designs['frontGarden']).toBe('roses');
  expect(store.realState()).toEqual(genuine);
  expect(JSON.parse(store.backupJSON())).toEqual(genuine);
});

it('replays a visible milestone without changing its choice or the real save', () => {
  localStorage.clear();
  TestBed.configureTestingModule({ imports: [App] }).overrideComponent(App, {
    set: { template: '', imports: [] },
  });
  const fixture = TestBed.createComponent(App),
    app = fixture.componentInstance;
  fixture.detectChanges();
  const store = TestBed.inject(FoundationsStore),
    genuine = structuredClone(store.realState());
  store.enterPreview();
  store.previewScenario('all');
  store.previewDesign('frontGarden', 'blue');
  const chosen = store.state().designs['frontGarden'];
  app.previewConstruction({ projectId: 'frontGarden', override: { speed: 0.5 } });
  const firstRequest = app.construction();
  app.previewConstruction({ projectId: 'frontGarden', override: { speed: 0.5 } });

  expect(app.construction()).toBe(firstRequest + 1);
  expect(store.state().designs['frontGarden']).toBe(chosen);
  expect(store.realState()).toEqual(genuine);
  expect(JSON.parse(store.backupJSON())).toEqual(genuine);
});

it('keeps multi-piece boundary construction and its selected wall out of real persistence', async () => {
  localStorage.clear();
  TestBed.configureTestingModule({ imports: [App] }).overrideComponent(App, {
    set: { template: '', imports: [] },
  });
  const fixture = TestBed.createComponent(App),
    app = fixture.componentInstance;
  fixture.detectChanges();
  await fixture.whenStable();
  const store = TestBed.inject(FoundationsStore),
    genuine = structuredClone(store.realState()),
    serialized = localStorage.getItem(STORAGE_KEY),
    backup = store.backupJSON();
  store.enterPreview();
  store.previewScenario('all');
  store.previewDesign('boundary', 'stoneWall');

  app.previewConstruction({ projectId: 'boundary', override: { speed: 0.5 } });

  expect(app.constructionProject()).toBe('boundary');
  expect(app.previewAssemblyOptions()).toEqual({ speed: 0.5 });
  expect(store.state().designs['boundary']).toBe('stoneWall');
  expect(store.realState()).toEqual(genuine);
  expect(localStorage.getItem(STORAGE_KEY)).toBe(serialized);
  expect(store.backupJSON()).toBe(backup);
  store.exitPreview();
  expect(store.state()).toEqual(genuine);
});

it('makes the existing empty-parcel recipe available for preview without saving simulated stars', () => {
  localStorage.clear();
  TestBed.configureTestingModule({ imports: [App] }).overrideComponent(App, {
    set: { template: '', imports: [] },
  });
  const fixture = TestBed.createComponent(App),
    app = fixture.componentInstance;
  fixture.detectChanges();
  const store = TestBed.inject(FoundationsStore),
    genuine = structuredClone(store.realState());
  store.enterPreview();
  app.previewConstruction({ projectId: 'chapter', override: {} });

  expect(app.constructionProject()).toBe('chapter');
  expect(store.stars()).toBe(100);
  expect(store.preview()?.hiddenDesigns['chapter']).toBeUndefined();
  expect(store.realState()).toEqual(genuine);
  expect(JSON.parse(store.backupJSON())).toEqual(genuine);
});

it('clears only the matching construction notice after playback cancellation', () => {
  localStorage.clear();
  TestBed.configureTestingModule({ imports: [App] }).overrideComponent(App, {
    set: { template: '', imports: [] },
  });
  const fixture = TestBed.createComponent(App),
    app = fixture.componentInstance;
  fixture.detectChanges();
  const store = TestBed.inject(FoundationsStore);
  app.construction.set(5);
  app.constructionCancelled({ id: 4, sessionKey: store.sessionKey() });
  expect(app.construction()).toBe(5);
  app.constructionCancelled({ id: 5, sessionKey: store.sessionKey() });
  expect(app.construction()).toBe(0);
});

it('does not replay a previous construction request when restoring a new session camera', () => {
  const preferences = initialState('2026-10-17').preferences;
  const designs = { home: 'sage' };
  const scene = {
    cancelConstruction: vi.fn(),
    setDesigns: vi.fn(),
    setLighting: vi.fn(),
    camera: { set: vi.fn() },
    celebrate: vi.fn(),
  };
  // Drive the actual input synchronizer without a WebGL driver or component constructor.
  const town: TownComponent = Object.create(TownComponent.prototype);
  Object.assign(town, {
    scene,
    lastSession: 1,
    lastConstruction: 7,
    lastDesigns: JSON.stringify(designs),
    building: signal(true),
  });
  const sync = (
    town as unknown as {
      sync: (
        d: Record<string, string>,
        p: typeof preferences,
        session: number,
        request: number,
        options?: { speed: number; reducedMotion: boolean },
      ) => void;
    }
  ).sync;
  sync.call(town, designs, preferences, 2, 7);
  expect(scene.cancelConstruction).toHaveBeenCalledOnce();
  expect(scene.celebrate).not.toHaveBeenCalled();
  expect(town.building()).toBe(false);
  expect(scene.camera.set).toHaveBeenCalledWith(preferences.camera);
  sync.call(town, designs, preferences, 2, 8);
  expect(scene.celebrate).toHaveBeenCalledOnce();
  expect(town.building()).toBe(true);
});

it('cancels active playback when its house asset is replaced', () => {
  const preferences = initialState('2026-10-17').preferences;
  const scene = {
    cancelConstruction: vi.fn(),
    setDesigns: vi.fn(),
    setLighting: vi.fn(),
    camera: { set: vi.fn() },
    celebrate: vi.fn(),
  };
  const cancelled = vi.fn();
  const town: TownComponent = Object.create(TownComponent.prototype);
  Object.assign(town, {
    scene,
    lastSession: 3,
    lastConstruction: 9,
    lastDesigns: JSON.stringify({ home: 'sage' }),
    lastCamera: JSON.stringify(preferences.camera),
    incomingCamera: JSON.stringify(preferences.camera),
    building: signal(true),
    constructionCancelled: { emit: cancelled },
  });
  const sync = (
    town as unknown as {
      sync: (
        d: Record<string, string>,
        p: typeof preferences,
        session: number,
        request: number,
        options?: { speed: number; reducedMotion: boolean },
      ) => void;
    }
  ).sync;
  sync.call(town, { home: 'blue' }, preferences, 3, 9);
  expect(scene.cancelConstruction).toHaveBeenCalledOnce();
  expect(cancelled).toHaveBeenCalledWith({ id: 9, sessionKey: 3 });
  expect(scene.setDesigns).toHaveBeenCalledWith({ home: 'blue' });
  expect(town.building()).toBe(false);
});

it('passes transient preview assembly overrides only to a requested construction', () => {
  const preferences = initialState('2026-10-17').preferences;
  const designs = { home: 'sage' },
    override = { speed: 2, reducedMotion: true },
    scene = {
      cancelConstruction: vi.fn(),
      setDesigns: vi.fn(),
      setLighting: vi.fn(),
      camera: { set: vi.fn() },
      celebrate: vi.fn(),
    };
  const town: TownComponent = Object.create(TownComponent.prototype);
  Object.assign(town, {
    scene,
    lastSession: 1,
    lastConstruction: 0,
    lastDesigns: JSON.stringify(designs),
    lastCamera: JSON.stringify(preferences.camera),
    incomingCamera: JSON.stringify(preferences.camera),
    assemblyOptions: () => override,
    building: signal(false),
  });
  const sync = (
    town as unknown as {
      sync: (
        d: Record<string, string>,
        p: typeof preferences,
        session: number,
        request: number,
        options?: { speed: number; reducedMotion: boolean },
      ) => void;
    }
  ).sync;
  sync.call(town, designs, preferences, 1, 4, override);
  expect(scene.celebrate).toHaveBeenCalledWith(expect.any(Function), override);
});

it('dispatches a confirmed milestone construction to its own scene assembly', () => {
  const preferences = initialState('2026-10-17').preferences;
  const designs = { home: 'sage', frontGarden: 'roses' },
    scene = {
      cancelConstruction: vi.fn(),
      setDesigns: vi.fn(),
      setLighting: vi.fn(),
      camera: { set: vi.fn() },
      celebrate: vi.fn(),
      celebrateProject: vi.fn(),
    };
  const town: TownComponent = Object.create(TownComponent.prototype);
  Object.assign(town, {
    scene,
    lastSession: 1,
    lastConstruction: 0,
    lastDesigns: JSON.stringify(designs),
    lastCamera: JSON.stringify(preferences.camera),
    incomingCamera: JSON.stringify(preferences.camera),
    constructionProject: () => 'frontGarden',
    building: signal(false),
  });
  const sync = (
    town as unknown as {
      sync: (
        d: Record<string, string>,
        p: typeof preferences,
        session: number,
        request: number,
      ) => void;
    }
  ).sync;
  sync.call(town, designs, preferences, 1, 8);
  expect(scene.celebrate).not.toHaveBeenCalled();
  expect(scene.celebrateProject).toHaveBeenCalledWith(
    'frontGarden',
    expect.any(Function),
    undefined,
  );
});

it('replays an already visible milestone on repeated requests without rebuilding the world', () => {
  const preferences = initialState('2026-10-17').preferences,
    designs = { home: 'sage', frontGarden: 'blue' },
    options = { speed: 2 },
    scene = {
      cancelConstruction: vi.fn(),
      setDesigns: vi.fn(),
      setLighting: vi.fn(),
      camera: { set: vi.fn() },
      celebrate: vi.fn(),
      celebrateProject: vi.fn(),
    };
  const town: TownComponent = Object.create(TownComponent.prototype);
  Object.assign(town, {
    scene,
    lastSession: 1,
    lastConstruction: 7,
    lastDesigns: JSON.stringify(designs),
    lastCamera: JSON.stringify(preferences.camera),
    incomingCamera: JSON.stringify(preferences.camera),
    constructionProject: () => 'frontGarden',
    assemblyOptions: () => options,
    building: signal(false),
  });
  const sync = (
    town as unknown as {
      sync: (
        d: Record<string, string>,
        p: typeof preferences,
        session: number,
        request: number,
        options?: { speed: number },
      ) => void;
    }
  ).sync;

  sync.call(town, designs, preferences, 1, 8, options);
  sync.call(town, designs, preferences, 1, 9, options);

  expect(scene.setDesigns).not.toHaveBeenCalled();
  expect(scene.celebrateProject).toHaveBeenCalledTimes(2);
  expect(scene.celebrateProject).toHaveBeenNthCalledWith(
    2,
    'frontGarden',
    expect.any(Function),
    options,
  );
});
