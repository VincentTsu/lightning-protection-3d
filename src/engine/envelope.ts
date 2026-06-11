import { LightningRod, LightningWire, EnvelopeGeometry } from '../types';
import { protectionRadius, equivalentJointPair, jointHalfWidth, JointProtectionPair } from './rodCalc';
import { protectionWidth } from './wireCalc';

// ---------------------------------------------------------------------------
// Joint ring (shared by slice and 3D envelope)
// ---------------------------------------------------------------------------

/** Tangent points from external point P to circle (C,r) in XZ plane */
function tangentPoints(
  px: number, pz: number, cx: number, cz: number, r: number,
): [number, number][] | null {
  const dx = cx - px, dz = cz - pz;
  const dSq = dx * dx + dz * dz;
  if (dSq <= r * r) return null;
  const d = Math.sqrt(dSq), nx = dx / d, nz = dz / d;
  const disc = Math.sqrt(dSq - r * r);
  const a = (r * r) / d, b = (r * disc) / d;
  const rx = -nz, rz = nx;
  return [
    [cx - a * nx + b * rx, cz - a * nz + b * rz],
    [cx - a * nx - b * rx, cz - a * nz - b * rz],
  ];
}

/** Generate a closed ring for the joint cross-section at height y */
export function generateJointRing(
  rodA: LightningRod, rodB: LightningRod, y: number, ringVerts: number,
): [number, number, number][] | null {
  const pair = equivalentJointPair(rodA, rodB);
  if (!pair) return null;
  const { rodA: eqA, rodB: eqB, D, h, p, h0 } = pair;
  if (y >= h0) return null;
  const rx = protectionRadius(h, y);
  if (rx <= 0) return null;
  const bx = jointHalfWidth(h, D, y, p);

  const dx = eqB.x - eqA.x, dz = eqB.y - eqA.y;
  const geoD = Math.sqrt(dx * dx + dz * dz);
  if (geoD < 1e-9) return null;
  const ux = dx / geoD, uz = dz / geoD;
  const nx = -uz, nz = ux;
  const baseAngle = Math.atan2(uz, ux);

  // Narrowest point = midpoint of equivalent rods
  const mx = (eqA.x + eqB.x) / 2, mz = (eqA.y + eqB.y) / 2;

  let pLx = mx - bx * nx, pLz = mz - bx * nz;
  let pRx = mx + bx * nx, pRz = mz + bx * nz;

  let tAL = tangentPoints(pLx, pLz, eqA.x, eqA.y, rx);
  let tBL = tangentPoints(pLx, pLz, eqB.x, eqB.y, rx);
  let tAR = tangentPoints(pRx, pRz, eqA.x, eqA.y, rx);
  let tBR = tangentPoints(pRx, pRz, eqB.x, eqB.y, rx);

  if (!tAL || !tBL || !tAR || !tBR) {
    pLx = mx - rx * nx; pLz = mz - rx * nz;
    pRx = mx + rx * nx; pRz = mz + rx * nz;
    tAL = tangentPoints(pLx, pLz, eqA.x, eqA.y, rx);
    tBL = tangentPoints(pLx, pLz, eqB.x, eqB.y, rx);
    tAR = tangentPoints(pRx, pRz, eqA.x, eqA.y, rx);
    tBR = tangentPoints(pRx, pRz, eqB.x, eqB.y, rx);
  }
  if (!tAL || !tBL || !tAR || !tBR) return null;

  const pick = (pair: [number, number][], ox: number, oz: number) => {
    const d0 = (pair[0][0]-ox)**2+(pair[0][1]-oz)**2;
    const d1 = (pair[1][0]-ox)**2+(pair[1][1]-oz)**2;
    return d0 > d1 ? pair[0] : pair[1];
  };
  const TA_L = pick(tAL, eqB.x, eqB.y);
  const TB_L = pick(tBL, eqA.x, eqA.y);
  const TA_R = pick(tAR, eqB.x, eqB.y);
  const TB_R = pick(tBR, eqA.x, eqA.y);

  // Build ring with exact ringVerts vertices
  // Each arc contributes arcV+1 vertices, each tangent seg contributes tanV vertices
  // Total = 2*(arcV+1) + 4*tanV. Solve for arcV, tanV.
  const arcV = Math.max(4, Math.round((ringVerts - 4) * 0.35));
  let tanV = Math.max(1, Math.round((ringVerts - 2 * (arcV + 1)) / 4));
  // Adjust to hit exactly ringVerts
  while (2 * (arcV + 1) + 4 * tanV < ringVerts) tanV++;
  const ring: [number, number, number][] = [];

  ring.push(...arcPoints(eqA.x, eqA.y, rx, TA_R, TA_L, baseAngle + Math.PI, y, arcV));
  ring.push(...segPoints(TA_L, [pLx, pLz], y, tanV));
  ring.push(...segPoints([pLx, pLz], TB_L, y, tanV));
  ring.push(...arcPoints(eqB.x, eqB.y, rx, TB_L, TB_R, baseAngle, y, arcV));
  ring.push(...segPoints(TB_R, [pRx, pRz], y, tanV));
  ring.push(...segPoints([pRx, pRz], TA_R, y, tanV));

  // Trim or pad to exact ringVerts
  while (ring.length > ringVerts) ring.pop();
  while (ring.length < ringVerts) ring.push([...ring[ring.length - 1]]);

  return ring;
}

function arcPoints(
  cx: number, cz: number, r: number,
  from: [number, number], to: [number, number],
  farDir: number, y: number, n: number,
): [number, number, number][] {
  const norm = (a: number) => ((a % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);
  let a1 = norm(Math.atan2(from[1]-cz, from[0]-cx));
  let a2 = norm(Math.atan2(to[1]-cz, to[0]-cx));
  const lo = Math.min(a1, a2), hi = Math.max(a1, a2);
  const far = norm(farDir);
  let fa: number, ta: number;
  if (lo <= far && far <= hi) { fa = lo; ta = hi; }
  else { fa = hi; ta = lo + 2*Math.PI; }
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = fa + (ta - fa) * i / n;
    pts.push([cx + r * Math.cos(a), y, cz + r * Math.sin(a)]);
  }
  return pts;
}

function segPoints(
  a: [number, number], b: [number, number], y: number, n: number,
): [number, number, number][] {
  const pts: [number, number, number][] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    pts.push([a[0] + (b[0]-a[0])*t, y, a[1] + (b[1]-a[1])*t]);
  }
  return pts;
}

// ---------------------------------------------------------------------------
// 3D joint envelope = sweep of joint rings from 0 → h0
// ---------------------------------------------------------------------------

export function generateJointEnvelope(
  rodA: LightningRod, rodB: LightningRod,
  ringVerts: number = 80, heightSamples: number = 24,
): EnvelopeGeometry | null {
  const pair = equivalentJointPair(rodA, rodB);
  if (!pair) return null;
  const h0 = pair.h0;

  const vertices: [number, number, number][] = [];
  const indices: number[] = [];
  const ringStart: number[] = [];

  for (let s = 0; s <= heightSamples; s++) {
    const y = (s / heightSamples) * h0;
    const ring = generateJointRing(rodA, rodB, y, ringVerts);
    ringStart.push(vertices.length);
    if (ring && ring.length === ringVerts) {
      for (const v of ring) vertices.push(v);
    } else {
      // Degenerate — collapse to midpoint
      const mx = (pair.rodA.x + pair.rodB.x) / 2;
      const mz = (pair.rodA.y + pair.rodB.y) / 2;
      for (let i = 0; i < ringVerts; i++) vertices.push([mx, y, mz]);
    }
  }

  for (let s = 0; s < heightSamples; s++) {
    const base = ringStart[s], top = ringStart[s + 1];
    for (let i = 0; i < ringVerts; i++) {
      const j = (i + 1) % ringVerts;
      indices.push(base + i, top + i, top + j);
      indices.push(base + i, top + j, base + j);
    }
  }

  return vertices.length > 0 ? packGeometry(vertices, indices) : null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function triangleNormal(
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number],
): [number, number, number] {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (len < 1e-12) return [0, 1, 0];
  return [nx / len, ny / len, nz / len];
}

function packGeometry(
  vertices: [number, number, number][],
  indices: number[],
): EnvelopeGeometry {
  const positions = new Float32Array(vertices.length * 3);
  const normalsArr = new Float32Array(vertices.length * 3);
  const accumulated: [number, number, number][] = vertices.map(() => [0, 0, 0]);

  for (let i = 0; i < indices.length; i += 3) {
    const ai = indices[i], bi = indices[i + 1], ci = indices[i + 2];
    const fn = triangleNormal(vertices[ai], vertices[bi], vertices[ci]);
    for (const vi of [ai, bi, ci]) {
      accumulated[vi][0] += fn[0];
      accumulated[vi][1] += fn[1];
      accumulated[vi][2] += fn[2];
    }
  }

  for (let i = 0; i < vertices.length; i++) {
    const [nx, ny, nz] = accumulated[i];
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    const j = i * 3;
    positions[j] = vertices[i][0];
    positions[j + 1] = vertices[i][1];
    positions[j + 2] = vertices[i][2];
    normalsArr[j] = len > 0 ? nx / len : 0;
    normalsArr[j + 1] = len > 0 ? ny / len : 1;
    normalsArr[j + 2] = len > 0 ? nz / len : 0;
  }

  return { positions, indices, normals: normalsArr };
}

// ---------------------------------------------------------------------------
// Single-rod cone
// ---------------------------------------------------------------------------

export function generateRodEnvelope(
  rod: LightningRod,
  segments: number = 32,
  heightSamples: number = 20,
): EnvelopeGeometry {
  const vertices: [number, number, number][] = [];
  const indices: number[] = [];
  const ringStart: number[] = [];

  for (let s = 0; s <= heightSamples; s++) {
    const hz = (s / heightSamples) * rod.height;
    const r = protectionRadius(rod.height, hz);
    ringStart.push(vertices.length);
    for (let i = 0; i < segments; i++) {
      const angle = (2 * Math.PI * i) / segments;
      vertices.push([rod.x + r * Math.cos(angle), hz, rod.y + r * Math.sin(angle)]);
    }
  }

  for (let s = 0; s < heightSamples; s++) {
    const base = ringStart[s], top = ringStart[s + 1];
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      indices.push(base + i, top + i, top + next);
      indices.push(base + i, top + next, base + next);
    }
  }

  // Bottom cap
  const bc = vertices.length; vertices.push([rod.x, 0, rod.y]);
  const br = ringStart[0];
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(bc, br + next, br + i);
  }

  // Top cap
  const tr = ringStart[heightSamples];
  const topR = protectionRadius(rod.height, rod.height);
  if (topR > 1e-6) {
    const tc = vertices.length; vertices.push([rod.x, rod.height, rod.y]);
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      indices.push(tc, tr + i, tr + next);
    }
  }

  return packGeometry(vertices, indices);
}

// ---------------------------------------------------------------------------
// Lightning wire tent
// ---------------------------------------------------------------------------

export function generateWireEnvelope(
  wire: LightningWire,
  segments: number = 16,
  heightSamples: number = 20,
): EnvelopeGeometry {
  const vertices: [number, number, number][] = [];
  const indices: number[] = [];
  const wx = wire.x2 - wire.x1, wy = wire.y2 - wire.y1;
  const wLen = Math.sqrt(wx * wx + wy * wy);
  if (wLen < 1e-9) return packGeometry([], []);
  const ux = wx / wLen, uy = wy / wLen;
  const px = -uy, py = ux;
  const ringStart: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const cx = wire.x1 + t * wx, cz = wire.y1 + t * wy;
    ringStart.push(vertices.length);
    for (let s = 0; s <= heightSamples; s++) {
      const hz = (s / heightSamples) * wire.height;
      const b = protectionWidth(wire.height, hz);
      vertices.push([cx - px * b, hz, cz - py * b]);
      vertices.push([cx + px * b, hz, cz + py * b]);
    }
  }

  for (let i = 0; i < segments; i++) {
    const base = ringStart[i], next = ringStart[i + 1];
    for (let s = 0; s < heightSamples; s++) {
      const bl = base + s * 2, br = base + s * 2 + 1;
      const nl = next + s * 2, nr = next + s * 2 + 1;
      indices.push(bl, nl, br);
      indices.push(br, nl, nr);
    }
    const tl0 = base + heightSamples * 2, tr0 = tl0 + 1;
    const tl1 = next + heightSamples * 2, tr1 = tl1 + 1;
    indices.push(tl0, tr0, tr1);
    indices.push(tl0, tr1, tl1);
  }

  // Bottom cap
  const bcs = vertices.length;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    vertices.push([wire.x1 + t * wx, 0, wire.y1 + t * wy]);
  }
  for (let i = 0; i < segments; i++) {
    const bc0 = bcs + i, bc1 = bcs + i + 1;
    const bl0 = ringStart[i], br0 = ringStart[i] + 1;
    const bl1 = ringStart[i + 1], br1 = ringStart[i + 1] + 1;
    indices.push(bc0, bl0, bl1); indices.push(bc0, bl1, bc1);
    indices.push(bc0, bc1, br1); indices.push(bc0, br1, br0);
  }

  return packGeometry(vertices, indices);
}
