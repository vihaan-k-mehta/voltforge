"use client";

import { useConfiguratorStore, PartCategory, Part } from "@/store/useConfiguratorStore";
import { PARTS_BY_CATEGORY, PARTS_BY_ID } from "@/data/parts";
import { useState, useRef, type FC } from "react";
import { ChevronRight, Settings2, Battery, Zap, Activity, Armchair, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

function getSpecChips(category: PartCategory, specs: Part["specs"]): string[] {
  if (!specs) return [];
  const chips: string[] = [];
  switch (category) {
    case "frame":
    case "motor":
      if (specs.mount_type) chips.push(`${String(specs.mount_type).replace(/-/g, " ")} mount`);
      break;
    case "battery":
      if (specs.voltage)    chips.push(`${specs.voltage}V`);
      if (specs.connector)  chips.push(String(specs.connector).toUpperCase());
      break;
    case "controller":
      if (specs.max_voltage) chips.push(`≤ ${specs.max_voltage}V`);
      if (Array.isArray(specs.connectors) && specs.connectors.length)
        chips.push(specs.connectors.map((c: string) => c.toUpperCase()).join(" / "));
      break;
  }
  return chips.slice(0, 2);
}

const CATEGORIES: { id: PartCategory; label: string; icon: FC<{ className?: string }> }[] = [
  { id: "frame",      label: "Frame",      icon: Settings2 },
  { id: "motor",      label: "Motor",      icon: Zap },
  { id: "battery",    label: "Battery",    icon: Battery },
  { id: "controller", label: "Controller", icon: Activity },
  { id: "seat",       label: "Seat",       icon: Armchair },
];

export function Sidebar() {
  const { selectedParts, setPart, totalPrice, issues, clearBuild, partColors, setPartColor } = useConfiguratorStore();
  const [activeCategory, setActiveCategory] = useState<PartCategory | null>(null);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = () => {
    // selectedParts are already persisted by the Zustand persist middleware;
    // this just gives the user explicit confirmation.
    setSaved(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/80 backdrop-blur-xl">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-2xl font-bold text-white tracking-tight">Parts Catalog</h1>
        <p className="text-sm text-zinc-400 mt-1">Select components to build your setup.</p>

        <div className="mt-4 p-4 glass-panel rounded-lg flex justify-between items-center">
          <span className="text-zinc-300 font-medium">Estimated Total</span>
          <span className="text-xl font-bold text-blue-400">${totalPrice().toLocaleString()}</span>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg transition-colors"
          >
            {saved ? "Build Saved!" : "Save Build"}
          </button>
          <button
            onClick={() => clearBuild()}
            className="px-4 py-3 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 transition-colors"
            title="Clear build"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {issues.length > 0 && (
          <div className="space-y-2">
            {issues.map((issue, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-3 rounded-lg text-sm flex items-start gap-2",
                  issue.severity === 'error'   ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                  issue.severity === 'warning' ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                                                 "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                )}
              >
                <Activity className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{issue.message}</span>
              </div>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {!activeCategory ? (
            <motion.div
              key="categories"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-2"
            >
              {CATEGORIES.map((cat) => {
                const isSelected = !!selectedParts[cat.id];
                const Icon = cat.icon;
                return (
                  <div key={cat.id} className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveCategory(cat.id)}
                      className="flex-1 flex items-center justify-between p-4 glass-button rounded-xl group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg transition-colors",
                          isSelected ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-zinc-400 group-hover:text-white"
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-white">{cat.label}</div>
                          <div className="text-xs text-zinc-500">
                            {isSelected ? selectedParts[cat.id]?.name : "None selected"}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" />
                    </button>
                    {isSelected && (
                      <button
                        onClick={() => setPart(cat.id, null)}
                        className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                        aria-label={`Remove ${cat.label}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="parts"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <button
                onClick={() => setActiveCategory(null)}
                className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <ChevronRight className="w-4 h-4 rotate-180" /> Back to categories
              </button>

              <div className="space-y-2">
                {(PARTS_BY_CATEGORY[activeCategory] ?? []).map((part) => {
                  const isSelected = selectedParts[activeCategory]?.id === part.id;

                  return (
                    <div key={part.id} className="relative">
                      <button
                        onClick={() => setPart(activeCategory, isSelected ? null : part)}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border transition-all",
                          isSelected
                            ? "bg-blue-500/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                            : "glass-button border-white/5 hover:border-white/20"
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-xs text-zinc-500 mb-1">{part.manufacturer}</div>
                            <div className="font-medium text-white">{part.name}</div>
                          </div>
                          <div className="font-mono text-sm text-blue-400">${part.price}</div>
                        </div>
                        {(() => {
                          const chips = getSpecChips(activeCategory, part.specs);
                          return chips.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {chips.map((chip) => (
                                <span key={chip} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 font-mono">
                                  {chip}
                                </span>
                              ))}
                            </div>
                          ) : null;
                        })()}
                      </button>
                      {isSelected && PARTS_BY_ID[part.id]?.model && (
                        <label
                          className="absolute top-3 right-10 cursor-pointer"
                          title="Change part color"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span
                            className="block w-5 h-5 rounded-full border-2 border-white/20 shadow-sm"
                            style={{ background: partColors[part.id] ?? PARTS_BY_ID[part.id]!.model!.color }}
                          />
                          <input
                            type="color"
                            className="sr-only"
                            value={partColors[part.id] ?? PARTS_BY_ID[part.id]!.model!.color}
                            onChange={(e) => setPartColor(part.id, e.target.value)}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
                {(PARTS_BY_CATEGORY[activeCategory] ?? []).length === 0 && (
                  <div className="text-center p-8 text-zinc-500 text-sm">
                    No parts available in this category yet.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
