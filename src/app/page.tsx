import { Suspense } from "react";
import { Scene } from "@/components/configurator/Scene";
import { Sidebar } from "@/components/configurator/Sidebar";

export default function ConfiguratorPage() {
  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden relative">
      {/* 3D Canvas Area */}
      <div className="flex-1 relative bg-gradient-to-b from-zinc-900 to-black">
        <Suspense fallback={
          <div className="absolute inset-0 flex items-center justify-center text-white/50">
            Loading 3D Engine...
          </div>
        }>
          <Scene />
        </Suspense>
        
        {/* Overlay Stats/Info */}
        <div className="absolute top-4 left-4 glass-panel rounded-lg p-4 pointer-events-none">
          <h2 className="text-xl font-bold">Custom Build</h2>
          <p className="text-sm text-zinc-400 mt-1">Sur-Ron Light Bee X Base</p>
        </div>
      </div>

      {/* Parts Selection Sidebar */}
      <div className="w-full md:w-96 glass-panel border-l border-t-0 border-white/10 flex flex-col h-full z-10">
        <Sidebar />
      </div>
    </div>
  );
}
