# VoltForge — Next Architecture Proposal

> **Status:** Proposal only. No source code has been modified. This document describes what to build next and why.

---

## Problems with the Current Architecture

### 1. Quadratic calibration burden
Every model has an absolute world-space transform. Adding a new motor requires calibrating it against every frame it's compatible with. Adding a new frame requires calibrating every existing motor on it. With N frames and M motors, the worst case is N×M calibrations. Currently: 8 frames × 3 motors = 24 potential positions to dial in, every time manually.

### 2. Three-way manual ID coupling
`MOCK_DB` (Sidebar.tsx), `MODEL_REGISTRY` (Scene.tsx), and `DEFAULT_TRANSFORMS` (Scene.tsx) are three separate hardcoded maps all keyed by the same short part IDs (`"f3"`, `"m2"`, etc.). There is no validation that adding an entry to one map means the others stay in sync. A typo silently falls back to placeholder geometry.

### 3. Data lives in component files
The parts catalog is defined inline in `Sidebar.tsx`. The 3D metadata is inline in `Scene.tsx`. Any data change requires editing UI code. Connecting to Supabase means touching both files, plus the Supabase migration, plus reconciling two ID systems (short strings vs UUIDs).

### 4. ID system fragmentation
The frontend uses short IDs (`"f1"`, `"m2"`). The Supabase `parts` table uses UUIDs. The `seed.sql` has different prices and names than `MOCK_DB`. These two catalogs have already diverged and will continue to diverge until one replaces the other.

---

## Proposal 1: Frame-Based Mount Point System

### The problem it solves

Currently a motor's `DEFAULT_TRANSFORMS` is a world-space position. To place the Sotion motor on a Sur-Ron frame, someone manually dragged the position tool until it looked right. That calibration is baked into the motor's transform entry — and only works for that specific frame. If you swap to the Ebox frame, the motor is in the wrong place.

### The solution: mounts + offsets

Frames declare **mount points** — named positions in the frame's local coordinate space where parts attach.  
Parts declare a **mount offset** — a small adjustment from the mount point to account for manufacturing geometry.

```
WorldPosition(part) = Frame.mounts[slotName].pos 
                    + Part.mountOffset.pos
```

### Data structures

```ts
interface MountPoint {
  pos:   [number, number, number];  // position in frame-local space
  rot:   [number, number, number];  // expected alignment rotation
  scale: [number, number, number];  // usually [1,1,1]
}

interface FrameMounts {
  motor:      MountPoint;
  battery:    MountPoint;
  controller: MountPoint;
  seat?:      MountPoint;
  frontWheel: MountPoint;
  rearWheel:  MountPoint;
}

interface PartMountOffset {
  pos:   [number, number, number];  // small delta from the mount point
  rot:   [number, number, number];  // rotation correction
  scale: [number, number, number];  // part's physical scale factor (mm→m correction)
}
```

### How parts attach

```ts
// Computed at render time — no stored absolute positions
function getPartWorldTransform(
  frameMounts: FrameMounts,
  slot: keyof FrameMounts,
  partOffset: PartMountOffset
): Transform {
  const mount = frameMounts[slot];
  return {
    pos:   addVec3(mount.pos, partOffset.pos),
    rot:   addVec3(mount.rot, partOffset.rot),
    scale: partOffset.scale,
  };
}
```

### Why this is better

| Scenario | Current system | Mount system |
|---|---|---|
| Add 1 new motor | Calibrate against every compatible frame separately | Calibrate motor's offset once per mount type |
| Add 1 new frame | Calibrate every existing motor against it | Define frame's mount points once; motors auto-fit |
| 8 frames × 3 motors | Up to 24 calibrations | 8 mount point sets + 3 motor offsets = 11 calibrations |
| Scale to 20 frames × 10 motors | 200 calibrations | 20 + 10 = 30 calibrations |

### Mount type grouping

Parts with the same `mount_type` spec share mount point geometry. A Sur-Ron frame and any future Sur-Ron-compatible frame have the same motor mount position. This means:

```ts
const MOUNT_POINT_TEMPLATES: Record<string, FrameMounts> = {
  "sur-ron": {
    motor:      { pos: [0.7, -1.25, 2.50], rot: [-1.55, 3.15, 6.27], scale: [1,1,1] },
    battery:    { pos: [0, 1.0, 0.2],       rot: [-Math.PI/6, 0, 0],  scale: [1,1,1] },
    controller: { pos: [0, 1.3, 0.7],       rot: [-Math.PI/4, 0, 0],  scale: [1,1,1] },
    frontWheel: { pos: [0, 0.6, 1.1],       rot: [0, 0, Math.PI/2],   scale: [1,1,1] },
    rearWheel:  { pos: [0, 0.6, -1.1],      rot: [0, 0, Math.PI/2],   scale: [1,1,1] },
  },
  "talaria": { ... },
  "eride":    { ... },
  // ...
};
```

A motor on a Sur-Ron frame uses `MOUNT_POINT_TEMPLATES["sur-ron"].motor` plus the motor's own `mountOffset`. A new motor only needs its `mountOffset` calibrated once, and it works on every Sur-Ron frame automatically.

### Calibration tool change

The Position Tool would show two modes:
1. **Mount mode** (frame selected, no other parts): calibrate the frame's mount points
2. **Offset mode** (frame + part selected): calibrate the part's offset from its mount point

---

## Proposal 2: PARTS_CONFIG — Single Source of Truth

Merge `MOCK_DB`, `MODEL_REGISTRY`, and `DEFAULT_TRANSFORMS` into a single typed config structure.

### The new structure

```ts
// src/data/parts.ts

interface PartModel3D {
  type:      "glb" | "stl";
  url:       string;
  color:     string;
  metalness: number;
  roughness: number;
}

interface PartMountOffset {
  pos:   [number, number, number];
  rot:   [number, number, number];
  scale: [number, number, number];
}

interface PartConfig {
  // Catalog metadata (replaces MOCK_DB)
  id:           string;
  name:         string;
  category:     PartCategory;
  price:        number;
  manufacturer: string;
  specs:        Record<string, string | number | boolean | string[]>;

  // 3D model (replaces MODEL_REGISTRY — optional: parts without models omit this)
  model?: PartModel3D;

  // Position offset from frame mount point (replaces DEFAULT_TRANSFORMS)
  // For frames: their own transform (they don't mount to another part)
  mountOffset?: PartMountOffset;

  // Developer flags
  calibrated?: boolean;  // false = transforms are placeholders
}
```

### Example entries

```ts
export const PARTS_CONFIG: PartConfig[] = [
  // ─── Frames ──────────────────────────────────────────────────────────────
  {
    id: "f1",
    name: "Light Bee X Frame",
    category: "frame",
    price: 450,
    manufacturer: "Sur-Ron",
    specs: { mount_type: "sur-ron" },
    model: {
      type: "glb",
      url: "/models/surron.frame.glb",
      color: "#888888",
      metalness: 0.6,
      roughness: 0.4,
    },
    mountOffset: {
      pos:   [-0.2, -0.9, 7.85],
      rot:   [-0.22, 1.55, 0.2],
      scale: [0.01, 0.01, 0.01],
    },
    calibrated: true,
  },
  {
    id: "f3",
    name: "Ebox Frame",
    category: "frame",
    price: 380,
    manufacturer: "Ebox",
    specs: { mount_type: "ebox" },
    model: {
      type: "stl",
      url: "/models/Ebox%20Frame.stl",
      color: "#777777",
      metalness: 0.6,
      roughness: 0.4,
    },
    mountOffset: { pos: [0,0,0], rot: [0,0,0], scale: [1,1,1] },
    calibrated: false,  // ← visible flag — developer knows this needs work
  },

  // ─── Motors ──────────────────────────────────────────────────────────────
  {
    id: "m1",
    name: "Sotion Motor",
    category: "motor",
    price: 899,
    manufacturer: "Sotion",
    specs: { mount_type: "talaria" },
    model: {
      type: "glb",
      url: "/models/sotionmotor.glb",
      color: "#cccccc",
      metalness: 0.85,
      roughness: 0.15,
    },
    mountOffset: { pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1] },
    // ^ relative to mount point, not absolute world position
    calibrated: true,
  },

  // ─── Parts without models ─────────────────────────────────────────────
  {
    id: "b1",
    name: "Gladiator 72v 42Ah",
    category: "battery",
    price: 2100,
    manufacturer: "ChiBattery",
    specs: { voltage: 72, connector: "qs8" },
    // model: undefined — will render placeholder geometry
  },
];
```

### Derived maps (computed once at module load)

```ts
// Computed lookup maps from the array — fast O(1) access
export const PARTS_BY_ID = Object.fromEntries(PARTS_CONFIG.map(p => [p.id, p]));
export const PARTS_BY_CATEGORY = PARTS_CONFIG.reduce((acc, p) => {
  (acc[p.category] ??= []).push(p);
  return acc;
}, {} as Partial<Record<PartCategory, PartConfig[]>>);
```

### Benefits

- **One file to edit** when adding a part: `src/data/parts.ts`
- **TypeScript enforces completeness**: `calibrated: false` is visible at a glance
- **`model?: PartModel3D` is optional**: parts without models are valid entries
- **Replaces three files** in the component layer — `Sidebar.tsx` and `Scene.tsx` become consumers of `PARTS_BY_CATEGORY` and `PARTS_BY_ID`
- **Supabase migration path**: `PARTS_CONFIG` has the same shape as the `parts` table. When ready, replace the static array with a fetch.

---

## Proposal 3: Reducing Model Loading Complexity

### Current issues

- `GLBModelMesh` and `STLModelMesh` are separate components but have nearly identical prop signatures
- Material application logic is duplicated (both traverse meshes, both apply `MeshStandardMaterial`)
- The `userData.matSet` guard on GLB models is fragile (doesn't survive hot-reload)
- STL models have no preloading path

### Proposed `ModelMesh` component

```tsx
function ModelMesh({ config, transform }: { config: PartModel3D; transform: PartMountOffset }) {
  if (config.type === "glb") {
    return <GLBModelMesh {...config} {...transform} />;
  }
  return <STLModelMesh {...config} {...transform} />;
}
```

No change to the internal implementation — just a cleaner public interface that takes a `PartModel3D` directly rather than spreading individual props.

### STL preloading

```ts
// Fire during app initialization for small STLs worth preloading
const STL_PRELOADS = ["c2", "c3", "s1"]; // Small files (<300 KB)
STL_PRELOADS.forEach(id => {
  const part = PARTS_BY_ID[id];
  if (part?.model?.type === "stl") {
    useLoader.preload(STLLoader, part.model.url);
  }
});
```

### GLB scene cloning for safety

Replace the `userData.matSet` guard with a proper clone:

```tsx
function GLBModelMesh({ url, ... }: ModelProps) {
  const { scene: original } = useGLTF(url);
  const scene = useMemo(() => original.clone(true), [original]);
  
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({ color, metalness, roughness });
      }
    });
  }, [scene]);
  
  return <primitive object={scene} ... />;
}
```

`original.clone(true)` deep-clones the scene graph. The `useMemo` with `[original]` dep means the clone is created once (since `useGLTF` returns a stable reference). Each renderer owns its own scene graph — no shared mutation risk.

---

## Proposal 4: Scalability Improvements

### Part ID strategy

Migrate from opaque short IDs (`"f3"`) to meaningful slugs:

```ts
// Instead of: "f3"
"ebox-frame"

// Instead of: "m1"  
"sotion-fw01"

// Instead of: "c2"
"asi-bac4000"
```

Benefits:
- Readable in localStorage, URLs, Supabase queries, debug logs
- Self-documenting in PARTS_CONFIG
- Easier to reason about when IDs appear in error messages

Add a `slug` column to the Supabase `parts` table as the join key from frontend to database, using the UUID as internal primary key.

### Category-driven rendering

Replace the explicit per-category rendering in `BikePlaceholder`:

```tsx
// Current: repetitive per-category if/else blocks
{frameId && MODEL_REGISTRY[frameId] ? <PartModel .../> : <PlaceholderFrame />}
{motorId && MODEL_REGISTRY[motorId] ? <PartModel .../> : <PlaceholderMotor />}
// ...

// Proposed: data-driven
const PLACEHOLDER_COMPONENTS: Partial<Record<PartCategory, React.FC<{selected: boolean}>>> = {
  frame:      PlaceholderFrame,
  motor:      PlaceholderMotor,
  battery:    PlaceholderBattery,
  controller: PlaceholderController,
};

// In BikePlaceholder:
{(Object.entries(selectedParts) as [PartCategory, Part | null][]).map(([category, part]) => {
  const config = part && PARTS_BY_ID[part.id];
  const Placeholder = PLACEHOLDER_COMPONENTS[category];
  
  if (config?.model) {
    const transform = getPartWorldTransform(frameConfig, category, config.mountOffset);
    return (
      <Suspense key={category} fallback={<LoadingOverlay message={`Loading ${config.model.label}…`} />}>
        <ModelMesh config={config.model} transform={transform} />
      </Suspense>
    );
  }
  
  return Placeholder ? <Placeholder key={category} selected={!!part} /> : null;
})}
```

Adding a new part category now requires: adding a `PlaceholderComponent` to the map and a `PartConfig[]` in `PARTS_CONFIG`. No conditional branches in `BikePlaceholder`.

---

## Technical Debt Reduction Summary

| Debt Item | Current State | Proposed Fix | Phase |
|---|---|---|---|
| 3-way manual ID sync | MOCK_DB + MODEL_REGISTRY + DEFAULT_TRANSFORMS | Merge into PARTS_CONFIG | 1 |
| Absolute world-space transforms | Each part needs per-frame calibration | Frame mount points + part offsets | 3 |
| Scene mutation without cloning | `userData.matSet` guard | `scene.clone(true)` in useMemo | 2 |
| Parts in component files | Inline MOCK_DB in Sidebar.tsx | `src/data/parts.ts` module | 1 |
| Dead `Part.modelUrl` field | Defined but unused | Remove from interface | 1 |
| No calibration visibility | Uncalibrated parts look broken | `calibrated: boolean` flag | 1 |
| ID mismatch (short vs UUID) | Frontend uses `"f1"`, Supabase uses UUIDs | Add `slug` to parts table | 2 |
| No error boundary on Canvas | Silent crash on model load fail | ErrorBoundary wrapper | 1 |
| 112 MB GLB | In public/, no CDN | Draco + CDN | 1 |

---

## Implementation Plan

### Phase 1 — Consolidation (High impact, Low risk)
*Goal: Single source of truth, no behavior changes*

**Files to create:**
- `src/data/parts.ts` — the new `PARTS_CONFIG` array with all 19 parts

**Files to modify:**
- `src/components/configurator/Sidebar.tsx` — remove `MOCK_DB`, import `PARTS_BY_CATEGORY` from `src/data/parts.ts`; remove `React.ElementType`, already-fixed FC import stays
- `src/components/configurator/Scene.tsx` — remove `MODEL_REGISTRY` and `DEFAULT_TRANSFORMS`; import `PARTS_BY_ID` from `src/data/parts.ts`; derive registry/transform lookups from it; add `calibrated: false` warning in Position Tool for uncalibrated parts
- `src/store/useConfiguratorStore.ts` — remove unused `modelUrl?` from `Part` interface
- `src/components/ui/ErrorBoundary.tsx` — new file, wraps Canvas

**Expected difficulty:** Low. Pure refactor — same data, new location. All behavior stays identical. TypeScript will catch any mismatches.  
**Expected impact:** High. Eliminates the fragile three-way sync. Dramatically reduces the cost of adding new parts. Makes the calibration status visible.

---

### Phase 2 — Loading Cleanup & Auth (Medium impact, Low risk)
*Goal: Safer model loading, working auth, builds persisted to localStorage*

**Files to create:**
- `src/lib/saveBuild.ts` — serialize/deserialize `{ selectedParts, transforms }` to localStorage; later, Supabase writes go here too

**Files to modify:**
- `src/components/configurator/Scene.tsx` — replace `userData.matSet` pattern with `scene.clone(true)` in `useMemo`; add STL preloading for small files; extract `ModelMesh` wrapper component
- `src/components/configurator/Sidebar.tsx` — wire "Save Build" to `saveBuild.ts`; restore build from localStorage on mount
- `src/components/ui/LoginModal.tsx` — uncomment Supabase auth calls; add env var validation
- `src/app/layout.tsx` — add server-side session check via `src/utils/supabase/server.ts`; pass auth state to Navbar via RSC props or cookie header
- `src/app/builds/page.tsx` — create as minimal placeholder

**Expected difficulty:** Low-Medium. Auth integration is mechanical; the Supabase clients are already set up. Clone pattern is a one-function change.  
**Expected impact:** Medium. Eliminates the shared scene mutation hazard. Makes "Save Build" functional. Clears the two most prominent demo-blockers.

---

### Phase 3 — Mount Point System (High impact, Medium risk)
*Goal: Frame-relative part positioning; eliminate per-frame recalibration*

**Files to create:**
- `src/data/mounts.ts` — `MOUNT_POINT_TEMPLATES: Record<string, FrameMounts>` keyed by `mount_type`
- `src/lib/transforms.ts` — `getPartWorldTransform(frameConfig, slot, partOffset)` utility

**Files to modify:**
- `src/data/parts.ts` — replace `mountOffset` from world-space to mount-relative offsets; add `mounts: FrameMounts` to frame entries
- `src/components/configurator/Scene.tsx` — `BikePlaceholder` uses `getPartWorldTransform()` instead of reading from `TransformMap` directly; `PositionTool` switches between mount mode (calibrating frame mounts) and offset mode (calibrating part offsets)
- `src/store/useConfiguratorStore.ts` — transforms stored per-part-per-mount-type slot, not per-part globally

**Migration:** Existing calibrated transforms for f1, f2, m1, m2 must be converted. The current absolute world positions become the `mounts[slot].pos` on their respective frames. Motor offsets from the mount point start at `[0,0,0]` and are recalibrated.

**Expected difficulty:** Medium. The Position Tool UI needs a mode switch. The transform math is simple vector addition but requires careful migration of the 4 calibrated models.  
**Expected impact:** Very High. Eliminates N×M calibration burden. Makes the platform scalable to dozens of frames and motors. This is the single biggest architectural improvement available.

---

### Phase 4 — Data Layer & Scale (High impact, High risk)
*Goal: Replace MOCK_DB with live Supabase data; community features*

**Files to create:**
- `src/lib/fetchParts.ts` — async function querying `SELECT * FROM parts` via Supabase
- `src/lib/fetchBuilds.ts` — query public builds for community page
- `src/lib/writeBuild.ts` — insert/update builds in Supabase; requires unified IDs
- `src/app/builds/page.tsx` — full community builds gallery (Server Component)
- `src/app/builds/[id]/page.tsx` — individual build view (read-only configurator)
- Supabase migration: add `slug text UNIQUE` to `parts` table; add `model_type`, `model_url`, `model_color`, `model_metalness`, `model_roughness` columns; populate from `PARTS_CONFIG`

**Files to modify:**
- `src/components/configurator/Sidebar.tsx` — make parts catalog data async; add `Suspense` around the parts list with a skeleton loader
- `src/data/parts.ts` — this file becomes the migration source and can be removed once Supabase is the canonical store
- `src/store/useConfiguratorStore.ts` — potentially move to Zustand persist middleware for localStorage sync

**Expected difficulty:** High. Requires reconciling the two ID systems, running a Supabase migration, handling loading/error states in the catalog, and ensuring RLS policies are correct.  
**Expected impact:** High. Enables everything: community builds, sharing, marketplace, brand partnerships. The platform cannot scale without this.
