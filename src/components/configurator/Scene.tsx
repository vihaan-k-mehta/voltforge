"use client";

import { Canvas, useLoader } from "@react-three/fiber";
import { CameraControls, useGLTF, Html } from "@react-three/drei";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { Suspense, useEffect, useRef, useState, useMemo, Component, type ReactNode } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { cn } from "@/lib/utils";
import { PARTS_CONFIG, PARTS_BY_ID, type PartModel3D } from "@/data/parts";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

type Vec3 = [number, number, number];
type Transform = { pos: Vec3; rot: Vec3; scale: Vec3 };
type TransformMap = Record<string, Transform>;

interface ModelProps {
  url: string;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  color: string;
  metalness: number;
  roughness: number;
}

// ─── Derived from PARTS_CONFIG (single source of truth) ──────────────────────

const MODEL_REGISTRY: Record<string, PartModel3D> = Object.fromEntries(
  PARTS_CONFIG
    .filter((p): p is typeof p & { model: PartModel3D } => p.model !== undefined)
    .map(p => [p.id, p.model])
);

const DEFAULT_TRANSFORMS: TransformMap = Object.fromEntries(
  PARTS_CONFIG
    .filter((p): p is typeof p & { mountOffset: Transform } => p.mountOffset !== undefined)
    .map(p => [p.id, p.mountOffset])
);

// ─────────────────────────────────────────────────────────────────────────────

useGLTF.setDecoderPath("/draco/");
useGLTF.preload("/models/surronframe.draco.glb");
useGLTF.preload("/models/talaria.frame.draco.glb");
useGLTF.preload("/models/kofactoryspecmotor.draco.glb");
useGLTF.preload("/models/sotionmotor.draco.glb");

// ─── 3D Model Components ──────────────────────────────────────────────────────

function GLBModelMesh({ url, position, rotation, scale, color, metalness, roughness }: ModelProps) {
  const { scene: original } = useGLTF(url);
  // Clone so each instance owns its own scene graph — avoids shared material mutation
  const scene = useMemo(() => original.clone(true), [original]);

  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({ color, metalness, roughness });
      }
    });
  }, [scene, color, metalness, roughness]);

  return <primitive object={scene} position={position} rotation={rotation} scale={scale} />;
}

function STLModelMesh({ url, position, rotation, scale, color, metalness, roughness }: ModelProps) {
  const geometry = useLoader(STLLoader, url);

  useEffect(() => {
    geometry.computeBoundingBox();
    geometry.center();
    geometry.computeVertexNormals();
  }, [geometry]);

  return (
    <mesh geometry={geometry} position={position} rotation={rotation} scale={scale}>
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  );
}

function PartModel({ partId, transform }: { partId: string; transform: Transform }) {
  const entry = MODEL_REGISTRY[partId];
  const colorOverride = useConfiguratorStore((s) => s.partColors[partId]);
  if (!entry || !transform) return null;

  const props: ModelProps = {
    url: entry.url,
    position: transform.pos,
    rotation: transform.rot,
    scale: transform.scale,
    color: colorOverride ?? entry.color,
    metalness: entry.metalness,
    roughness: entry.roughness,
  };

  return entry.type === "glb" ? <GLBModelMesh {...props} /> : <STLModelMesh {...props} />;
}

function LoadingOverlay({ message }: { message: string }) {
  return (
    <group position={[0, 1.2, 0]}>
      <Html center>
        <div className="bg-black/80 text-white px-4 py-2 rounded-lg border border-white/20 whitespace-nowrap text-sm">
          {message}
        </div>
      </Html>
    </group>
  );
}

// Catches per-model load failures inside the Canvas — degrades to empty slot, not canvas crash
class ModelErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

// ─── Scene Geometry ───────────────────────────────────────────────────────────

function BikePlaceholder({ transforms }: { transforms: TransformMap }) {
  const { selectedParts } = useConfiguratorStore();
  const frameId      = selectedParts.frame?.id;
  const motorId      = selectedParts.motor?.id;
  const batteryId    = selectedParts.battery?.id;
  const controllerId = selectedParts.controller?.id;
  const seatId       = selectedParts.seat?.id;

  const t = (id: string) => transforms[id] ?? DEFAULT_TRANSFORMS[id] ?? { pos: [0,0,0] as Vec3, rot: [0,0,0] as Vec3, scale: [1,1,1] as Vec3 };

  return (
    <group position={[0, -1, 0]}>
      {/* Frame */}
      {frameId && MODEL_REGISTRY[frameId] ? (
        <ModelErrorBoundary>
          <Suspense fallback={<LoadingOverlay message={`Loading ${MODEL_REGISTRY[frameId].label}…`} />}>
            <PartModel partId={frameId} transform={t(frameId)} />
          </Suspense>
        </ModelErrorBoundary>
      ) : (
        <group position={[0, 1.2, 0]}>
          <mesh rotation={[-Math.PI / 6, 0, 0]}>
            <boxGeometry args={[0.2, 0.2, 1.2]} />
            <meshStandardMaterial color={selectedParts.frame ? "#3b82f6" : "#27272a"} metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.4, -0.5]} rotation={[Math.PI / 8, 0, 0]}>
            <boxGeometry args={[0.25, 0.15, 0.8]} />
            <meshStandardMaterial color={selectedParts.frame ? "#3b82f6" : "#27272a"} metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      )}

      {/* Battery */}
      {batteryId && MODEL_REGISTRY[batteryId] ? (
        <ModelErrorBoundary>
          <Suspense fallback={<LoadingOverlay message={`Loading ${MODEL_REGISTRY[batteryId].label}…`} />}>
            <PartModel partId={batteryId} transform={t(batteryId)} />
          </Suspense>
        </ModelErrorBoundary>
      ) : (
        <group position={[0, 1.0, 0.2]}>
          <mesh rotation={[-Math.PI / 6, 0, 0]}>
            <boxGeometry args={[0.18, 0.4, 0.6]} />
            <meshStandardMaterial color={selectedParts.battery ? "#ef4444" : "#18181b"} roughness={0.8} />
          </mesh>
        </group>
      )}

      {/* Controller */}
      {controllerId && MODEL_REGISTRY[controllerId] ? (
        <ModelErrorBoundary>
          <Suspense fallback={<LoadingOverlay message={`Loading ${MODEL_REGISTRY[controllerId].label}…`} />}>
            <PartModel partId={controllerId} transform={t(controllerId)} />
          </Suspense>
        </ModelErrorBoundary>
      ) : (
        <group position={[0, 1.3, 0.7]}>
          <mesh rotation={[-Math.PI / 4, 0, 0]}>
            <boxGeometry args={[0.15, 0.3, 0.1]} />
            <meshStandardMaterial color={selectedParts.controller ? "#10b981" : "#3f3f46"} metalness={0.5} roughness={0.5} />
          </mesh>
        </group>
      )}

      {/* Motor */}
      {motorId && MODEL_REGISTRY[motorId] ? (
        <ModelErrorBoundary>
          <Suspense fallback={<LoadingOverlay message={`Loading ${MODEL_REGISTRY[motorId].label}…`} />}>
            <PartModel partId={motorId} transform={t(motorId)} />
          </Suspense>
        </ModelErrorBoundary>
      ) : (
        <group position={[0, 0.7, 0.1]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.12, 0.12, 0.25, 32]} />
            <meshStandardMaterial color={selectedParts.motor ? "#eab308" : "#3f3f46"} metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
      )}

      {/* Seat */}
      {seatId && MODEL_REGISTRY[seatId] && (
        <ModelErrorBoundary>
          <Suspense fallback={<LoadingOverlay message={`Loading ${MODEL_REGISTRY[seatId].label}…`} />}>
            <PartModel partId={seatId} transform={t(seatId)} />
          </Suspense>
        </ModelErrorBoundary>
      )}


    </group>
  );
}

// ─── Position Tool UI ─────────────────────────────────────────────────────────

function SliderRow({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (raw: string) => {
    const n = parseFloat(raw);
    if (!isNaN(n) && isFinite(n)) onChange(n);
    setDraft(null);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-400 text-xs w-5 shrink-0">{label}</span>
      <input
        type="range"
        min={min} max={max} step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-blue-500 min-w-0"
      />
      <input
        type="text"
        inputMode="decimal"
        value={draft !== null ? draft : value.toFixed(5)}
        onChange={e => setDraft(e.target.value)}
        onBlur={e => commit(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter")  { commit((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur(); }
          if (e.key === "Escape") { setDraft(null); (e.target as HTMLInputElement).blur(); }
          if (e.key === "ArrowUp")   { e.preventDefault(); onChange(parseFloat((value + step).toFixed(10))); }
          if (e.key === "ArrowDown") { e.preventDefault(); onChange(parseFloat((value - step).toFixed(10))); }
        }}
        className="w-24 shrink-0 bg-zinc-800 border border-white/10 rounded px-1.5 py-0.5 text-xs font-mono text-zinc-100 text-right focus:outline-none focus:border-blue-500/60 focus:bg-zinc-700/80 transition-colors"
      />
    </div>
  );
}

function PositionTool({
  activeId,
  setActiveId,
  models,
  transforms,
  setTransforms,
}: {
  activeId: string | null;
  setActiveId: (id: string) => void;
  models: { partId: string; label: string }[];
  transforms: TransformMap;
  setTransforms: React.Dispatch<React.SetStateAction<TransformMap>>;
}) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  if (models.length === 0) return null;

  const current = activeId && transforms[activeId] ? activeId : models[0].partId;
  const t = transforms[current] ?? DEFAULT_TRANSFORMS[current];

  const setAxis = (key: keyof Transform, axis: 0 | 1 | 2) => (v: number) => {
    setTransforms(prev => {
      const arr = [...(prev[current][key])] as Vec3;
      arr[axis] = v;
      return { ...prev, [current]: { ...prev[current], [key]: arr } };
    });
  };

  const setUniformScale = (v: number) =>
    setTransforms(prev => ({ ...prev, [current]: { ...prev[current], scale: [v, v, v] } }));

  const reset = () =>
    setTransforms(prev => ({
      ...prev,
      [current]: DEFAULT_TRANSFORMS[current] ?? { pos: [0,0,0], rot: [0,0,0], scale: [1,1,1] },
    }));

  const copyAll = () => {
    const out: Record<string, object> = {};
    for (const { partId } of models) {
      const tr = transforms[partId] ?? DEFAULT_TRANSFORMS[partId];
      if (tr) out[partId] = { position: tr.pos, rotation: tr.rot, scale: tr.scale };
    }
    navigator.clipboard.writeText(JSON.stringify(out, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isUncalibrated = PARTS_BY_ID[current]?.calibrated === false;

  return (
    <div className="absolute bottom-4 right-4 w-72 bg-zinc-900/95 border border-white/10 rounded-xl shadow-2xl text-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-zinc-200 font-medium hover:bg-white/5 transition-colors"
      >
        <span>Position Tool</span>
        <span className="text-zinc-500 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-white/10">
          {/* Model tabs */}
          <div className="flex gap-1 px-3 py-2 overflow-x-auto border-b border-white/10">
            {models.map(({ partId, label }) => (
              <button
                key={partId}
                onClick={() => setActiveId(partId)}
                className={cn(
                  "px-2.5 py-1 rounded text-xs whitespace-nowrap transition-colors shrink-0",
                  current === partId
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "text-zinc-400 hover:text-white border border-transparent"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Calibration warning */}
          {isUncalibrated && (
            <div className="mx-3 mt-2.5 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-400 flex items-start gap-1.5">
              <span className="shrink-0">⚠</span>
              <span>Uncalibrated — transforms are placeholder values. Adjust position, then copy values to <code className="font-mono">parts.ts</code>.</span>
            </div>
          )}

          {/* Sliders */}
          <div className="px-4 py-3 space-y-4">
            <div className="space-y-2">
              <div className="text-xs text-zinc-500 uppercase tracking-wider">Position</div>
              <SliderRow label="X" value={t.pos[0]} min={-100} max={100} step={0.01} onChange={setAxis("pos", 0)} />
              <SliderRow label="Y" value={t.pos[1]} min={-100} max={100} step={0.01} onChange={setAxis("pos", 1)} />
              <SliderRow label="Z" value={t.pos[2]} min={-100} max={100} step={0.01} onChange={setAxis("pos", 2)} />
            </div>
            <div className="space-y-2">
              <div className="text-xs text-zinc-500 uppercase tracking-wider">Rotation (rad)</div>
              <SliderRow label="X" value={t.rot[0]} min={-Math.PI} max={Math.PI} step={0.01} onChange={setAxis("rot", 0)} />
              <SliderRow label="Y" value={t.rot[1]} min={-Math.PI} max={Math.PI} step={0.01} onChange={setAxis("rot", 1)} />
              <SliderRow label="Z" value={t.rot[2]} min={-Math.PI} max={Math.PI} step={0.01} onChange={setAxis("rot", 2)} />
            </div>
            <div className="space-y-2">
              <div className="text-xs text-zinc-500 uppercase tracking-wider">Scale (uniform)</div>
              <SliderRow label="S" value={t.scale[0]} min={0.0001} max={100} step={0.0001} onChange={setUniformScale} />
            </div>

            {/* Code preview */}
            <div className="p-2 bg-zinc-800/60 rounded-lg font-mono text-xs text-zinc-300 leading-relaxed select-all">
              <div>pos: [{t.pos.map(v => v.toFixed(3)).join(", ")}]</div>
              <div>rot: [{t.rot.map(v => v.toFixed(3)).join(", ")}]</div>
              <div>scale: [{t.scale.map(v => v.toFixed(4)).join(", ")}]</div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="flex-1 py-1.5 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors"
              >
                Reset
              </button>
              <button
                onClick={copyAll}
                className="flex-1 py-1.5 text-xs rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
              >
                {copied ? "Copied!" : "Copy All JSON"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Camera Rig ───────────────────────────────────────────────────────────────

// Camera positions keyed by frame id — eye position and look-at target
const FRAME_CAMERA: Record<string, { eye: [number, number, number]; target: [number, number, number] }> = {
  f1: { eye: [3, 1.5, 8],  target: [0, 0, 3] },    // Sur-Ron — long frame, shifted back
  f2: { eye: [4, 1.5, 4],  target: [0, 0, 2] },    // Talaria Sting R
  f3: { eye: [3, 1.5, 3],  target: [0, 0, 0] },    // Ebox
  f4: { eye: [3, 1.5, 3],  target: [0, 0, 0] },    // Eride Pro SS
  f5: { eye: [3, 1.5, 3],  target: [0, 0, 0] },    // Macfox X1S
  f6: { eye: [3, 1.5, 3],  target: [0, 0, 0] },    // Talaria X3
  f7: { eye: [3, 1.5, 3],  target: [0, 0, 1] },    // Tuttio
  f8: { eye: [3, 1.5, 3],  target: [0, 0, 0] },    // Yozma IN10
};
const DEFAULT_CAMERA = { eye: [4, 2, 4] as [number, number, number], target: [0, 0, 0] as [number, number, number] };

function CameraRig({ frameId }: { frameId: string | null }) {
  const controlsRef = useRef<CameraControls>(null);
  const prevFrameId = useRef<string | null>(null);

  useEffect(() => {
    if (!controlsRef.current) return;
    if (frameId === prevFrameId.current) return;
    prevFrameId.current = frameId;

    const cam = frameId ? (FRAME_CAMERA[frameId] ?? DEFAULT_CAMERA) : DEFAULT_CAMERA;
    controlsRef.current.setLookAt(
      cam.eye[0], cam.eye[1], cam.eye[2],
      cam.target[0], cam.target[1], cam.target[2],
      true // animate
    );
  }, [frameId]);

  return (
    <CameraControls
      ref={controlsRef}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 2 + 0.1}
      minDistance={2}
      maxDistance={14}
    />
  );
}

// ─── Root Scene ───────────────────────────────────────────────────────────────

function loadTransforms(): TransformMap {
  try {
    const raw = localStorage.getItem("voltforge_transforms");
    if (raw) return { ...DEFAULT_TRANSFORMS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_TRANSFORMS };
}

export function Scene() {
  const { selectedParts } = useConfiguratorStore();

  const [transforms, setTransforms] = useState<TransformMap>(() =>
    typeof window !== "undefined" ? loadTransforms() : { ...DEFAULT_TRANSFORMS }
  );
  const [activeModelId, setActiveModelId] = useState<string | null>(null);

  // Persist transforms to localStorage on every change
  useEffect(() => {
    localStorage.setItem("voltforge_transforms", JSON.stringify(transforms));
  }, [transforms]);

  // Compute which selected parts have 3D models
  const activeModels = useMemo(() =>
    Object.values(selectedParts)
      .filter((part): part is NonNullable<typeof part> => !!part && !!MODEL_REGISTRY[part.id])
      .map(part => ({ partId: part.id, label: MODEL_REGISTRY[part.id].label })),
    [selectedParts]
  );

  // Keep activeModelId pointing at a valid selection
  useEffect(() => {
    if (activeModels.length === 0) {
      setActiveModelId(null);
    } else if (!activeModels.find(m => m.partId === activeModelId)) {
      setActiveModelId(activeModels[0].partId);
    }
  }, [activeModels, activeModelId]);

  const frameId = selectedParts.frame?.id ?? null;

  return (
    <div className="relative h-full w-full">
      <ErrorBoundary>
        <Canvas camera={{ position: [4, 2, 4], fov: 45 }}>
          <color attach="background" args={["#09090b"]} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={2} />
          <pointLight position={[-10, -10, -10]} intensity={1} />
          <pointLight position={[10, 0, -10]} intensity={1} />
          <BikePlaceholder transforms={transforms} />
          <CameraRig frameId={frameId} />
        </Canvas>
      </ErrorBoundary>

      {process.env.NODE_ENV === "development" && (
        <PositionTool
          activeId={activeModelId}
          setActiveId={setActiveModelId}
          models={activeModels}
          transforms={transforms}
          setTransforms={setTransforms}
        />
      )}
    </div>
  );
}
