# VoltForge — Roadmap

---

## Immediate (Unblock the Demo)

These are pre-demo blockers. Nothing should ship or be shown to users without these done.

### 1. STL Model Calibration
**What:** Set correct `DEFAULT_TRANSFORMS` for all 12 uncalibrated STL models.  
**Why:** Every uncalibrated model renders at origin at wrong scale — the configurator is non-functional for these parts.  
**How:** Use the Position Tool (see `docs/model-system.md` → Calibration Workflow). Calibrate per frame where applicable.  
**Files:** `src/components/configurator/Scene.tsx` (`DEFAULT_TRANSFORMS`)  
**Effort:** Developer time only — the tool exists. ~15–30 min per model.

### 2. Asset Optimization — surron.frame.glb
**What:** Compress `surron.frame.glb` from 112 MB to ~5 MB using Draco compression.  
**Why:** 112 MB blocks first render for seconds. Unacceptable for any public-facing demo.  
**How:** `npx gltf-pipeline -i surron.frame.glb -o surron.frame.draco.glb --draco.compressionLevel 10`, then update the loader to use DRACOLoader.  
**Files:** `public/models/`, `src/components/configurator/Scene.tsx`  
**Effort:** ~2 hours (compression + DRACOLoader setup)

### 3. Wire "Save Build" to localStorage
**What:** The "Save Build" button currently calls `alert()`. Persist the full build (selected parts + transforms) to localStorage.  
**Why:** Users lose their build on refresh. This is a one-line trust issue.  
**How:** On click, serialize `{ selectedParts, transforms }` to `localStorage.setItem('voltforge_build', ...)`. On app load, restore from localStorage into Zustand.  
**Files:** `src/store/useConfiguratorStore.ts`, `src/components/configurator/Sidebar.tsx`, `src/components/configurator/Scene.tsx`  
**Effort:** ~3 hours

### 4. Fix `/builds` 404
**What:** The Navbar links to `/builds` which does not exist.  
**Why:** Dead link on every page damages credibility.  
**How:** Either add a minimal `app/builds/page.tsx` (placeholder with "Coming soon") or remove the Navbar link.  
**Files:** `src/app/builds/page.tsx` (create) or `src/components/layout/navbar.tsx` (remove link)  
**Effort:** 30 min

### 5. Add R3F Error Boundary
**What:** Wrap the `<Canvas>` in a React error boundary.  
**Why:** A corrupt or missing model file currently silently crashes the entire 3D view with no recovery path.  
**How:** Create an `ErrorBoundary` class component that renders a fallback UI ("3D preview unavailable — try refreshing").  
**Files:** `src/components/configurator/Scene.tsx`, new `src/components/ui/ErrorBoundary.tsx`  
**Effort:** ~1 hour

---

## Medium Term (Core Product)

### 6. Supabase Auth Integration
**What:** Wire up the Login/Signup modal to real Supabase authentication.  
**Why:** Saved builds require a user identity.  
**How:** Uncomment the Supabase client calls in `LoginModal.tsx`, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to env, handle session in a layout server component using the existing `src/utils/supabase/server.ts`.  
**Files:** `src/components/ui/LoginModal.tsx`, `src/app/layout.tsx`, `.env.local`  
**Effort:** ~1 day

### 7. Save Builds to Supabase
**What:** Persist builds to the `builds` and `build_parts` tables. The schema is already migrated.  
**Why:** Persistent builds, shareable URLs, community features all depend on this.  
**How:** On "Save Build": `INSERT INTO builds`, then `INSERT INTO build_parts` for each selected part. Store transforms in `build_parts.position_data` (jsonb). Requires unified part IDs (see Issue: ID mismatch in Technical Debt).  
**Files:** `src/components/configurator/Sidebar.tsx`, new `src/lib/saveBuild.ts`  
**Effort:** ~2 days (including ID migration)

### 8. Fetch Parts from Supabase
**What:** Replace `MOCK_DB` in `Sidebar.tsx` with a Supabase query.  
**Why:** Parts data should not live in source code.  
**How:** `SELECT * FROM parts ORDER BY category, name` in a Server Component or via SWR/React Query. The `MOCK_DB` structure maps directly to the `parts` table schema.  
**Files:** `src/components/configurator/Sidebar.tsx`, new `src/lib/fetchParts.ts`  
**Effort:** ~1 day (after Auth and ID migration)

### 9. Wheels Category
**What:** Add real wheel parts (rims, tires) with 3D models. Replace placeholder cylinders.  
**Why:** Wheels are a major visible component and a common customization point.  
**How:** Source STL/GLB models, add to `PartCategory` system, add to parts catalog, calibrate transforms.  
**Files:** `src/store/useConfiguratorStore.ts`, `src/components/configurator/Sidebar.tsx`, `src/components/configurator/Scene.tsx`

### 10. Suspension Category
**What:** Add fork and shock options.  
**How:** Same pattern as Wheels.

### 11. Brakes Category
**What:** Add brake caliper and rotor options.  
**How:** Same pattern as Wheels.

### 12. Community Builds Page (`/builds`)
**What:** A gallery of public builds from all users. Each build shows: frame, total price, part list, 3D thumbnail.  
**How:** Server-rendered page querying `builds WHERE is_public = true`. Click to open a read-only configurator view of the build.  
**Files:** New `src/app/builds/page.tsx`  
**Effort:** ~3 days

### 13. Mobile Support
**What:** Make the 3D canvas usable on touch devices.  
**How:** OrbitControls already supports touch rotation/pinch-zoom. The main issues are: panel layout on small screens (sidebar should collapse into a bottom sheet), and the Position Tool overlay (too wide for mobile). Implement a responsive bottom drawer for the parts catalog.  
**Files:** `src/app/page.tsx`, `src/components/configurator/Sidebar.tsx`, `src/components/configurator/Scene.tsx`  
**Effort:** ~3 days

---

## Long Term (Platform)

### 14. Frame-Based Mount Point System
**What:** Replace absolute world-space transforms with frame-relative mount points. Frames declare where each part attaches; parts declare a local offset from their mount point.  
**Why:** Currently, adding a new motor requires calibrating it against every frame separately. With mount points: calibrate the frame's mount once, calibrate the motor's offset once — they compose automatically.  
**How:** See `docs/next-architecture.md` for the full proposal and phased implementation plan.

### 15. Multi-Bike Support
**What:** Support non-Sur-Ron / non-Talaria platforms (e.g., Cake, KTM Freeride E, custom builds from scratch).  
**Why:** The platform currently assumes Sur-Ron/Talaria form factors for model placement.  
**How:** The `mount_type` system is the foundation. Extend it with per-frame mount geometry. Requires the mount point architecture from #14.

### 16. Performance Estimates
**What:** Calculate estimated top speed, range, and power output from the selected parts.  
**Why:** The Supabase schema already has `builds.performance_estimates jsonb` — it was planned from day one.  
**How:** `motor.kv × battery.voltage = no-load RPM`. Gear ratio + wheel circumference → speed. Battery capacity ÷ average draw → range. Displayable in the "Custom Build" overlay.  
**Files:** New `src/lib/performanceEstimates.ts`

### 17. Marketplace Integration
**What:** "Buy this part" links from the parts catalog to actual supplier product pages.  
**Why:** Revenue pathway via affiliate links or direct partnerships.  
**How:** Add a `purchase_url` field to the `parts` table. Render a "Buy" button in the Sidebar part cards.

### 18. Build Sharing
**What:** Public shareable URLs for builds (e.g., `voltforge.com/builds/abc123`).  
**How:** `builds.is_public = true` is already in the schema. Implement a dynamic route `app/builds/[id]/page.tsx` that renders a read-only configurator view.

### 19. Brand Partnerships
**What:** Verified manufacturer accounts that can publish parts directly to the catalog.  
**How:** Add a `verified_manufacturer: boolean` flag to `profiles`. Allow verified accounts to INSERT into `parts`. Admin approval flow for new parts.

### 20. STL → GLB Pipeline
**What:** Convert all remaining STL assets to GLB format.  
**Why:** GLBs are smaller (with Draco), support embedded materials, support preloading, and are the de-facto standard for web 3D.  
**How:** Batch convert via Blender CLI or a CI step using `obj2gltf`/`gltf-pipeline`.
