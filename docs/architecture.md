# VoltForge — Architecture

## Overview

VoltForge is a **single-route Next.js application**. There is one page (`/`) — the configurator. Everything else (auth, community builds) is either a modal overlay or an unimplemented route. The architecture is client-side heavy; the server boundary exists only at the root layout level.

---

## Data Flow

```
User selects a part in Sidebar
        │
        ▼
useConfiguratorStore.setPart(category, part)
        │
        ├──► evaluateCompatibility(newParts)
        │           │
        │           └──► issues[] ──► Sidebar renders banners
        │
        └──► selectedParts updated
                    │
                    ▼
            Scene subscribed via useConfiguratorStore()
                    │
                    ├──► BikePlaceholder re-renders
                    │       ├── selectedParts.frame?.id in MODEL_REGISTRY?
                    │       │     yes → <Suspense><PartModel /></Suspense>
                    │       │     no  → placeholder geometry
                    │       └── (same for motor, battery, controller, seat)
                    │
                    └──► PositionTool.activeModels recomputed
                              │
                              └──► tab appears for newly selected model

User drags slider / types value in PositionTool
        │
        ▼
setTransforms(prev → updated TransformMap)
        │
        ├──► useEffect → localStorage.setItem('voltforge_transforms', ...)
        │
        └──► BikePlaceholder re-renders with new pos/rot/scale
```

**There is no server round-trip in the current flow.** All state is client-local.

---

## Zustand State Management

Single store defined in `src/store/useConfiguratorStore.ts`.

```ts
interface ConfiguratorState {
  selectedParts: Record<PartCategory, Part | null>;
  issues: CompatibilityIssue[];
  setPart: (category: PartCategory, part: Part | null) => void;
  clearBuild: () => void;
  totalPrice: () => number;
}
```

### Key behaviors

- **`setPart()`** is the only mutation. It updates `selectedParts` and immediately calls `evaluateCompatibility()`, storing the result in `issues`. Both updates happen in a single `set()` call (atomic).
- **`totalPrice()`** is a derived value computed on read (not cached) — iterates `Object.values(selectedParts)` and sums `part.price`.
- **No persistence** — the store is ephemeral. On page refresh, `selectedParts` resets to all-null. This is a known gap; builds are not saved.
- **No selectors** — components subscribe to the full store object via `useConfiguratorStore()`. This means all subscribers re-render on any state change. Acceptable at current scale; could be optimized with selectors if component count grows.

### What is NOT in the store

- **3D transforms** — stored in `localStorage` under `voltforge_transforms`, managed as local `useState` in `Scene.tsx`
- **UI state** (active category in sidebar, open/closed panels) — local `useState` in each component
- **Auth state** — currently not managed anywhere; Supabase session not tracked

---

## Component Relationships

```
layout.tsx (Server Component)
├── <Navbar> (Client)
│   └── <LoginModal> (Client, conditional)
└── <main>
    └── page.tsx (Server Component)
        ├── <Scene> (Client) ←── reads: useConfiguratorStore
        │   ├── <Canvas> [R3F]
        │   │   ├── <BikePlaceholder> ←── reads: selectedParts, transforms
        │   │   │   ├── <Suspense> → <PartModel> → <GLBModelMesh> or <STLModelMesh>
        │   │   │   ├── placeholder meshes (when no model registered)
        │   │   │   └── wheel meshes (always)
        │   │   └── <OrbitControls>
        │   └── <PositionTool> (DOM overlay, outside Canvas)
        │       └── <SliderRow> × 7 (pos×3, rot×3, scale×1)
        └── <Sidebar> (Client) ←── reads/writes: useConfiguratorStore
            ├── category list view
            └── parts list view (AnimatePresence)
```

**Important:** `<PositionTool>` is a regular DOM element rendered as a sibling to `<Canvas>` inside a `relative` container div. It is **not** a Three.js overlay — it uses `position: absolute` CSS. Only `<LoadingOverlay>` (which renders inside R3F via `<Html>` from drei) exists in 3D space.

---

## Rendering Pipeline

### Frame

```
Next.js SSR renders HTML shell (layout + page — no client JS yet)
        │
        ▼
React hydrates — Zustand initializes with all-null selectedParts
        │
        ▼
Scene mounts → useGLTF.preload() fires for 4 GLB models
        │
        ▼
R3F Canvas renders:
  - black background (#09090b)
  - ambient light (intensity 0.5)
  - directional light (position [10,10,5], intensity 2)
  - point light × 2
  - BikePlaceholder with all placeholder geometry (nothing selected)
  - OrbitControls (polar angle constrained, pan disabled, distance 3–10)
        │
        ▼
User selects a part → Zustand update → Canvas re-renders affected subtree
```

### Camera

- **Position:** `[4, 2, 4]` (isometric-ish angle)
- **FOV:** 45°
- **Constraints:** `minPolarAngle: π/4`, `maxPolarAngle: π/2 + 0.1` (prevents flipping under the floor), `enablePan: false`, `minDistance: 3`, `maxDistance: 10`

### Coordinate system

Three.js uses a right-handed coordinate system with Y-up. All part positions are in scene units. The `BikePlaceholder` group is offset by `[0, -1, 0]` to drop the build to floor level. GLB models were calibrated empirically (see `DEFAULT_TRANSFORMS`). STL geometry is auto-centered at load time via `geometry.center()`, meaning `pos:[0,0,0]` places the model's bounding-box centroid at the origin.

---

## Model Loading Pipeline

See `docs/model-system.md` for the full breakdown. Summary:

- **GLB:** `useGLTF(url)` suspends, returns cached `{ scene: THREE.Group }`. Material applied post-load via `useEffect`.
- **STL:** `useLoader(STLLoader, url)` suspends, returns `THREE.BufferGeometry`. Geometry centered + normals computed post-load. Material defined inline as JSX child.
- **Both:** wrapped in `<Suspense>` with an `<Html>` loading overlay. Models load lazily when the part is first selected (except the 4 preloaded GLBs).

---

## Current Configurator Architecture

### The three-map system (current state, to be replaced)

Three independent static maps in `Scene.tsx` all keyed by part ID:

```
MOCK_DB (Sidebar.tsx)          MODEL_REGISTRY (Scene.tsx)     DEFAULT_TRANSFORMS (Scene.tsx)
─────────────────────          ──────────────────────────     ──────────────────────────────
"f3" → Part metadata           "f3" → file URL + material     "f3" → pos / rot / scale
"f4" → Part metadata           "f4" → file URL + material     "f4" → pos / rot / scale
...                            ...                            ...
```

These are manually synchronized. No runtime validation that a part ID in one map exists in the others. Absence is handled silently by falling back to placeholder geometry.

### Part ID conventions

Currently short strings (`"f1"` through `"f8"`, `"m1"` through `"m3"`, `"b1"` through `"b4"`, `"c1"` through `"c3"`, `"s1"`). The Supabase `parts` table uses full UUIDs. **These two ID systems are currently disconnected.** The migration path is: when connecting to Supabase, either use UUIDs everywhere (requires updating all three maps) or add a `shortId` column to the parts table.

### Part rendering decision tree

```
selectedParts[category]?.id
        │
        ├── undefined/null → placeholder geometry (always shown)
        │
        └── partId
                │
                ├── partId in MODEL_REGISTRY?
                │       yes → <Suspense><PartModel partId transform /></Suspense>
                │       no  → placeholder geometry (part selected but no model)
                │
                └── transform = transforms[partId] ?? DEFAULT_TRANSFORMS[partId]
                              ?? { pos:[0,0,0], rot:[0,0,0], scale:[1,1,1] }
```
