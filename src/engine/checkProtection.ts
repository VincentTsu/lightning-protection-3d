import { Equipment, LightningRod, LightningWire, ProtectionStatus } from '../types';
import { protectionRadius, distanceBetweenRods, jointMinHeight } from './rodCalc';
import { protectionWidth } from './wireCalc';

/** 点到点的距离 */
function pointDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

/** 点到线段的垂直距离 */
function pointToSegmentDistance(
  px: number, py: number,
  x1: number, y1: number, x2: number, y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return pointDistance(px, py, x1, y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return pointDistance(px, py, x1 + t * dx, y1 + t * dy);
}

/** 判断点是否在两针之间（投影在线段上） */
function isPointBetweenRods(
  eq: Equipment, a: LightningRod, b: LightningRod
): boolean {
  const D = distanceBetweenRods(a, b);
  const dA = pointDistance(eq.x, eq.y, a.x, a.y);
  const dB = pointDistance(eq.x, eq.y, b.x, b.y);
  return dA <= D && dB <= D;
}

/** 检查单个设备是否受避雷针保护 */
function checkRodProtection(
  eq: Equipment, rods: LightningRod[]
): { protected: boolean; by: string[]; margin: number } {
  const by: string[] = [];
  let bestMargin = -Infinity;

  // 单针保护判定
  for (const rod of rods) {
    const dist = pointDistance(eq.x, eq.y, rod.x, rod.y);
    const rx = protectionRadius(rod.height, eq.height);
    const margin = rx - dist;
    if (margin >= 0) {
      by.push(rod.id);
      bestMargin = Math.max(bestMargin, margin);
    }
  }

  // 双针联合保护判定
  if (by.length === 0 && rods.length >= 2) {
    for (let i = 0; i < rods.length; i++) {
      for (let j = i + 1; j < rods.length; j++) {
        const D = distanceBetweenRods(rods[i], rods[j]);
        const h = Math.max(rods[i].height, rods[j].height);
        const h0 = jointMinHeight(h, D);
        if (eq.height <= h0 && isPointBetweenRods(eq, rods[i], rods[j])) {
          by.push(rods[i].id, rods[j].id);
          bestMargin = Math.max(bestMargin, h0 - eq.height);
        }
      }
    }
  }

  return { protected: by.length > 0, by, margin: bestMargin };
}

/** 检查单个设备是否受避雷线保护 */
function checkWireProtection(
  eq: Equipment, wires: LightningWire[]
): { protected: boolean; by: string[]; margin: number } {
  const by: string[] = [];
  let bestMargin = -Infinity;

  for (const wire of wires) {
    const dist = pointToSegmentDistance(
      eq.x, eq.y, wire.x1, wire.y1, wire.x2, wire.y2
    );
    const bx = protectionWidth(wire.height, eq.height);
    const margin = bx - dist;
    if (margin >= 0) {
      by.push(wire.id);
      bestMargin = Math.max(bestMargin, margin);
    }
  }

  return { protected: by.length > 0, by, margin: bestMargin };
}

/** 综合判定设备是否受保护 */
export function checkEquipmentProtection(
  eq: Equipment,
  rods: LightningRod[],
  wires: LightningWire[]
): ProtectionStatus {
  const rodResult = checkRodProtection(eq, rods);
  const wireResult = checkWireProtection(eq, wires);

  const allBy = [...rodResult.by, ...wireResult.by];
  const margin = Math.max(rodResult.margin, wireResult.margin);

  return {
    equipmentId: eq.id,
    protected: allBy.length > 0,
    protectedBy: allBy,
    margin,
  };
}

/** 批量判定所有设备 */
export function checkAllProtections(
  equipment: Equipment[],
  rods: LightningRod[],
  wires: LightningWire[]
): ProtectionStatus[] {
  return equipment.map(eq => checkEquipmentProtection(eq, rods, wires));
}
