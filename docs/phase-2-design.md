# Phase 2: first home and Developer Preview

Authority: the owner's Phase 2 brief, 2026-10-17, including autonomous implementation and publication. Existing application at904c632; baseline52unit tests passed again before editing. Extend the current Angular/Three.js application; no new city projects, health systems, cars, backend or art replacement.

## Inspection and risks

The real store owns one localStorage JSON record under`foundations.v1`, Web Locks for serialized changes, exact persisted-baseline conflict protection, cross-tab storage events and recovery/export. Existing v1 imports require`designs.home`, including zero-star towns. Completion history is immutable and is the source of lifetime/daily stars. Eight existing project definitions use fixed thresholds; home is currently threshold0. The renderer always builds the initial home and batches every static mesh across the world. Camera saves are debounced200ms; this is a leakage risk when switching between real and preview views.

The principal risks are misclassifying zero-star existing saves, losing unknown fields in migration, mistaking a zero reward for an invalid completion, exporting preview data, late camera callbacks crossing session boundaries, overwriting newer real progress while preview is open, and saving only after an animation. Tests will pin these boundaries before implementation.

## Decisions

Use version2 with explicit`onboarding.firstHomeUnlocked`. Only genuinely new records start with no home. Every valid v1 record migrates conservatively with its existing house and every field/history/design preserved, regardless of stars. Retain the existing storage key so profiles do not fork. Copy original v1 bytes once to`foundations.pre-v2` before overwriting; if that backup or main write fails, retain original disk data and warn. Unsupported versions/invalid records remain protected. Imports preserve unknown fields by cloning/spreading validated objects rather than reconstructing a whitelist.

Record first-home eligibility in the same immutable result that appends a valid completion, even when its earned stars are zero. Home's condition changes from threshold0 to this flag; later star thresholds and IDs stay unchanged. Imported v2 recorded completions repair a missing false unlock conservatively. Selection is separate from eligibility: pending choices survive reloads. Existing built homes bypass onboarding.

Keep real state and an optional disposable preview session in separate signals. The displayed state chooses the preview copy; only the real signal can reach persistence, migration backup, normal export and tab synchronization. Preview star totals are explicit simulated metadata, never fake rewards written into real history. All preview controls route to the memory copy; real restore is blocked during preview. Storage events continue updating real state behind the preview, so exit reveals the latest genuine progress. No preview flag/session goes into storage. A session epoch invalidates stale camera debounces and queued actions at transitions.

Use a nonmodal house-selection sheet beside the existing live 3D view. Draft style choices affect rendering only; confirmation persists before animation. Cancel restores the committed house or pending empty lot. All three styles remain free. Reuse the same selector for later house changes. A failed durable home write leaves selection pending and does not start a celebration.

Make the house a separately batched subtree of the same world, retaining shared assets/disposal. This provides a small animation boundary without a renderer rewrite. A2800ms sequence centers the camera, briefly hides then gently raises/scales the saved home, with a restrained DOM warm/sparkle accent. Skip and reduced motion finish immediately. The transient sequence is never persisted; reload shows the saved home. Cancel animation/rAF on disposal or view changes; normal idle remains event-driven.

Developer Preview is available through a deliberate Settings confirmation, with a clear active badge and Exit. Its collapsible, scrollable panel controls simulated stars, existing milestones, all three houses/backyards, visibility, lighting and camera, and five scenarios. Only preview scenarios materialize existing default project choices; real choices are never auto-built or discarded. Normal habits and backup import are unavailable in the preview UI; normal export always exports real data.

## Scope and future city constraints

The same lot/home coordinates and continuous terrain remain. Home always targets the original lot. The current36×29terrain, ±18camera bounds and global material batches limit a future larger city. Future work should expand terrain/camera bounds and introduce spatial lot/chunk batches/LOD; no level map or world rewrite is part of this phase. Existing procedural art/mobile performance limits remain; physical Safari/phone testing is not implied by Chromium emulation.
