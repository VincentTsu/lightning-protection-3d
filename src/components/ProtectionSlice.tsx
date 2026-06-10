import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useStore } from '../store/useStore';
import { protectionRadius, correctionFactor, distanceBetweenRods, jointMinHeight, jointHalfWidth } from '../engine/rodCalc';
import { protectionWidth } from '../engine/wireCalc';

const SEG = 64;

/**
 * Black cross-section lines at `sliceHeight`, following GB50064 折线法:
 *   - Single rod → circle of radius rx = protectionRadius(h, hx)
 *   - Overlapping pair → joint boundary built with bx = jointHalfWidth(h0, hx, P):
 *       outer arcs of each circle + straight sections at ±bx from centreline
 *   - Wire → two parallel lines at ±protectionWidth
 */
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
        const p = correctionFactor(h);
        const bx = jointHalfWidth(h0, hx, p);
        if (rx <= 0) continue;

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
// Joint slice: outer arcs + straight sections at ±bx from centreline
// ---------------------------------------------------------------------------

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

  const bxC = Math.min(bxVal, rx);
  const chordHalf = Math.sqrt(Math.max(0, rx * rx - bxC * bxC));
  const beta = Math.asin(Math.min(1, bxC / Math.max(rx, 1e-9)));
  const arcVerts = Math.max(10, Math.round(SEG / 2));
  const pts: THREE.Vector3[] = [];

  // 1) Arc of A (from +bx intersection through far side to −bx intersection)
  for (let i = 0; i <= arcVerts; i++) {
    const a = baseAngle + Math.PI - beta + (2 * beta * i) / arcVerts;
    pts.push(new THREE.Vector3(ax + rx * Math.cos(a), y, az + rx * Math.sin(a)));
  }
  // 2) Straight −bx: A → B
  pts.push(new THREE.Vector3(bxRod + chordHalf * ux - bxC * nx, y, bzRod + chordHalf * uz - bxC * nz));
  // 3) Arc of B (from −bx intersection through far side to +bx intersection)
  for (let i = 0; i <= arcVerts; i++) {
    const a = baseAngle - beta + (2 * beta * i) / arcVerts;
    pts.push(new THREE.Vector3(bxRod + rx * Math.cos(a), y, bzRod + rx * Math.sin(a)));
  }
  // 4) Straight +bx: B → A (close)
  pts.push(new THREE.Vector3(ax - chordHalf * ux + bxC * nx, y, az - chordHalf * uz + bxC * nz));

  return pts;
}
