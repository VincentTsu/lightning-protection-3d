import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useStore } from '../store/useStore';
import {
  protectionRadius, equivalentJointPair, jointHalfWidth,
  JointProtectionPair,
} from '../engine/rodCalc';
import { protectionWidth } from '../engine/wireCalc';

const SEG = 64;

export function ProtectionSlice() {
  const rods = useStore(s => s.rods);
  const wires = useStore(s => s.wires);
  const hx = useStore(s => s.sliceHeight);

  const rodLines = useMemo(() => {
    const n = rods.length;
    const paired = new Set<number>();
    const lines: { key: string; pts: THREE.Vector3[] }[] = [];

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const pair = equivalentJointPair(rods[i], rods[j]);
        if (!pair || hx >= pair.h0) continue;
        const ring = buildJointRing(pair, hx);
        if (!ring) continue;

        paired.add(i); paired.add(j);
        lines.push({ key: `joint-${rods[i].id}-${rods[j].id}`, pts: ring });
      }
    }

    for (let i = 0; i < n; i++) {
      if (paired.has(i)) continue;
      const r = protectionRadius(rods[i].height, hx);
      if (r <= 0) continue;
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= SEG; k++) {
        const a = (2 * Math.PI * k) / SEG;
        pts.push(new THREE.Vector3(rods[i].x + r * Math.cos(a), hx, rods[i].y + r * Math.sin(a)));
      }
      lines.push({ key: `circle-${rods[i].id}`, pts });
    }
    return lines;
  }, [rods, hx]);

  const wireLines = useMemo(() => {
    return wires.map(wire => {
      const b = protectionWidth(wire.height, hx);
      if (b <= 0) return null;
      const dx = wire.x2 - wire.x1, dz = wire.y2 - wire.y1;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len < 1e-9) return null;
      const nx = -dz / len, nz = dx / len;
      return {
        key: wire.id,
        left: [new THREE.Vector3(wire.x1 + nx * b, hx, wire.y1 + nz * b),
               new THREE.Vector3(wire.x2 + nx * b, hx, wire.y2 + nz * b)],
        right: [new THREE.Vector3(wire.x1 - nx * b, hx, wire.y1 - nz * b),
                new THREE.Vector3(wire.x2 - nx * b, hx, wire.y2 - nz * b)],
      };
    }).filter(Boolean) as any[];
  }, [wires, hx]);

  return (
    <group>
      {rodLines.map(({ key, pts }) => (
        <Line key={key} points={pts} color="#111111" lineWidth={1.5} />
      ))}
      {wireLines.map(({ key, left, right }) => (
        <group key={`w-${key}`}>
          <Line points={left} color="#111111" lineWidth={1.5} />
          <Line points={right} color="#111111" lineWidth={1.5} />
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Joint ring: tangents from ±bx reference points
// ---------------------------------------------------------------------------

function buildJointRing(
  pair: JointProtectionPair, y: number,
): THREE.Vector3[] | null {
  const { rodA: eqA, rodB: eqB, D, h, p } = pair;
  const rx = protectionRadius(h, y);
  if (rx <= 0) return null;
  const bx = jointHalfWidth(h, D, y, p);

  // Direction (equivalent rods)
  const dx = eqB.x - eqA.x, dz = eqB.y - eqA.y;
  const geoD = Math.sqrt(dx * dx + dz * dz);
  if (geoD < 1e-9) return null;
  const ux = dx / geoD, uz = dz / geoD;
  const nx = -uz, nz = ux;
  const baseAngle = Math.atan2(uz, ux);

  // Narrowest point = midpoint of equivalent rods (shifted toward shorter rod)
  const mx = (eqA.x + eqB.x) / 2, mz = (eqA.y + eqB.y) / 2;

  // Compute reference points at ±bx from narrowest point
  let pLx = mx - bx * nx, pLz = mz - bx * nz;
  let pRx = mx + bx * nx, pRz = mz + bx * nz;

  // Try tangents from bx-based points
  let tAL = tangentPoints(pLx, pLz, eqA.x, eqA.y, rx);
  let tBL = tangentPoints(pLx, pLz, eqB.x, eqB.y, rx);
  let tAR = tangentPoints(pRx, pRz, eqA.x, eqA.y, rx);
  let tBR = tangentPoints(pRx, pRz, eqB.x, eqB.y, rx);

  // Fallback: if reference points inside circles, use rx distance instead
  if (!tAL || !tBL || !tAR || !tBR) {
    pLx = mx - rx * nx; pLz = mz - rx * nz;
    pRx = mx + rx * nx; pRz = mz + rx * nz;
    tAL = tangentPoints(pLx, pLz, eqA.x, eqA.y, rx);
    tBL = tangentPoints(pLx, pLz, eqB.x, eqB.y, rx);
    tAR = tangentPoints(pRx, pRz, eqA.x, eqA.y, rx);
    tBR = tangentPoints(pRx, pRz, eqB.x, eqB.y, rx);
  }
  if (!tAL || !tBL || !tAR || !tBR) return null;

  // Pick the outer tangent point for each (farther from the OTHER rod)
  const pickOuter = (pair: [THREE.Vector3, THREE.Vector3], otherX: number, otherZ: number) => {
    const d0 = pair[0].distanceToSquared(new THREE.Vector3(otherX, 0, otherZ));
    const d1 = pair[1].distanceToSquared(new THREE.Vector3(otherX, 0, otherZ));
    return d0 > d1 ? pair[0] : pair[1];
  };

  const TA_L = pickOuter(tAL, eqB.x, eqB.y);
  const TB_L = pickOuter(tBL, eqA.x, eqA.y);
  const TA_R = pickOuter(tAR, eqB.x, eqB.y);
  const TB_R = pickOuter(tBR, eqA.x, eqA.y);

  // Build closed ring: arc A + tangents(L) + arc B + tangents(R)
  const arcVerts = Math.floor(SEG * 0.35);
  const tanVerts = Math.max(1, Math.floor((SEG - 2 * arcVerts - 4) / 4));
  const pts: THREE.Vector3[] = [];

  // Arc A: TA_R → TA_L through far side from B (= baseAngle + π)
  pts.push(...buildArc(eqA.x, eqA.y, rx, TA_R, TA_L, baseAngle + Math.PI, y, arcVerts));

  // Tangent left: TA_L → P_L → TB_L
  pts.push(...buildSegment(TA_L, new THREE.Vector3(pLx, y, pLz), y, tanVerts));
  pts.push(...buildSegment(new THREE.Vector3(pLx, y, pLz), TB_L, y, tanVerts));

  // Arc B: TB_L → TB_R through far side from A (= baseAngle)
  pts.push(...buildArc(eqB.x, eqB.y, rx, TB_L, TB_R, baseAngle, y, arcVerts));

  // Tangent right: TB_R → P_R → TA_R
  pts.push(...buildSegment(TB_R, new THREE.Vector3(pRx, y, pRz), y, tanVerts));
  pts.push(...buildSegment(new THREE.Vector3(pRx, y, pRz), TA_R, y, tanVerts));

  return pts;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/** Two tangent points from external point (px,pz) to circle (cx,cz,r) */
function tangentPoints(
  px: number, pz: number, cx: number, cz: number, r: number,
): [THREE.Vector3, THREE.Vector3] | null {
  const dx = cx - px, dz = cz - pz;
  const dSq = dx * dx + dz * dz;
  if (dSq <= r * r) return null;
  const d = Math.sqrt(dSq);
  const nx = dx / d, nz = dz / d;
  const disc = Math.sqrt(dSq - r * r);
  const a = (r * r) / d;
  const b = (r * disc) / d;
  const rx = -nz, rz = nx;
  return [
    new THREE.Vector3(cx - a * nx + b * rx, 0, cz - a * nz + b * rz),
    new THREE.Vector3(cx - a * nx - b * rx, 0, cz - a * nz - b * rz),
  ];
}

/** Sample an arc from point `from` to `to` on circle (cx,cz,r), through `farDir` */
function buildArc(
  cx: number, cz: number, r: number,
  from: THREE.Vector3, to: THREE.Vector3,
  farDir: number, y: number, n: number,
): THREE.Vector3[] {
  let a1 = Math.atan2(from.z - cz, from.x - cx);
  let a2 = Math.atan2(to.z - cz, to.x - cx);
  // Normalize to [0, 2π)
  const norm = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const lo = Math.min(norm(a1), norm(a2));
  const hi = Math.max(norm(a1), norm(a2));
  const far = norm(farDir);
  // Pick the arc that contains farDir
  let fromA: number, toA: number;
  if (lo <= far && far <= hi) {
    fromA = lo; toA = hi;
  } else {
    fromA = hi; toA = lo + 2 * Math.PI;
  }
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const a = fromA + (toA - fromA) * i / n;
    pts.push(new THREE.Vector3(cx + r * Math.cos(a), y, cz + r * Math.sin(a)));
  }
  return pts;
}

/** Sample a straight segment */
function buildSegment(
  from: THREE.Vector3, to: THREE.Vector3, y: number, n: number,
): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    pts.push(new THREE.Vector3(
      from.x + (to.x - from.x) * t,
      y,
      from.z + (to.z - from.z) * t,
    ));
  }
  return pts;
}
