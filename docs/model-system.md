# VoltForge — Model System

## Overview

The model system handles loading, materializing, and positioning all 3D assets. It lives entirely inside `src/components/configurator/Scene.tsx`. There are two loader paths (GLB and STL), a static registry mapping part IDs to files, a static defaults map for starting transforms, and a developer-facing position tool for calibration.

---

## MODEL_REGISTRY

Defined at module scope in `Scene.tsx`. Maps every part ID that has a 3D file to its rendering metadata.

```ts
const MODEL_REGISTRY: Record<string, {
  type: "glb" | "stl";
  url: string;          // absolute path served from public/models/
  color: string;        // hex color for MeshStandardMaterial
  metalness: number;    // 0–1, PBR metalness
  roughness: number;    // 0–1, PBR roughness
  label: string;        // shown in Position Tool tab
}> = { ... }
```

### Current entries

| Part ID | Type | File | Notes |
|---|---|---|---|
| f1 | GLB | `surron.frame.glb` | 112 MB — calibrated |
| f2 | GLB | `talaria.frame.glb` | 11 MB — calibrated (experimental) |
| f3 | STL | `Ebox%20Frame.stl` | 1.5 MB — uncalibrated |
| f4 | STL | `Eride%20Pro%20SS%20Frame.stl` | 562 KB — uncalibrated |
| f5 | STL | `Macfox%20X1S%20Frame.stl` | 3.5 MB — uncalibrated |
| f6 | STL | `Talaria%20X3%20Frame.stl` | 7.4 MB — uncalibrated |
| f7 | STL | `Tuttio%20Frame.stl` | 670 KB — uncalibrated |
| f8 | STL | `Yozma%20IN10%20Frame.stl` | 5.8 MB — uncalibrated |
| m1 | GLB | `sotionmotor.glb` | 1.3 MB — calibrated |
| m2 | GLB | `kofactoryspecmotor.glb` | 3.5 MB — calibrated |
| m3 | STL | `Eride%20Pro%20SS%2072V%20Motor.stl` | 205 KB — uncalibrated |
| b3 | STL | `Chi%20Battery.stl` | 1.3 MB — uncalibrated |
| b4 | STL | `Tuttio%20Chi%20Battery.stl` | 1.4 MB — uncalibrated |
| c2 | STL | `BAC4000%20Controller.stl` | 11 KB — uncalibrated |
| c3 | STL | `Eride%20Pro%20Controller.stl` | 226 KB — uncalibrated |
| s1 | STL | `Eride%20OEM%20Seat.stl` | 495 KB — uncalibrated |

**Note on URL encoding:** File names with spaces must be percent-encoded in the URL string (e.g., `"Ebox Frame.stl"` → `"Ebox%20Frame.stl"`). The STLLoader passes the URL to `fetch()` directly — the browser does not auto-encode spaces in programmatic fetch calls.

**Parts with NO registry entry** (b1, b2, c1) render placeholder geometry when selected. They have no 3D model files.

---

## DEFAULT_TRANSFORMS

Defined at module scope in `Scene.tsx`. Maps every part ID (including those without models, for completeness) to its starting `pos / rot / scale`.

```ts
type Vec3 = [number, number, number];
type Transform = { pos: Vec3; rot: Vec3; scale: Vec3 };
type TransformMap = Record<string, Transform>;

const DEFAULT_TRANSFORMS: TransformMap = { ... }
```

### Calibrated entries

| Part ID | pos | rot | scale |
|---|---|---|---|
| f1 (Sur-Ron) | [-0.2, -0.9, 7.85] | [-0.22, 1.55, 0.2] | [0.01, 0.01, 0.01] |
| f2 (Talaria) | [1.75, -2.95, 3.80] | [-0.52, 1.55, 0.85] | [10, 10, 10] |
| m1 (Sotion) | [0.7, -1.25, 2.50] | [-1.55, 3.15, 6.27] | [1, 1, 1] |
| m2 (KO Motor) | [0.7, -1.25, 2.50] | [-1.55, 3.15, 6.27] | [0.01, 0.01, 0.01] |

The wide variation in scale values (0.01 vs 10 vs 1) reflects inconsistent CAD export units across models. f1 was exported in mm (scale 0.01 converts mm→m). f2 was exported in something very small (scale 10 amplifies). This inconsistency is the primary reason the position tool exists.

### Uncalibrated entries

All 12 STL models default to `pos:[0,0,0], rot:[0,0,0], scale:[1,1,1]`. Until calibrated, selecting these parts renders a model at the scene origin at potentially wrong scale.

---

## GLB Loading (`GLBModelMesh`)

```tsx
function GLBModelMesh({ url, position, rotation, scale, color, metalness, roughness }: ModelProps) {
  const { scene } = useGLTF(url);          // suspends; returns cached scene
  
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (!mesh.userData.matSet) {        // only create material once
          mesh.material = new THREE.MeshStandardMaterial({ color, metalness, roughness });
          mesh.userData.matSet = true;
        } else {
          (mesh.material as THREE.MeshStandardMaterial).color.set(color);  // color updates
        }
      }
    });
  }, [scene, color, metalness, roughness]);
  
  return <primitive object={scene} position={position} rotation={rotation} scale={scale} />;
}
```

**Shared scene reference warning:** `useGLTF` caches and returns the same `THREE.Group` object for a given URL. If the same model were rendered twice simultaneously, both instances would share the same scene graph and material mutations would affect both. Currently safe because only one part per category can be selected. Would break in a "compare two builds" view. Fix: `const cloned = useMemo(() => scene.clone(true), [scene])`.

**Preloading:** Four GLB models are preloaded at module scope:
```ts
useGLTF.preload("/models/surron.frame.glb");
useGLTF.preload("/models/talaria.frame.glb");
useGLTF.preload("/models/kofactoryspecmotor.glb");
useGLTF.preload("/models/sotionmotor.glb");
```
These fire when the `Scene` module is first imported — before the user selects anything. Reduces perceived latency but wastes bandwidth if the user never selects these parts.

---

## STL Loading (`STLModelMesh`)

```tsx
function STLModelMesh({ url, position, rotation, scale, color, metalness, roughness }: ModelProps) {
  const geometry = useLoader(STLLoader, url);   // suspends; returns BufferGeometry
  
  useEffect(() => {
    geometry.computeBoundingBox();
    geometry.center();             // translates all vertices so centroid = origin
    geometry.computeVertexNormals(); // STL has no normals; this enables smooth shading
  }, [geometry]);
  
  return (
    <mesh geometry={geometry} position={position} rotation={rotation} scale={scale}>
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  );
}
```

**No preloading.** `useLoader` doesn't have a built-in `preload()` equivalent accessible outside a component. STLs load on first render when the part is selected.

**`geometry.center()` is destructive.** It modifies the vertex positions in place. Since `useLoader` caches the geometry object by URL, calling `center()` only runs once (the `[geometry]` dep in `useEffect` won't change for the same URL). If the same STL URL were loaded by two different components, the second would receive an already-centered geometry — harmless but worth knowing.

**Unit ambiguity.** STL files can be authored in any unit. Most CAD programs default to mm. Three.js works in meters. A 500mm-long frame exported at 1:1 will appear as 500 scene units (astronomically large). The `scale` in `DEFAULT_TRANSFORMS` is the correction factor. Until calibrated, `scale:[1,1,1]` is a placeholder.

---

## PartModel (Router Component)

```tsx
function PartModel({ partId, transform }: { partId: string; transform: Transform }) {
  const entry = MODEL_REGISTRY[partId];
  if (!entry || !transform) return null;
  
  const props: ModelProps = {
    url: entry.url,
    position: transform.pos,
    rotation: transform.rot,
    scale: transform.scale,
    color: entry.color,
    metalness: entry.metalness,
    roughness: entry.roughness,
  };
  
  return entry.type === "glb" ? <GLBModelMesh {...props} /> : <STLModelMesh {...props} />;
}
```

This component has no hooks of its own. It exists solely to route between `GLBModelMesh` and `STLModelMesh` based on the registry entry. The parent (`BikePlaceholder`) wraps each `<PartModel>` in a `<Suspense>` with a loading overlay.

---

## The Position Tool

The position tool is a DOM overlay (`position: absolute, bottom-4, right-4`) rendered as a sibling to the R3F `<Canvas>` inside a `relative` container.

### State management

Transforms live as `useState` inside the `Scene` component:

```ts
const [transforms, setTransforms] = useState<TransformMap>(() =>
  typeof window !== "undefined" ? loadFromLocalStorage() : { ...DEFAULT_TRANSFORMS }
);
```

The lazy initializer reads `localStorage` on first render (SSR-safe via `typeof window` guard). Every change auto-saves:

```ts
useEffect(() => {
  localStorage.setItem("voltforge_transforms", JSON.stringify(transforms));
}, [transforms]);
```

### Active model tracking

```ts
const activeModels = useMemo(() =>
  Object.values(selectedParts)
    .filter((part): part is NonNullable<typeof part> => !!part && !!MODEL_REGISTRY[part.id])
    .map(part => ({ partId: part.id, label: MODEL_REGISTRY[part.id].label })),
  [selectedParts]
);

// Keep activeModelId pointing at a valid tab
useEffect(() => {
  if (activeModels.length === 0) setActiveModelId(null);
  else if (!activeModels.find(m => m.partId === activeModelId))
    setActiveModelId(activeModels[0].partId);
}, [activeModels, activeModelId]);
```

The panel is hidden when `activeModels.length === 0` (no parts with 3D models selected).

### SliderRow inputs

Each axis row has:
- A `<input type="range">` for coarse adjustment (clamped to slider min/max)
- A `<input type="text" inputMode="decimal">` for precise entry
- `draft` state pattern: user types freely, value commits on `blur` or `Enter`, `Escape` cancels
- Arrow Up/Down nudges by the slider's `step`
- The number input is **not clamped** to slider range — you can type `0.0001` even if the slider minimum is `0.001`

### "Copy All JSON" output format

```json
{
  "f1": { "position": [-0.2, -0.9, 7.85], "rotation": [-0.22, 1.55, 0.2], "scale": [0.01, 0.01, 0.01] },
  "m1": { "position": [0.7, -1.25, 2.5], "rotation": [-1.55, 3.15, 6.27], "scale": [1, 1, 1] }
}
```

Only includes parts that are currently selected and have models. After calibrating a model, copy the JSON and paste the values back into `DEFAULT_TRANSFORMS` in `Scene.tsx`.

---

## Calibration Workflow

To calibrate a new STL model (do this for all 12 uncalibrated parts):

1. Start the dev server (`npm run dev`)
2. Open the configurator at `localhost:3000`
3. Select the frame you want to calibrate against (e.g., Sur-Ron for a Sur-Ron motor)
4. Select the uncalibrated part in its category
5. The Position Tool panel appears at bottom-right — the part's tab is auto-selected
6. **Scale first:** The model will likely be at completely wrong scale. Start with the uniform scale slider.
   - If the model appears enormous → it's in mm. Try `scale: 0.001`
   - If the model appears tiny → try `scale: 10` or `scale: 100`
   - Aim to match the real-world size relative to the frame
7. **Position:** Use X/Y/Z sliders to move the part to its correct location on the frame
8. **Rotation:** Align the part's axis to match the frame geometry
9. Once satisfied, click **"Copy All JSON"** or read the code preview in the panel
10. Open `src/components/configurator/Scene.tsx`
11. Find `DEFAULT_TRANSFORMS` and update the entry for this part ID
12. The calibrated values will now be the default for all users (and load from `DEFAULT_TRANSFORMS` on fresh visits before any localStorage is set)

**Tip:** Use the text inputs rather than sliders for final precision. The slider handles rough positioning; the input handles exact alignment.

---

## Asset Optimization (Pending)

| File | Current | Target | Method |
|---|---|---|---|
| `surron.frame.glb` | 112 MB | ~5 MB | Draco compression via `gltf-pipeline` |
| `talaria.frame.glb` | 11 MB | ~1 MB | Draco compression |
| `kofactoryspecmotor.glb` | 3.5 MB | ~300 KB | Draco compression |
| `sotionmotor.glb` | 1.3 MB | ~150 KB | Draco compression |
| STL files | various | — | Convert to GLB: smaller, supports materials, preloadable |

```bash
# Draco-compress a GLB
npx gltf-pipeline -i surron.frame.glb -o surron.frame.draco.glb --draco.compressionLevel 10

# Convert STL to GLB (rough approach)
# Use Blender CLI or an online converter; then apply Draco
```

After Draco compression, `useGLTF` requires the DRACOLoader to be configured:
```ts
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
// pass to GLTFLoader or configure via useGLTF.setDecoderPath()
```
