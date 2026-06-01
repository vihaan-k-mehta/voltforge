# VoltForge — AI Context Document

> **Purpose:** This document lets an AI assistant understand the entire VoltForge project without reading source files. Read this before touching any code. Keep it current when making significant changes.

---

## Project Purpose

VoltForge is a **browser-based 3D configurator for DIY electric bikes and emotos** (Sur-Ron / Talaria class machines). Users:

1. Select physical parts (frame, motor, battery, controller, seat) from a catalog
2. See those parts rendered as real 3D models in a live WebGL canvas
3. Get real-time compatibility warnings (voltage, mount type, connector mismatch)
4. Eventually: save builds, share them publicly, and buy parts

The product is in **active prototyping**. The 3D pipeline and configurator UI are functional. The data layer (auth, saved builds, real parts catalog) is mocked against a Supabase backend that is fully scaffolded but never called from the frontend.

---

## Tech Stack

| Concern | Library | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.6 |
| UI runtime | React | 19.2.4 |
| 3D engine | Three.js | 0.184.0 |
| 3D/React bridge | @react-three/fiber | 9.6.1 |
| 3D helpers | @react-three/drei | 10.7.7 |
| Global state | Zustand | 5.0.13 |
| Animations | Framer Motion | 12.38.0 |
| Styling | Tailwind CSS | 4 (PostCSS plugin) |
| Icons | lucide-react | 1.16.0 |
| Backend/auth | Supabase JS + SSR | 2.105.4 / 0.10.3 |
| Language | TypeScript | 5 (strict) |
| Fonts | Geist / Geist Mono | next/font/google |
| Bundler (dev) | Turbopack | built into Next 16 |

---

## Folder Structure

```
voltforge/
├── docs/                         ← You are here
├── public/
│   └── models/                   ← All 3D assets, served statically, no CDN
│       ├── surron.frame.glb      ← 112 MB (!!) — biggest asset by far
│       ├── talaria.frame.glb     ← 11 MB
│       ├── kofactoryspecmotor.glb← 3.5 MB
│       ├── sotionmotor.glb       ← 1.3 MB
│       └── *.stl (12 files)      ← 11 KB – 7.4 MB each
├── src/
│   ├── app/
│   │   ├── layout.tsx            ← Root shell: Navbar + <main>
│   │   ├── page.tsx              ← Only route: the split-screen configurator
│   │   └── globals.css           ← CSS custom properties + Tailwind utilities
│   ├── components/
│   │   ├── configurator/
│   │   │   ├── Scene.tsx         ← PRIMARY FILE. 3D canvas + position tool.
│   │   │   └── Sidebar.tsx       ← Parts catalog + compatibility banners
│   │   ├── layout/
│   │   │   └── navbar.tsx        ← Top bar with auth buttons
│   │   └── ui/
│   │       └── LoginModal.tsx    ← Framer Motion auth modal (mocked)
│   ├── store/
│   │   └── useConfiguratorStore.ts ← Zustand: selectedParts, issues, totalPrice
│   ├── lib/
│   │   ├── compatibility.ts      ← Pure fn: parts record → CompatibilityIssue[]
│   │   └── utils.ts              ← cn() = clsx + tailwind-merge
│   └── utils/supabase/
│       ├── client.ts             ← createBrowserClient()
│       └── server.ts             ← createServerClient() with RSC cookies
├── supabase/
│   ├── migrations/
│   │   └── 20260517000000_init.sql ← Full schema: profiles, parts, builds, build_parts
│   └── seed.sql                  ← 8 seed parts (UUIDs, disconnected from frontend)
└── next.config.ts                ← Empty — no customization
```

---

## Current Implementation Status

| Feature | Status | Notes |
|---|---|---|
| 3D canvas + OrbitControls | ✅ Done | |
| GLB model loading | ✅ Done, calibrated | Sur-Ron, Talaria Sting R, Sotion, KO Motor |
| STL model loading | ✅ Loads | 12 models — **transforms uncalibrated** |
| Per-model position tool | ✅ Done | Sliders + text inputs, localStorage persist |
| Compatibility checker | ✅ Done | mount type, voltage, connectors |
| Parts catalog UI | ✅ Done | Hardcoded MOCK_DB in Sidebar.tsx |
| Part selection → scene | ✅ Done | |
| Placeholder geometry | ✅ Done | fallback for parts without 3D files |
| Auth (login/signup) | ❌ Mock | setTimeout simulates login |
| Save Build | ❌ Mock | alert() only |
| Supabase data layer | ❌ Not wired | Schema + migrations exist, never called |
| `/builds` community page | ❌ Missing | Nav link exists, route 404s |
| Brakes/Suspension/Wheels | ❌ Types only | No UI, no parts, no models |
| STL calibration | ⚠️ Needed | All 12 STLs at default scale [1,1,1] |
| Mobile UX | ⚠️ Partial | Layout stacks, 3D canvas unusable on touch |
| Asset optimization | ❌ Not done | 112 MB GLB, no compression, no CDN |

---

## Known Issues (Immediate Blockers)

1. **`surron.frame.glb` is 112 MB** — served from `public/` with no CDN, no Draco compression. Blocks rendering for seconds on slow connections.
2. **All 12 new STL models are uncalibrated** — they all render at `scale:[1,1,1]` at origin. Useless until the developer runs the position tool for each one.
3. **`/builds` route 404s** — linked in the Navbar, page doesn't exist.
4. **"Save Build" is a dead-end** — prominent CTA that does nothing. Damages demos.
5. **Transforms and build state are in separate stores** — `selectedParts` in Zustand (ephemeral), `transforms` in localStorage (persistent). Saving a build to Supabase would miss the transform data.

---

## Performance Concerns

- `surron.frame.glb` (112 MB): top priority. Convert to Draco-compressed GLB (~5-10 MB). Use a CDN rather than `public/`.
- `useGLTF.preload()` fires for all 4 GLB models at module import time — even if the user never selects them. Consider lazy-loading.
- No STL preloading mechanism. STLs load on first render when the part is selected.
- No error boundary around the R3F `<Canvas>`. A corrupt model file silently crashes the entire 3D view.
- Tailwind CSS 4 uses a PostCSS JIT pipeline — no issues observed yet, but worth noting it's a major version ahead of most tutorials.

---

## Important Files

| File | Why It Matters |
|---|---|
| `src/components/configurator/Scene.tsx` | Contains MODEL_REGISTRY, DEFAULT_TRANSFORMS, all 3D components, position tool |
| `src/components/configurator/Sidebar.tsx` | Contains MOCK_DB (the hardcoded parts catalog), category navigation |
| `src/store/useConfiguratorStore.ts` | Canonical `PartCategory` type — adding a new slot starts here |
| `src/lib/compatibility.ts` | All compatibility rules — pure function, easy to extend |
| `supabase/migrations/20260517000000_init.sql` | Full database schema (profiles, parts, builds, build_parts) |
| `supabase/seed.sql` | 8 seed parts with UUIDs (diverged from MOCK_DB's short IDs) |

---

## Development Conventions

- **TypeScript strict mode** — no `any`, no `!` assertions except in Supabase client init (env vars).
- **`cn()` for classNames** — always use `cn()` from `@/lib/utils` instead of string concatenation.
- **`"use client"` directive** — all components using hooks, R3F, or browser APIs must have it. `page.tsx` and `layout.tsx` are Server Components.
- **No index files** — components are imported by full path (`@/components/configurator/Scene`).
- **Zustand without slices** — single flat store in `useConfiguratorStore.ts`. Don't add a second store.
- **Tailwind utility classes** — custom CSS goes in `globals.css` under `@utility`. Avoid inline `style={}` props.
- **Three.js materials** — always use `MeshStandardMaterial` for 3D parts. The scene uses physically-based lighting.
- **Part IDs** — short strings like `"f1"`, `"m3"`. The Supabase `parts` table uses full UUIDs — the two are currently **not connected**.

### Adding a new part (current procedure)

1. Add `Part` object to `MOCK_DB[category]` in `Sidebar.tsx`
2. If model file exists: add entry to `MODEL_REGISTRY` in `Scene.tsx`
3. Add entry to `DEFAULT_TRANSFORMS` in `Scene.tsx` (use `[0,0,0]` scale `[1,1,1]` if uncalibrated)
4. If new `PartCategory`: update `PartCategory` union in store, add to `initialState`, add to `CATEGORIES` in Sidebar

---

## Current Blockers (for shipping)

1. STL model calibration (position tool exists — needs human time per model)
2. Save Build → Supabase (schema exists, client is scaffolded, wire-up needed)
3. Auth → Supabase (modal exists, code is commented out, env vars needed)
4. Asset pipeline (surron.frame.glb must be compressed before any production deployment)

---

## Glossary

| Term | Meaning |
|---|---|
| **emoto** | Electric motocross / dirt bike (Sur-Ron, Talaria class) |
| **Sur-Ron** | Chinese manufacturer of the Light Bee X — the primary reference platform |
| **Talaria** | Chinese manufacturer of the Sting R — second reference platform |
| **mount_type** | A string spec on frames and motors. Must match for compatibility (`"sur-ron"`, `"talaria"`, etc.) |
| **GLB** | Binary GLTF — Three.js native format. Loaded via `useGLTF`. Can be Draco-compressed. |
| **STL** | CAD export format. Contains geometry only (no materials, no textures). Loaded via `STLLoader`. |
| **MODEL_REGISTRY** | Static map in `Scene.tsx`: `partId → { type, url, color, metalness, roughness }` |
| **DEFAULT_TRANSFORMS** | Static map in `Scene.tsx`: `partId → { pos, rot, scale }` |
| **Position Tool** | The developer-facing overlay panel for placing models in 3D space |
| **Calibrated** | A model whose `DEFAULT_TRANSFORMS` entry has been adjusted to visually align with its frame |
| **MOCK_DB** | The hardcoded parts catalog in `Sidebar.tsx` — placeholder for Supabase `parts` table |
| **PartCategory** | TypeScript union type: the canonical list of part slots in a build |
| **`build_parts.position_data`** | Supabase column (jsonb) intended to store per-part transforms — currently unused |
