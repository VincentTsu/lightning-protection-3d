import { Equipment, LightningRod, LightningWire, ProtectionStatus } from '../types';
import { protectionRadius, correctionFactor, distanceBetweenRods, jointMinHeight, jointHalfWidth } from './rodCalc';
import { protectionWidth } from './wireCalc';

function pointDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function pointToSegmentDistance(
  px: number, py: number,
  x1: number, y1: number, x2: number, y2: number
): number {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return pointDistance(px, py, x1, y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return pointDistance(px, py, x1 + t * dx, y1 + t * dy);
}

/** Perpendicular distance from point to infinite line through A-B */
function pointToLineDistance(
  px: number, py: number,
  ax: number, ay: number, bx: number, by: number
): number {
  const dx = bx - ax, dy = by - ay;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-9) return pointDistance(px, py, ax, ay);
  // Cross product magnitude / line length
  return Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
}

/** Check if point is between two rods in the AB direction (projection check) */
function isPointBetweenRods(
  px: number, py: number, a: LightningRod, b: LightningRod
): boolean {
  const D = distanceBetweenRods(a, b);
  const dA = pointDistance(px, py, a.x, a.y);
  const dB = pointDistance(px, py, b.x, b.y);
  return dA <= D && dB <= D;
}

function checkRodProtection(
  eq: Equipment, rods: LightningRod[]
): { protected: boolean; by: string[]; margin: number } {
  const by: string[] = [];
  let bestMargin = -Infinity;

  // 1) Single-rod check
  for (const rod of rods) {
    const dist = pointDistance(eq.x, eq.y, rod.x, rod.y);
    const rx = protectionRadius(rod.height, eq.height);
    const margin = rx - dist;
    if (margin >= 0) {
      by.push(rod.id);
      bestMargin = Math.max(bestMargin, margin);
    }
  }

  // 2) Joint protection (two-rod pairs) — only if not already protected
  if (by.length === 0 && rods.length >= 2) {
    for (let i = 0; i < rods.length; i++) {
      for (let j = i + 1; j < rods.length; j++) {
        const h = Math.max(rods[i].height, rods[j].height);
        const D = distanceBetweenRods(rods[i], rods[j]);
        const h0 = jointMinHeight(h, D);
        if (eq.height >= h0) continue;           // too high for joint protection
        if (!isPointBetweenRods(eq.x, eq.y, rods[i], rods[j])) continue; // outside AB span

        // Perpendicular check: must be within bx of the centreline
        const p = correctionFactor(h);
        const bx = jointHalfWidth(h0, eq.height, p);
        const perpDist = pointToLineDistance(eq.x, eq.y, rods[i].x, rods[i].y, rods[j].x, rods[j].y);
        if (perpDist > bx) continue;              // too far from centreline

        by.push(rods[i].id, rods[j].id);
        const margin = bx - perpDist;
        bestMargin = Math.max(bestMargin, margin);
      }
    }
  }

  return { protected: by.length > 0, by, margin: bestMargin };
}

function checkWireProtection(
  eq: Equipment, wires: LightningWire[]
): { protected: boolean; by: string[]; margin: number } {
  const by: string[] = [];
  let bestMargin = -Infinity;
  for (const wire of wires) {
    const dist = pointToSegmentDistance(eq.x, eq.y, wire.x1, wire.y1, wire.x2, wire.y2);
    const bx = protectionWidth(wire.height, eq.height);
    const margin = bx - dist;
    if (margin >= 0) {
      by.push(wire.id);
      bestMargin = Math.max(bestMargin, margin);
    }
  }
  return { protected: by.length > 0, by, margin: bestMargin };
}

export function checkEquipmentProtection(
  eq: Equipment, rods: LightningRod[], wires: LightningWire[]
): ProtectionStatus {
  const rodResult = checkRodProtection(eq, rods);
  const wireResult = checkWireProtection(eq, wires);
  return {
    equipmentId: eq.id,
    protected: rodResult.protected || wireResult.protected,
    protectedBy: [...rodResult.by, ...wireResult.by],
    margin: Math.max(rodResult.margin, wireResult.margin),
  };
}

export function checkAllProtections(
  equipment: Equipment[], rods: LightningRod[], wires: LightningWire[]
): ProtectionStatus[] {
  return equipment.map(eq => checkEquipmentProtection(eq, rods, wires));
}
