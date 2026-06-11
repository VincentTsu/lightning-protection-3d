import { useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { generateRodEnvelope, generateJointEnvelope, generateWireEnvelope } from '../engine/envelope';
import { distanceBetweenRods, jointMinHeight } from '../engine/rodCalc';

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
  const rodGeos = useMemo(() => {
    return rods.map(r => ({ key: r.id, geo: toGeo(generateRodEnvelope(r)) }));
  }, [rods]);

  // Joint envelopes = sweep of tangent-based cross-sections (same as black slice)
  const jointGeos = useMemo(() => {
    const geos: { key: string; geo: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < rods.length; i++) {
      for (let j = i + 1; j < rods.length; j++) {
        const h = Math.max(rods[i].height, rods[j].height);
        const D = distanceBetweenRods(rods[i], rods[j]);
        if (jointMinHeight(h, D) > 0) {
          const env = generateJointEnvelope(rods[i], rods[j]);
          if (env) geos.push({ key: `joint-${rods[i].id}-${rods[j].id}`, geo: toGeo(env) });
        }
      }
    }
    return geos;
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
