"use client";

import { useConfiguratorStore, PartCategory, Part } from "@/store/useConfiguratorStore";
import { useState } from "react";
import { ChevronRight, Settings2, Battery, Zap, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const CATEGORIES: { id: PartCategory; label: string; icon: React.ElementType }[] = [
  { id: "frame", label: "Frame", icon: Settings2 },
  { id: "motor", label: "Motor", icon: Zap },
  { id: "battery", label: "Battery", icon: Battery },
  { id: "controller", label: "Controller", icon: Activity },
];

const MOCK_DB: Record<PartCategory, Part[]> = {
  frame: [
    { id: "f1", name: "Light Bee X Frame", category: "frame", price: 450, manufacturer: "Sur-Ron", specs: { mount_type: "sur-ron" } },
    { id: "f2", name: "Sting R Frame", category: "frame", price: 500, manufacturer: "Talaria", specs: { mount_type: "talaria" } },
  ],
  motor: [
    { id: "m1", name: "Sotion Motor", category: "motor", price: 899, manufacturer: "Sotion", specs: { mount_type: "talaria" } },
    { id: "m2", name: "KO Moto Factory Spec", category: "motor", price: 950, manufacturer: "KO Moto", specs: { mount_type: "sur-ron" } },
  ],
  battery: [
    { id: "b1", name: "Gladiator 72v 42Ah", category: "battery", price: 2100, manufacturer: "ChiBattery", specs: { voltage: 72, connector: "qs8" } },
    { id: "b2", name: "EBMX 60v 60Ah", category: "battery", price: 2150, manufacturer: "EBMX", specs: { voltage: 60, connector: "supco" } },
  ],
  controller: [
    { id: "c1", name: "X-9000", category: "controller", price: 1050, manufacturer: "EBMX", specs: { max_voltage: 84, min_voltage: 48, connectors: ["qs8", "supco"] } },
    { id: "c2", name: "BAC4000", category: "controller", price: 900, manufacturer: "ASI", specs: { max_voltage: 72, min_voltage: 48, connectors: ["supco"] } },
  ],
  brakes: [],
  suspension: [],
  wheels: []
};

export function Sidebar() {
  const { selectedParts, setPart, totalPrice, issues } = useConfiguratorStore();
  const [activeCategory, setActiveCategory] = useState<PartCategory | null>(null);

  return (
    <div className="flex flex-col h-full bg-zinc-950/80 backdrop-blur-xl">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-2xl font-bold text-white tracking-tight">Parts Catalog</h1>
        <p className="text-sm text-zinc-400 mt-1">Select components to build your setup.</p>
        
        <div className="mt-4 p-4 glass-panel rounded-lg flex justify-between items-center">
          <span className="text-zinc-300 font-medium">Estimated Total</span>
          <span className="text-xl font-bold text-blue-400">${totalPrice().toLocaleString()}</span>
        </div>
        
        <button 
          onClick={() => alert("Build saved successfully! (Mock)")}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          Save Build
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {issues.length > 0 && (
          <div className="space-y-2">
            {issues.map((issue, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "p-3 rounded-lg text-sm flex items-start gap-2",
                  issue.severity === 'error' ? "bg-red-500/10 text-red-400 border border-red-500/20" : 
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
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className="w-full flex items-center justify-between p-4 glass-button rounded-xl group"
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
                {MOCK_DB[activeCategory].map((part) => {
                  const isSelected = selectedParts[activeCategory]?.id === part.id;
                  
                  return (
                    <button
                      key={part.id}
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
                    </button>
                  );
                })}
                {MOCK_DB[activeCategory].length === 0 && (
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
