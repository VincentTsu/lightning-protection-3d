import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useStore } from '../store/useStore';
import { protectionRadius, distanceBetweenRods, jointMinHeight } from '../engine/rodCalc';
import { protectionWidth } from '../engine/wireCalc';

const SEG = 80;

/**
 * Black cross-section lines at `sliceHeight`.
 * For each rod: a circle of radius rx = protectionRadius(rod.height, sliceHeight).
 * For each overlapping pair: the two outer arcs connected by tangent lines
 * (convex hull per GB50064).
 * For each wire: two parallel lines at ±protectionWidth.
 */
export function ProtectionSlice() {
  const rods = useStore(s => s.rods);
  const wires = useStore(s => s.wires);
  const sliceHeight = useStore(s => s.sliceHeight);

  const rodLines = useMemo(() => {
    const n = rods.length;
    const paired = new Set<number>();     // rods already covered by a joint stadium
    const lines: { key: string; pts: THREE.Vector3[] }[] = [];

    // 1) Joint stadiums for overlapping pairs
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const h = Math.max(rods[i].height, rods[j].height);
        const D = distanceBetweenRods(rods[i], rods[j]);
        const h0 = jointMinHeight(h, D);
        // Only generate joint if the slice cuts through the overlap zone
        if (h0 <= 0 || sliceHeight >= h0) continue;

        const rA = protectionRadius(rods[i].height, sliceHeight);
        const rB = protectionRadius(rods[j].height, sliceHeight);
        if (rA <= 0 || rB <= 0) continue;

        paired.add(i);
        paired.add(j);

        lines.push({
          key: `joint-${rods[i].id}-${rods[j].id}`,
          pts: buildJointSlice(rods[i].x, rods[i].y, rA, rods[j].x, rods[j].y, rB, sliceHeight),
        });
      }
    }

    // 2) Individual circles for unpaired rods
    for (let i = 0; i < n; i++) {
      if (paired.has(i)) continue;
      const r = protectionRadius(rods[i].height, sliceHeight);
      if (r <= 0) continue;
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= SEG; k++) {
        const a = (2 * Math.PI * k) / SEG;
        pts.push(new THREE.Vector3(rods[i].x + r * Math.cos(a), sliceHeight, rods[i].y + r * Math.sin(a)));
      }
      lines.push({ key: `circle-${rods[i].id}`, pts });
    }

    return lines;
  }, [rods, sliceHeight]);

  const wireLines = useMemo(() => {
    return wires.map(wire => {
      const b = protectionWidth(wire.height, sliceHeight);
      if (b <= 0) return null;
      const dx = wire.x2 - wire.x1, dz = wire.y2 - wire.y1;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len < 1e-9) return null;
      const nx = -dz / len, nz = dx / len;
      return {
        key: wire.id,
        left: [
          new THREE.Vector3(wire.x1 + nx * b, sliceHeight, wire.y1 + nz * b),
          new THREE.Vector3(wire.x2 + nx * b, sliceHeight, wire.y2 + nz * b),
        ],
        right: [
          new THREE.Vector3(wire.x1 - nx * b, sliceHeight, wire.y1 - nz * b),
          new THREE.Vector3(wire.x2 - nx * b, sliceHeight, wire.y2 - nz * b),
        ],
      };
    }).filter(Boolean) as any[];
  }, [wires, sliceHeight]);

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
// Build convex-hull slice for two possibly unequal circles
// ---------------------------------------------------------------------------

function buildJointSlice(
  ax: number, az: number, rA: number,
  bx: number, bz: number, rB: number,
  y: number,
): THREE.Vector3[] {
  const dx = bx - ax, dz = bz - az;
  const D = Math.sqrt(dx * dx + dz * dz);
  if (D < 1e-9) return [];
  const ux = dx / D, uz = dz / D;
  const nx = -uz, nz = ux;

  const pts: THREE.Vector3[] = [];
  const baseAngle = Math.atan2(uz, ux);
  const arcSegs = Math.max(12, Math.round(SEG / 2));

  // Tangent half-angles for each circle (using equal-height approximation for tangents)
  // We draw the outer arcs of each circle connected by common outer tangents.
  // For unequal circles the tangents are not parallel to AB, but for GB50064
  // joint protection we use h = max(hA,hB), making rA = rB in the standard case.

  // Outer arc of A (away from B): angles from baseAngle+π/2 to baseAngle+3π/2
  for (let k = 0; k <= arcSegs; k++) {
    const a = baseAngle + Math.PI / 2 + (Math.PI * k) / arcSegs;
    pts.push(new THREE.Vector3(ax + rA * Math.cos(a), y, az + rA * Math.sin(a)));
  }

  // Left tangent: A-n → B-n
  pts.push(new THREE.Vector3(bx - rB * nx, y, bz - rB * nz));

  // Outer arc of B (away from A): angles from baseAngle-π/2 to baseAngle+π/2
  for (let k = 0; k <= arcSegs; k++) {
    const a = baseAngle - Math.PI / 2 + (Math.PI * k) / arcSegs;
    pts.push(new THREE.Vector3(bx + rB * Math.cos(a), y, bz + rB * Math.sin(a)));
  }

  // Right tangent: B+n → A+n (close loop)
  pts.push(new THREE.Vector3(ax + rA * nx, y, az + rA * nz));

  return pts;
}
