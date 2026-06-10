import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useStore } from '../store/useStore';
import { protectionRadius, correctionFactor, distanceBetweenRods, jointMinHeight, jointHalfWidth } from '../engine/rodCalc';
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
        const h = Math.max(rods[i].height, rods[j].height);
        const D = distanceBetweenRods(rods[i], rods[j]);
        const h0 = jointMinHeight(h, D);
        if (h0 <= 0 || hx >= h0) continue;
        const rx = protectionRadius(h, hx);
        if (rx <= 0) continue;
        const P = correctionFactor(h);
        const bx = jointHalfWidth(h0, hx, P);

        paired.add(i);
        paired.add(j);

        lines.push({
          key: `joint-${rods[i].id}-${rods[j].id}`,
          pts: buildJointSlice(rods[i].x, rods[i].y, rods[j].x, rods[j].y, rx, bx, D, hx),
        });
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
// Joint cross-section with PROPER geometric tangents
// ---------------------------------------------------------------------------

/** Two tangent points from external point P to circle (C, r), in XZ plane */
function tangentsFromPoint(
  px: number, pz: number,
  cx: number, cz: number,
  r: number, y: number,
): [THREE.Vector3, THREE.Vector3] | null {
  const dx = cx - px, dz = cz - pz;
  const d = Math.sqrt(dx * dx + dz * dz);
  if (d <= r) return null; // point inside or on circle
  const dSq = d * d, rSq = r * r;
  const disc = Math.sqrt(dSq - rSq);
  const nx = dx / d, nz = dz / d; // unit vector P→C
  const rx = -nz, rz = nx;         // rotate 90° CCW in XZ

  // Tangent point 1 (+ rotation)
  const t1x = cx + (-rSq * nx - r * disc * rx) / d;
  const t1z = cz + (-rSq * nz - r * disc * rz) / d;
  // Tangent point 2 (− rotation)
  const t2x = cx + (-rSq * nx + r * disc * rx) / d;
  const t2z = cz + (-rSq * nz + r * disc * rz) / d;

  return [
    new THREE.Vector3(t1x, y, t1z),
    new THREE.Vector3(t2x, y, t2z),
  ];
}

function buildJointSlice(
  ax: number, az: number,
  bxRod: number, bzRod: number,
  rx: number, bxVal: number,
  D: number, y: number,
): THREE.Vector3[] {
  const dx = bxRod - ax, dz = bzRod - az;
  const ux = dx / D, uz = dz / D;
  const nx = -uz, nz = ux;
  const baseAngle = Math.atan2(uz, ux);

  // Midpoint M and the two tangent-source points at ±bx from centreline
  const mx = (ax + bxRod) / 2, mz = (az + bzRod) / 2;
  const pLx = mx - bxVal * nx, pLz = mz - bxVal * nz; // P_L  (left, −bx)
  const pRx = mx + bxVal * nx, pRz = mz + bxVal * nz; // P_R  (right, +bx)

  // Tangents from P_L to both circles
  const tAL = tangentsFromPoint(pLx, pLz, ax, az, rx, y); // to circle A
  const tBL = tangentsFromPoint(pLx, pLz, bxRod, bzRod, rx, y); // to circle B

  // Tangents from P_R to both circles
  const tAR = tangentsFromPoint(pRx, pRz, ax, az, rx, y); // to circle A
  const tBR = tangentsFromPoint(pRx, pRz, bxRod, bzRod, rx, y); // to circle B

  if (!tAL || !tBL || !tAR || !tBR) {
    // Fallback: simple stadium
    const pts: THREE.Vector3[] = [];
    const arcV = Math.max(10, Math.round(SEG / 2));
    for (let i = 0; i <= arcV; i++) {
      const a = baseAngle + Math.PI + (Math.PI * i) / arcV;
      pts.push(new THREE.Vector3(ax + rx * Math.cos(a), y, az + rx * Math.sin(a)));
    }
    for (let i = 0; i <= arcV; i++) {
      const a = baseAngle + (Math.PI * i) / arcV;
      pts.push(new THREE.Vector3(bxRod + rx * Math.cos(a), y, bzRod + rx * Math.sin(a)));
    }
    return pts;
  }

  // Select the correct tangent point from each pair:
  // Need the one on the "outer" side (away from the other circle).
  // For P_L (−bx, left side): pick the tangent point farther from the other rod.
  // For P_R (+bx, right side): pick the tangent point farther from the other rod.
  const pickOuter = (pts: [THREE.Vector3, THREE.Vector3], rodPos: { x: number, y: number }, otherPos: { x: number, y: number }) => {
    const d0 = (pts[0].x - otherPos.x) ** 2 + (pts[0].z - otherPos.y) ** 2;
    const d1 = (pts[1].x - otherPos.x) ** 2 + (pts[1].z - otherPos.y) ** 2;
    return d0 > d1 ? pts[0] : pts[1]; // farther from the other rod = outer
  };

  const TA_L = pickOuter(tAL, { x: ax, y: az }, { x: bxRod, y: bzRod });
  const TB_L = pickOuter(tBL, { x: bxRod, y: bzRod }, { x: ax, y: az });
  const TA_R = pickOuter(tAR, { x: ax, y: az }, { x: bxRod, y: bzRod });
  const TB_R = pickOuter(tBR, { x: bxRod, y: bzRod }, { x: ax, y: az });

  // Build boundary: TA_R → (arc A) → TA_L → P_L → TB_L → (arc B) → TB_R → P_R → TA_R
  const arcVerts = Math.max(10, Math.round(SEG / 2));
  const pts: THREE.Vector3[] = [];

  // Arc A: TA_R → TA_L (counterclockwise through far side from B)
  const aAR = Math.atan2(TA_R.z - az, TA_R.x - ax);
  const aAL = Math.atan2(TA_L.z - az, TA_L.x - ax);
  // Ensure we go the long way (through the far side, away from B)
  let aFrom = aAR, aTo = aAL;
  // The far side from B (at A) is in direction baseAngle + π
  const farDirA = baseAngle + Math.PI;
  // Adjust angles so that the arc passes through farDirA
  while (aTo < aFrom) aTo += 2 * Math.PI;
  // Check if going from aFrom to aTo passes through farDirA
  let farA = farDirA;
  while (farA < aFrom) farA += 2 * Math.PI;
  if (farA > aTo) {
    // Doesn't pass through far side — go the other way
    aTo -= 2 * Math.PI;
    [aFrom, aTo] = [aTo, aFrom];
  }
  for (let k = 0; k <= arcVerts; k++) {
    const a = aFrom + (aTo - aFrom) * k / arcVerts;
    pts.push(new THREE.Vector3(ax + rx * Math.cos(a), y, az + rx * Math.sin(a)));
  }

  // Tangent: TA_L → P_L → TB_L
  pts.push(new THREE.Vector3(pLx, y, pLz));
  pts.push(new THREE.Vector3(TB_L.x, y, TB_L.z));

  // Arc B: TB_L → TB_R
  const aBL = Math.atan2(TB_L.z - bzRod, TB_L.x - bxRod);
  const aBR = Math.atan2(TB_R.z - bzRod, TB_R.x - bxRod);
  let bFrom = aBL, bTo = aBR;
  const farDirB = baseAngle;
  while (bTo < bFrom) bTo += 2 * Math.PI;
  let farB = farDirB;
  while (farB < bFrom) farB += 2 * Math.PI;
  if (farB > bTo) { bTo -= 2 * Math.PI; [bFrom, bTo] = [bTo, bFrom]; }
  for (let k = 0; k <= arcVerts; k++) {
    const a = bFrom + (bTo - bFrom) * k / arcVerts;
    pts.push(new THREE.Vector3(bxRod + rx * Math.cos(a), y, bzRod + rx * Math.sin(a)));
  }

  // Tangent: TB_R → P_R → TA_R (close)
  pts.push(new THREE.Vector3(pRx, y, pRz));
  pts.push(new THREE.Vector3(TA_R.x, y, TA_R.z));

  return pts;
}
