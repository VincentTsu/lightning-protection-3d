import { LightningRod, RodProtectionRange } from '../types';

export interface JointProtectionPair {
  rodA: LightningRod;
  rodB: LightningRod;
  h: number;
  D: number;
  h0: number;
  p: number;
  sourceAId: string;
  sourceBId: string;
}

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

/** GB50064 Fig. 5.2.2-2 data for the minimum one-side joint width bx. */
const JOINT_BX_X = [0, 1, 2, 3, 4, 5, 5.5, 6, 6.5, 7];
const JOINT_BX_HX = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.7, 0.9];

// Digitized values from GB50064 Fig. 5.2.2-2: y = bx / (ha * P),
// x = D / (ha * P), curve key = hx / h. Values are later capped by rx.
const JOINT_BX_TABLE = [
  [1.50, 1.47, 1.38, 1.22, 1.02, 0.75, 0.56, 0.40, 0.20, 0],
  [1.44, 1.37, 1.27, 1.12, 0.93, 0.68, 0.52, 0.37, 0.19, 0],
  [1.38, 1.27, 1.16, 1.01, 0.84, 0.61, 0.47, 0.34, 0.17, 0],
  [1.29, 1.16, 1.06, 0.92, 0.76, 0.55, 0.43, 0.31, 0.16, 0],
  [1.17, 1.06, 0.96, 0.83, 0.68, 0.49, 0.38, 0.28, 0.14, 0],
  [1.00, 0.96, 0.87, 0.75, 0.61, 0.43, 0.34, 0.25, 0.13, 0],
  [1.00, 0.82, 0.72, 0.62, 0.50, 0.35, 0.28, 0.20, 0.10, 0],
  [1.00, 0.70, 0.61, 0.50, 0.40, 0.27, 0.21, 0.15, 0.08, 0],
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolate(xs: number[], ys: number[], x: number): number {
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];

  for (let i = 0; i < xs.length - 1; i++) {
    if (x >= xs[i] && x <= xs[i + 1]) {
      return lerp(ys[i], ys[i + 1], (x - xs[i]) / (xs[i + 1] - xs[i]));
    }
  }
  return 0;
}

function chartBxRatio(hxRatio: number, dRatio: number): number {
  if (hxRatio <= JOINT_BX_HX[0]) {
    return interpolate(JOINT_BX_X, JOINT_BX_TABLE[0], dRatio);
  }
  if (hxRatio >= JOINT_BX_HX[JOINT_BX_HX.length - 1]) {
    return interpolate(JOINT_BX_X, JOINT_BX_TABLE[JOINT_BX_TABLE.length - 1], dRatio);
  }

  for (let i = 0; i < JOINT_BX_HX.length - 1; i++) {
    const h0 = JOINT_BX_HX[i];
    const h1 = JOINT_BX_HX[i + 1];
    if (hxRatio >= h0 && hxRatio <= h1) {
      const y0 = interpolate(JOINT_BX_X, JOINT_BX_TABLE[i], dRatio);
      const y1 = interpolate(JOINT_BX_X, JOINT_BX_TABLE[i + 1], dRatio);
      return lerp(y0, y1, (hxRatio - h0) / (h1 - h0));
    }
  }

  return 0;
}

/** Minimum one-side width bx between two equal-height rods per GB50064 Fig. 5.2.2-2. */
export function jointHalfWidth(h: number, D: number, hx: number, p: number): number {
  if (hx < 0 || hx >= h) return 0;

  const h0 = Math.max(0, h - D / (7 * p));
  if (hx >= h0) return 0;

  const ha = h - hx;
  if (ha <= 1e-9) return 0;

  const dRatio = D / (ha * p);
  if (dRatio >= 7) return 0;

  const bx = chartBxRatio(hx / h, dRatio) * ha * p;
  const rx = protectionRadius(h, hx);
  return Math.min(bx, rx);
}

/** Build the GB50064 equivalent equal-height rod pair for joint protection. */
export function equivalentJointPair(
  a: LightningRod,
  b: LightningRod
): JointProtectionPair | null {
  const D = distanceBetweenRods(a, b);
  if (D < 1e-9) return null;

  const [high, low] = a.height >= b.height ? [a, b] : [b, a];
  const h = Math.min(a.height, b.height);
  const p = correctionFactor(h);

  let eqA = { ...a, height: h };
  let eqB = { ...b, height: h };
  let effectiveD = D;

  if (Math.abs(a.height - b.height) > 1e-9) {
    const ux = (low.x - high.x) / D;
    const uy = (low.y - high.y) / D;
    const highRadiusAtLowTip = protectionRadius(high.height, low.height);
    effectiveD = D - highRadiusAtLowTip;

    if (effectiveD <= 1e-9) return null;

    const virtualHigh: LightningRod = {
      ...high,
      id: `${high.id}:equiv-${low.id}`,
      x: high.x + ux * highRadiusAtLowTip,
      y: high.y + uy * highRadiusAtLowTip,
      height: h,
    };
    const equalLow: LightningRod = { ...low, height: h };

    if (a.id === high.id) {
      eqA = virtualHigh;
      eqB = equalLow;
    } else {
      eqA = equalLow;
      eqB = virtualHigh;
    }
  }

  const h0 = Math.max(0, h - effectiveD / (7 * p));
  if (h0 <= 0) return null;

  return {
    rodA: eqA,
    rodB: eqB,
    h,
    D: effectiveD,
    h0,
    p,
    sourceAId: a.id,
    sourceBId: b.id,
  };
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
      const pair = equivalentJointPair(rods[i], rods[j]);
      if (!pair) continue;
      const h0 = pair.h0;
      for (const idx of [i, j]) {
        ranges[idx].h0 = ranges[idx].h0 !== undefined
          ? Math.min(ranges[idx].h0!, h0) : h0;
      }
    }
  }
  return ranges;
}
