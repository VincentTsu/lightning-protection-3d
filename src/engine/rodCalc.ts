import { LightningRod, RodProtectionRange } from '../types';

/** 高度修正系数 p: h≤30m→p=1, h>30m→p=5.5/√h */
export function correctionFactor(h: number): number {
  if (h <= 30) return 1;
  return 5.5 / Math.sqrt(h);
}

/** 单根避雷针在高度 hx 处的保护半径 rx */
export function protectionRadius(h: number, hx: number): number {
  if (hx >= h) return 0;
  const p = correctionFactor(h);
  if (hx >= h / 2) {
    return (h - hx) * p;
  } else {
    return (1.5 * h - 2 * hx) * p;
  }
}

/** 地面保护半径 r0 */
export function groundProtectionRadius(h: number): number {
  return 1.5 * h * correctionFactor(h);
}

/** 两针间距 */
export function distanceBetweenRods(a: LightningRod, b: LightningRod): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** 双针联合保护最低点高度 h0 = h - D/(7p) */
export function jointMinHeight(h: number, D: number): number {
  const p = correctionFactor(h);
  return Math.max(0, h - D / (7 * p));
}

/** 计算单针的完整保护剖面（从地面到针尖，采样 20 个高度） */
export function rodProtectionProfile(rod: LightningRod): RodProtectionRange {
  const samples = 20;
  const profiles: { hz: number; r: number }[] = [];
  for (let i = 0; i <= samples; i++) {
    const hz = (rod.height / samples) * i;
    profiles.push({ hz, r: protectionRadius(rod.height, hz) });
  }
  return {
    rodId: rod.id,
    r0: groundProtectionRadius(rod.height),
    profiles,
  };
}

/** 计算所有避雷针的联合保护范围 */
export function computeAllRodProtections(
  rods: LightningRod[]
): RodProtectionRange[] {
  const ranges = rods.map(rodProtectionProfile);
  // 为每对避雷针计算联合保护最低点，双方都记录
  for (let i = 0; i < rods.length; i++) {
    for (let j = i + 1; j < rods.length; j++) {
      const D = distanceBetweenRods(rods[i], rods[j]);
      const h = Math.max(rods[i].height, rods[j].height);
      const h0 = jointMinHeight(h, D);
      for (const idx of [i, j]) {
        ranges[idx].h0 = ranges[idx].h0 !== undefined
          ? Math.min(ranges[idx].h0!, h0) : h0;
      }
    }
  }
  return ranges;
}
