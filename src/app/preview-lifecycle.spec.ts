import { afterEach, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { FoundationsStore } from './state.service';
import { TownComponent } from './town/town.component';
import { signal } from '@angular/core';
import { initialState } from './domain/state';

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
  app.previewConstruction({ speed: 2, reducedMotion: true });

  expect(app.previewAssemblyOptions()).toEqual({ speed: 2, reducedMotion: true });
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
