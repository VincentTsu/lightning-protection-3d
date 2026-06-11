import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useStore } from '../store/useStore';
import { protectionRadius, equivalentJointPair } from '../engine/rodCalc';
import { generateJointRing } from '../engine/envelope';
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
        const ring = generateJointRing(rods[i], rods[j], hx, SEG);
        if (!ring) continue;
        paired.add(i); paired.add(j);
        lines.push({
          key: `joint-${rods[i].id}-${rods[j].id}`,
          pts: ring.map(v => new THREE.Vector3(v[0], v[1], v[2])),
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
