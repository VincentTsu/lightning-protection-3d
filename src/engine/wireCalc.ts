import { LightningWire, WireProtectionRange } from '../types';
import { correctionFactor } from './rodCalc';

/** 单条避雷线在高度 hx 处的保护宽度 bx */
export function protectionWidth(h: number, hx: number): number {
  if (hx >= h) return 0;
  const p = correctionFactor(h);
  if (hx >= h / 2) {
    return 0.47 * (h - hx) * p;
  } else {
    return (h - 1.53 * hx) * p;
  }
}

/** 地面保护宽度 b0 */
export function groundProtectionWidth(h: number): number {
  return h * correctionFactor(h);
}

/** 线长度 */
export function wireLength(w: LightningWire): number {
  return Math.sqrt((w.x2 - w.x1) ** 2 + (w.y2 - w.y1) ** 2);
}

/** 计算单条避雷线的保护剖面 */
export function wireProtectionProfile(wire: LightningWire): WireProtectionRange {
  const samples = 20;
  const profiles: { hz: number; b: number }[] = [];
  for (let i = 0; i <= samples; i++) {
    const hz = (wire.height / samples) * i;
    profiles.push({ hz, b: protectionWidth(wire.height, hz) });
  }
  return {
    wireId: wire.id,
    b0: groundProtectionWidth(wire.height),
    profiles,
  };
}

/** 计算所有避雷线的保护范围 */
export function computeAllWireProtections(
  wires: LightningWire[]
): WireProtectionRange[] {
  return wires.map(wireProtectionProfile);
}

/** 两条平行避雷线联合保护最低点（近似：h0 = h - D/(5p)） */
export function wireJointMinHeight(h: number, D: number): number {
  const p = correctionFactor(h);
  return Math.max(0, h - D / (5 * p));
}
