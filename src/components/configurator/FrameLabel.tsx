"use client";

import { useConfiguratorStore } from "@/store/useConfiguratorStore";

export function FrameLabel() {
  const frame = useConfiguratorStore((s) => s.selectedParts.frame);
  return (
    <p className="text-sm text-zinc-400 mt-1">
      {frame
        ? `${frame.manufacturer} ${frame.name}`
        : "Select a frame to begin"}
    </p>
  );
}
