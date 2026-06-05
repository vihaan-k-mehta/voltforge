import type { PartCategory } from "@/store/useConfiguratorStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type Vec3 = [number, number, number];

/** 3D model metadata. label is the short name shown in the Position Tool tab. */
export interface PartModel3D {
  type:      "glb" | "stl";
  url:       string;
  label:     string;
  color:     string;
  metalness: number;
  roughness: number;
}

/**
 * World-space transform for Phase 1.
 * In Phase 3 this will become a mount-relative offset; for now it is identical
 * in structure to the Transform type used in Scene.tsx.
 */
export interface MountOffset {
  pos:   Vec3;
  rot:   Vec3;
  scale: Vec3;
}

/** Single source of truth for every part in the catalog. Replaces MOCK_DB,
 *  MODEL_REGISTRY, and DEFAULT_TRANSFORMS. */
export interface PartConfig {
  id:           string;
  name:         string;
  category:     PartCategory;
  price:        number;
  manufacturer: string;
  specs:        Record<string, string | number | boolean | string[]>;
  /** Present when the part has a 3D model file. Absent → placeholder geometry. */
  model?:       PartModel3D;
  /** World-space transform (Phase 1). Only set when model is set. */
  mountOffset?: MountOffset;
  /** false = transforms are placeholder [0,0,0]/scale[1,1,1]. Triggers a
   *  warning in the Position Tool. true / absent = calibrated. */
  calibrated?:  boolean;
}

// ─── Parts Catalog ────────────────────────────────────────────────────────────

export const PARTS_CONFIG: PartConfig[] = [

  // ── Frames ──────────────────────────────────────────────────────────────────

  {
    id: "f1", name: "Light Bee X Frame", category: "frame",
    price: 450, manufacturer: "Sur-Ron",
    specs: { mount_type: "sur-ron" },
    model: { type: "glb", url: "/models/surronframe.draco.glb", label: "Sur-Ron Light Bee X",
             color: "#555555", metalness: 0.7, roughness: 0.3 },
    mountOffset: { pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1] },
    calibrated: false,
  },
  {
    id: "f2", name: "Sting R Frame", category: "frame",
    price: 500, manufacturer: "Talaria",
    specs: { mount_type: "talaria" },
    model: { type: "glb", url: "/models/talaria.frame.draco.glb", label: "Talaria Sting R",
             color: "#555555", metalness: 0.7,  roughness: 0.3 },
    mountOffset: { pos: [1.75, -2.95, 3.80], rot: [-0.52, 1.55, 0.85], scale: [10, 10, 10] },
    calibrated: true,
  },
  {
    id: "f3", name: "Ebox Frame", category: "frame",
    price: 380, manufacturer: "Ebox",
    specs: { mount_type: "ebox" },
    model: { type: "stl", url: "/models/Ebox%20Frame.stl", label: "Ebox Frame",
             color: "#777777", metalness: 0.6,  roughness: 0.4 },
    mountOffset: { pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1] },
    calibrated: false,
  },
  {
    id: "f4", name: "Eride Pro SS Frame", category: "frame",
    price: 520, manufacturer: "Eride",
    specs: { mount_type: "eride" },
    model: { type: "stl", url: "/models/Eride%20Pro%20SS%20Frame.stl", label: "Eride Pro SS",
             color: "#888888", metalness: 0.65, roughness: 0.35 },
    mountOffset: { pos: [0, 1.4, 0], rot: [-1.49159265358979, -0.001592653589793, 3.13840734641021], scale: [0.05, 0.05, 0.05] },
    calibrated: true,
  },
  {
    id: "f5", name: "Macfox X1S Frame", category: "frame",
    price: 420, manufacturer: "Macfox",
    specs: { mount_type: "macfox" },
    model: { type: "stl", url: "/models/Macfox%20X1S%20Frame.stl", label: "Macfox X1S",
             color: "#999999", metalness: 0.6,  roughness: 0.4 },
    mountOffset: { pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1] },
    calibrated: false,
  },
  {
    id: "f6", name: "Talaria X3 Frame", category: "frame",
    price: 540, manufacturer: "Talaria",
    specs: { mount_type: "talaria" },
    model: { type: "stl", url: "/models/Talaria%20X3%20Frame.stl", label: "Talaria X3",
             color: "#555555", metalness: 0.7,  roughness: 0.3 },
    mountOffset: { pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1] },
    calibrated: false,
  },
  {
    id: "f7", name: "Tuttio Frame", category: "frame",
    price: 460, manufacturer: "Tuttio",
    specs: { mount_type: "tuttio" },
    model: { type: "stl", url: "/models/Tuttio%20Frame.stl", label: "Tuttio Frame",
             color: "#666666", metalness: 0.65, roughness: 0.35 },
    mountOffset: { pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1] },
    calibrated: false,
  },
  {
    id: "f8", name: "Yozma IN10 Frame", category: "frame",
    price: 470, manufacturer: "Yozma",
    specs: { mount_type: "yozma" },
    model: { type: "stl", url: "/models/Yozma%20IN10%20Frame.stl", label: "Yozma IN10",
             color: "#777777", metalness: 0.6,  roughness: 0.4 },
    mountOffset: { pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1] },
    calibrated: false,
  },

  // ── Motors ──────────────────────────────────────────────────────────────────

  {
    id: "m1", name: "Sotion Motor", category: "motor",
    price: 899, manufacturer: "Sotion",
    specs: { mount_type: "talaria" },
    model: { type: "glb", url: "/models/sotionmotor.draco.glb", label: "Sotion Motor",
             color: "#cccccc", metalness: 0.85, roughness: 0.15 },
    mountOffset: { pos: [0.7, -1.25, 2.50], rot: [-1.55, 3.15, 6.27], scale: [1, 1, 1] },
    calibrated: true,
  },
  {
    id: "m2", name: "KO Moto Factory Spec", category: "motor",
    price: 950, manufacturer: "KO Moto",
    specs: { mount_type: "sur-ron" },
    model: { type: "glb", url: "/models/kofactoryspecmotor.draco.glb", label: "KO Factory Spec",
             color: "#eab308", metalness: 0.9,  roughness: 0.1 },
    mountOffset: { pos: [0.7, -1.25, 2.50], rot: [-1.55, 3.15, 6.27], scale: [0.01, 0.01, 0.01] },
    calibrated: true,
  },
  {
    id: "m3", name: "Eride Pro SS 72V Motor", category: "motor",
    price: 870, manufacturer: "Eride",
    specs: { mount_type: "eride" },
    model: { type: "stl", url: "/models/Eride%20Pro%20SS%2072V%20Motor.stl", label: "Eride Pro Motor",
             color: "#aaaaaa", metalness: 0.8,  roughness: 0.2 },
    mountOffset: { pos: [-0.15, 0.3, 0.7], rot: [-0.361592653589793, -1.61159265358979, 0], scale: [0.05, 0.05, 0.05] },
    calibrated: true,
  },

  // ── Batteries ───────────────────────────────────────────────────────────────

  {
    id: "b1", name: "Gladiator 72v 42Ah", category: "battery",
    price: 2100, manufacturer: "ChiBattery",
    specs: { voltage: 72, connector: "qs8" },
    // no model → placeholder geometry
  },
  {
    id: "b2", name: "EBMX 60v 60Ah", category: "battery",
    price: 2150, manufacturer: "EBMX",
    specs: { voltage: 60, connector: "supco" },
    // no model → placeholder geometry
  },
  {
    id: "b3", name: "Chi Battery", category: "battery",
    price: 1750, manufacturer: "ChiBattery",
    specs: { voltage: 72, connector: "xt90" },
    model: { type: "stl", url: "/models/Chi%20Battery.stl", label: "Chi Battery",
             color: "#ef4444", metalness: 0.3,  roughness: 0.7 },
    mountOffset: { pos: [0, 1.4, 1.1], rot: [0.538407346410207, 0, 0], scale: [0.045, 0.045, 0.045] },
    calibrated: true,
  },
  {
    id: "b4", name: "Tuttio Chi Battery", category: "battery",
    price: 1900, manufacturer: "Tuttio",
    specs: { voltage: 72, connector: "xt90" },
    model: { type: "stl", url: "/models/Tuttio%20Chi%20Battery.stl", label: "Tuttio Chi Battery",
             color: "#dc2626", metalness: 0.3,  roughness: 0.7 },
    mountOffset: { pos: [0, 1.0, 0.2], rot: [0, 0, 0], scale: [1, 1, 1] },
    calibrated: false,
  },

  // ── Controllers ─────────────────────────────────────────────────────────────

  {
    id: "c1", name: "X-9000", category: "controller",
    price: 1050, manufacturer: "EBMX",
    specs: { max_voltage: 84, min_voltage: 48, connectors: ["qs8", "supco"] },
    // no model → placeholder geometry
  },
  {
    id: "c2", name: "BAC4000", category: "controller",
    price: 900, manufacturer: "ASI",
    specs: { max_voltage: 72, min_voltage: 48, connectors: ["supco"] },
    model: { type: "stl", url: "/models/BAC4000%20Controller.stl", label: "BAC4000",
             color: "#10b981", metalness: 0.5,  roughness: 0.5 },
    mountOffset: { pos: [0, 1.3, 0.7], rot: [0, 0, 0], scale: [1, 1, 1] },
    calibrated: false,
  },
  {
    id: "c3", name: "Eride Pro Controller", category: "controller",
    price: 780, manufacturer: "Eride",
    specs: { max_voltage: 84, min_voltage: 48, connectors: ["xt90"] },
    model: { type: "stl", url: "/models/Eride%20Pro%20Controller.stl", label: "Eride Pro Ctrl",
             color: "#06b6d4", metalness: 0.5,  roughness: 0.5 },
    mountOffset: { pos: [0, 1.18, 1.38], rot: [0.418407346410207, 0, 3.13840734641021], scale: [0.05, 0.05, 0.05] },
    calibrated: true,
  },

  // ── Seat ────────────────────────────────────────────────────────────────────

  {
    id: "s1", name: "Eride OEM Seat", category: "seat",
    price: 185, manufacturer: "Eride",
    specs: {},
    model: { type: "stl", url: "/models/Eride%20OEM%20Seat.stl", label: "Eride OEM Seat",
             color: "#1c1c2e", metalness: 0.1,  roughness: 0.9 },
    mountOffset: { pos: [0, 2.84, -0.08], rot: [1.01840734641021, 3.10840734641021, 0], scale: [0.0757, 0.0757, 0.0757] },
    calibrated: true,
  },
];

// ─── Derived Lookup Maps ──────────────────────────────────────────────────────

/** O(1) lookup by part ID. */
export const PARTS_BY_ID: Record<string, PartConfig> =
  Object.fromEntries(PARTS_CONFIG.map(p => [p.id, p]));

/** O(1) lookup by category. Returns undefined for categories with no parts. */
export const PARTS_BY_CATEGORY: Partial<Record<PartCategory, PartConfig[]>> =
  PARTS_CONFIG.reduce<Partial<Record<PartCategory, PartConfig[]>>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category]!.push(p);
    return acc;
  }, {});
