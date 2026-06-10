import { useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { generateRodEnvelope, generateJointEnvelope, generateWireEnvelope } from '../engine/envelope';
import { jointMinHeight, distanceBetweenRods } from '../engine/rodCalc';

function toGeo(env: { positions: Float32Array; indices: number[] }): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(env.positions, 3));
  geo.setIndex(env.indices);
  geo.computeVertexNormals();
  return geo;
}

export function ProtectionEnvelope() {
  const rods = useStore(s => s.rods);
  const wires = useStore(s => s.wires);

  // Joint stadium envelopes for each overlapping pair (0 → h0)
  const jointGeos = useMemo(() => {
    const geos: { key: string; geo: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < rods.length; i++) {
      for (let j = i + 1; j < rods.length; j++) {
        const h = Math.max(rods[i].height, rods[j].height);
        const D = distanceBetweenRods(rods[i], rods[j]);
        const h0 = jointMinHeight(h, D);
        if (h0 > 0) {
          const env = generateJointEnvelope(rods[i], rods[j]);
          if (env) {
            geos.push({ key: `joint-${rods[i].id}-${rods[j].id}`, geo: toGeo(env) });
          }
        }
      }
    }
    return geos;
  }, [rods]);

  // Individual cones for ALL rods (cover from ground to tip, including above-h0 regions)
  const rodGeos = useMemo(() => {
    return rods.map(rod => ({ key: rod.id, geo: toGeo(generateRodEnvelope(rod)) }));
  }, [rods]);

  // Wire tents
  const wireGeos = useMemo(() => {
    return wires.map(wire => ({ key: wire.id, geo: toGeo(generateWireEnvelope(wire)) }));
  }, [wires]);

  return (
    <group>
      {/* Joint stadium envelopes — complete convex-hull surface for each pair */}
      {jointGeos.map(({ key, geo }) => (
        <mesh key={key} geometry={geo}>
          <meshBasicMaterial color="#e74c3c" transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      {/* Individual rod cones — only for unpaired rods */}
      {rodGeos.map(({ key, geo }) => (
        <mesh key={key} geometry={geo}>
          <meshBasicMaterial color="#e74c3c" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      {/* Wire tents */}
      {wireGeos.map(({ key, geo }) => (
        <mesh key={key} geometry={geo}>
          <meshBasicMaterial color="#1a7a6d" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
