import { create } from 'zustand';
import {
  Equipment, LightningRod, LightningWire, ProtectionStatus,
  RodProtectionRange, WireProtectionRange, DimensionLine,
} from '../types';
import { computeAllRodProtections, distanceBetweenRods } from '../engine/rodCalc';
import { computeAllWireProtections } from '../engine/wireCalc';
import { checkAllProtections } from '../engine/checkProtection';

let nextId = 1;
function uid(): string {
  return `id-${nextId++}`;
}

interface AppState {
  rods: LightningRod[];
  wires: LightningWire[];
  equipment: Equipment[];
  rodProtections: RodProtectionRange[];
  wireProtections: WireProtectionRange[];
  protectionStatuses: ProtectionStatus[];
  dimensions: DimensionLine[];
  sliceHeight: number;

  addRod: (x: number, y: number, height: number) => void;
  updateRod: (id: string, patch: Partial<LightningRod>) => void;
  moveRod: (id: string, x: number, z: number) => void;
  removeRod: (id: string) => void;

  addWire: (x1: number, y1: number, x2: number, y2: number, height: number) => void;
  updateWire: (id: string, patch: Partial<LightningWire>) => void;
  removeWire: (id: string) => void;

  addEquipment: (x: number, y: number, height: number, width: number, depth: number, label: string) => void;
  updateEquipment: (id: string, patch: Partial<Equipment>) => void;
  moveEquipment: (id: string, x: number, z: number) => void;
  removeEquipment: (id: string) => void;

  setSliceHeight: (h: number) => void;
  recalculate: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  rods: [
    { id: uid(), x: 0, y: 0, height: 20, type: 'rod' as const },
    { id: uid(), x: 30, y: 0, height: 15, type: 'rod' as const },
  ],
  wires: [],
  equipment: [
    { id: uid(), x: 10, y: 5, height: 5, width: 2, depth: 2, label: '设备 #1' },
  ],
  rodProtections: [],
  wireProtections: [],
  protectionStatuses: [],
  dimensions: [],
  sliceHeight: 5,

  addRod: (x, y, height) => {
    const rod: LightningRod = { id: uid(), x, y, height, type: 'rod' };
    set(s => ({ rods: [...s.rods, rod] }));
    get().recalculate();
  },
  updateRod: (id, patch) => {
    set(s => ({
      rods: s.rods.map(r => r.id === id ? { ...r, ...patch } : r),
    }));
    get().recalculate();
  },
  /** Lightweight position-only update – skips recalculate for smooth drag */
  moveRod: (id, x, z) => {
    set(s => ({
      rods: s.rods.map(r => r.id === id ? { ...r, x, y: z } : r),
    }));
  },
  removeRod: (id) => {
    set(s => ({ rods: s.rods.filter(r => r.id !== id) }));
    get().recalculate();
  },

  addWire: (x1, y1, x2, y2, height) => {
    const wire: LightningWire = { id: uid(), x1, y1, x2, y2, height, type: 'wire' };
    set(s => ({ wires: [...s.wires, wire] }));
    get().recalculate();
  },
  updateWire: (id, patch) => {
    set(s => ({
      wires: s.wires.map(w => w.id === id ? { ...w, ...patch } : w),
    }));
    get().recalculate();
  },
  removeWire: (id) => {
    set(s => ({ wires: s.wires.filter(w => w.id !== id) }));
    get().recalculate();
  },

  addEquipment: (x, y, height, width, depth, label) => {
    const eq: Equipment = { id: uid(), x, y, height, width, depth, label };
    set(s => ({ equipment: [...s.equipment, eq] }));
    get().recalculate();
  },
  updateEquipment: (id, patch) => {
    set(s => ({
      equipment: s.equipment.map(e => e.id === id ? { ...e, ...patch } : e),
    }));
    get().recalculate();
  },
  /** Lightweight position-only update – skips recalculate for smooth drag */
  moveEquipment: (id, x, z) => {
    set(s => ({
      equipment: s.equipment.map(e => e.id === id ? { ...e, x, y: z } : e),
    }));
  },
  removeEquipment: (id) => {
    set(s => ({ equipment: s.equipment.filter(e => e.id !== id) }));
    get().recalculate();
  },

  setSliceHeight: (h) => set({ sliceHeight: h }),

  recalculate: () => {
    const { rods, wires, equipment } = get();
    const rodProtections = computeAllRodProtections(rods);
    const wireProtections = computeAllWireProtections(wires);
    const protectionStatuses = checkAllProtections(equipment, rods, wires);

    const dimensions: DimensionLine[] = [];
    rods.forEach(r => {
      dimensions.push({
        start: [r.x, r.height, r.y],
        end: [r.x, 0, r.y],
        label: `h=${r.height.toFixed(1)}m`,
        offset: [r.x + 1, r.height / 2, r.y],
      });
    });
    // 针间距离标注
    for (let i = 0; i < rods.length; i++) {
      for (let j = i + 1; j < rods.length; j++) {
        const D = distanceBetweenRods(rods[i], rods[j]);
        const midX = (rods[i].x + rods[j].x) / 2;
        const midY = (rods[i].y + rods[j].y) / 2;
        dimensions.push({
          start: [rods[i].x, 0, rods[i].y],
          end: [rods[j].x, 0, rods[j].y],
          label: `D=${D.toFixed(1)}m`,
          offset: [midX, -2, midY],
        });
      }
    }
    // 设备标注
    equipment.forEach(eq => {
      const st = protectionStatuses.find(s => s.equipmentId === eq.id);
      dimensions.push({
        start: [eq.x, 0, eq.y],
        end: [eq.x, eq.height, eq.y],
        label: `${eq.label} hx=${eq.height}m ${st?.protected ? '✓受保护' : '✗未保护'}`,
        offset: [eq.x + 1, eq.height / 2, eq.y],
      });
    });

    set({ rodProtections, wireProtections, protectionStatuses, dimensions });
  },
}));
