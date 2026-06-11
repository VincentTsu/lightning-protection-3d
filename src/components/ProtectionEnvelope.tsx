import { useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { generateRodEnvelope, generateJointEnvelope, generateWireEnvelope } from '../engine/envelope';
import { equivalentJointPair } from '../engine/rodCalc';

function toGeo(e: { positions: Float32Array; indices: number[] }): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(e.positions, 3));
  geo.setIndex(e.indices);
  geo.computeVertexNormals();
  return geo;
}

export function ProtectionEnvelope() {
  const rods = useStore(s => s.rods);
  const wires = useStore(s => s.wires);

  // Individual rod cones (always — for upper portions and outer sides)
  const { rodGeos, jointGeos } = useMemo(() => {
    const geos: { key: string; geo: THREE.BufferGeometry }[] = [];
    const rodJointTop = new Map<string, number>();

    for (let i = 0; i < rods.length; i++) {
      for (let j = i + 1; j < rods.length; j++) {
        const pair = equivalentJointPair(rods[i], rods[j]);
        if (!pair) continue;

        const env = generateJointEnvelope(rods[i], rods[j]);
        if (env) {
          geos.push({ key: `joint-${rods[i].id}-${rods[j].id}`, geo: toGeo(env) });
          rodJointTop.set(pair.sourceAId, Math.max(rodJointTop.get(pair.sourceAId) ?? 0, pair.h0));
          rodJointTop.set(pair.sourceBId, Math.max(rodJointTop.get(pair.sourceBId) ?? 0, pair.h0));
        }
      }
    }

    const singleRodGeos = rods
      .map((rod) => {
        const startHeight = rodJointTop.get(rod.id) ?? 0;
        if (startHeight >= rod.height - 1e-6) return null;
        return { key: rod.id, geo: toGeo(generateRodEnvelope(rod, 32, 20, startHeight)) };
      })
      .filter(Boolean) as { key: string; geo: THREE.BufferGeometry }[];

    return { rodGeos: singleRodGeos, jointGeos: geos };
  }, [rods]);

  // Wire tents
  const wireGeos = useMemo(() => {
    return wires.map(w => ({ key: w.id, geo: toGeo(generateWireEnvelope(w)) }));
  }, [wires]);

  return (
    <group>
      {rodGeos.map(({ key, geo }) => (
        <mesh key={key} geometry={geo}>
          <meshBasicMaterial color="#e74c3c" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      {jointGeos.map(({ key, geo }) => (
        <mesh key={key} geometry={geo}>
          <meshBasicMaterial color="#e74c3c" transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      {wireGeos.map(({ key, geo }) => (
        <mesh key={key} geometry={geo}>
          <meshBasicMaterial color="#1a7a6d" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
