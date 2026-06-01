import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { evaluateCompatibility, CompatibilityIssue } from '@/lib/compatibility';

export type PartCategory = 'frame' | 'motor' | 'battery' | 'controller' | 'seat' | 'brakes' | 'suspension' | 'wheels';

export interface Part {
  id: string;
  name: string;
  category: PartCategory;
  price: number;
  manufacturer: string;
  specs?: Record<string, string | number | boolean | string[]>;
}

export interface ConfiguratorState {
  selectedParts: Record<PartCategory, Part | null>;
  issues: CompatibilityIssue[];
  setPart: (category: PartCategory, part: Part | null) => void;
  clearBuild: () => void;
  totalPrice: () => number;
}

const initialState: Record<PartCategory, Part | null> = {
  frame: null,
  motor: null,
  battery: null,
  controller: null,
  seat: null,
  brakes: null,
  suspension: null,
  wheels: null,
};

export const useConfiguratorStore = create<ConfiguratorState>()(
  persist(
    (set, get) => ({
      selectedParts: initialState,
      issues: [],
      setPart: (category, part) => {
        set((state) => {
          const newParts = { ...state.selectedParts, [category]: part };
          return { selectedParts: newParts, issues: evaluateCompatibility(newParts) };
        });
      },
      clearBuild: () => set({ selectedParts: initialState, issues: [] }),
      totalPrice: () => {
        const parts = Object.values(get().selectedParts);
        return parts.reduce((total, part) => total + (part?.price || 0), 0);
      },
    }),
    {
      name: 'voltforge_build',
      partialize: (state) => ({ selectedParts: state.selectedParts }),
    }
  )
);
