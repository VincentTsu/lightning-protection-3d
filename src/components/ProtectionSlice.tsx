import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useStore } from '../store/useStore';
import { protectionRadius, distanceBetweenRods, jointMinHeight } from '../engine/rodCalc';
import { protectionWidth } from '../engine/wireCalc';

const SEG = 64;

/**
 * Black cross-section lines — the visual protection boundary at `sliceHeight`.
 *
 * Single rod   → circle of radius rx.
 * Overlapping pair → convex hull (stadium): two outer arcs at rx +
 *                    common external tangents parallel to AB.
 *
 * The envelope = sweep of these cross-sections upward, which is exactly
 * what the individual rod cones represent in 3D.
 */
export function ProtectionSlice() {
  const rods = useStore(s => s.rods);
  const wires = useStore(s => s.wires);
  const hx = useStore(s => s.sliceHeight);

  const rodLines = useMemo(() => {
    const n = rods.length;
    const used = new Set<number>();
    const lines: { key: string; pts: THREE.Vector3[] }[] = [];

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const h = Math.max(rods[i].height, rods[j].height);
        const D = distanceBetweenRods(rods[i], rods[j]);
        const h0 = jointMinHeight(h, D);
        if (h0 <= 0 || hx >= h0) continue;
        const rx = protectionRadius(h, hx);
        if (rx <= 0) continue;

        used.add(i); used.add(j);
        lines.push({ key: `joint-${rods[i].id}-${rods[j].id}`,
          pts: buildStadium(rods[i].x, rods[i].y, rods[j].x, rods[j].y, rx, D, hx) });
      }
    }

    for (let i = 0; i < n; i++) {
      if (used.has(i)) continue;
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
// Stadium = convex hull of two equal circles (radius r, centres D apart)
// ---------------------------------------------------------------------------

function buildStadium(
  ax: number, az: number, bx: number, bz: number,
  r: number, D: number, y: number,
): THREE.Vector3[] {
  const dx = bx - ax, dz = bz - az;
  const ux = dx / D, uz = dz / D;
  const nx = -uz, nz = ux;
  const baseAngle = Math.atan2(uz, ux);
  const arcSegs = Math.round(SEG / 2);
  const pts: THREE.Vector3[] = [];

  // 1) Outer arc of A (away from B): π/2 → 3π/2 through π
  for (let i = 0; i <= arcSegs; i++) {
    const a = baseAngle + Math.PI / 2 + (Math.PI * i) / arcSegs;
    pts.push(new THREE.Vector3(ax + r * Math.cos(a), y, az + r * Math.sin(a)));
  }
  // 2) Left tangent A−n → B−n (parallel to AB, at distance r)
  // (already at A−n, just move to B−n)
  pts.push(new THREE.Vector3(bx - r * nx, y, bz - r * nz));
  // 3) Outer arc of B (away from A): −π/2 → π/2 through 0
  for (let i = 0; i <= arcSegs; i++) {
    const a = baseAngle - Math.PI / 2 + (Math.PI * i) / arcSegs;
    pts.push(new THREE.Vector3(bx + r * Math.cos(a), y, bz + r * Math.sin(a)));
  }
  // 4) Right tangent B+n → A+n (close)
  pts.push(new THREE.Vector3(ax + r * nx, y, az + r * nz));

  return pts;
}
