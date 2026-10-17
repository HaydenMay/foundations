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

it('does not replay a previous construction request when restoring a new session camera', () => {
  const preferences = initialState('2026-10-17').preferences;
  const designs = { home: 'sage' };
  const scene = {
    finishConstruction: vi.fn(),
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
      ) => void;
    }
  ).sync;
  sync.call(town, designs, preferences, 2, 7);
  expect(scene.finishConstruction).toHaveBeenCalledOnce();
  expect(scene.celebrate).not.toHaveBeenCalled();
  expect(town.building()).toBe(false);
  expect(scene.camera.set).toHaveBeenCalledWith(preferences.camera);
  sync.call(town, designs, preferences, 2, 8);
  expect(scene.celebrate).toHaveBeenCalledOnce();
  expect(town.building()).toBe(true);
});
