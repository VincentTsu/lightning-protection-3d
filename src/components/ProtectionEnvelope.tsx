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

  const { rodGeos, jointGeos } = useMemo(() => {
    const paired = new Set<string>();
    const jGeos: { key: string; geo: THREE.BufferGeometry }[] = [];

    for (let i = 0; i < rods.length; i++) {
      for (let j = i + 1; j < rods.length; j++) {
        const pair = equivalentJointPair(rods[i], rods[j]);
        if (!pair) continue;
        const env = generateJointEnvelope(rods[i], rods[j]);
        if (env) {
          paired.add(rods[i].id);
          paired.add(rods[j].id);
          jGeos.push({ key: `joint-${rods[i].id}-${rods[j].id}`, geo: toGeo(env) });
        }
      }
    }

    const rGeos = rods
      .filter(r => !paired.has(r.id))
      .map(r => ({ key: r.id, geo: toGeo(generateRodEnvelope(r)) }));

    return { rodGeos: rGeos, jointGeos: jGeos };
  }, [rods]);

  const wireGeos = useMemo(() => {
    return wires.map(w => ({ key: w.id, geo: toGeo(generateWireEnvelope(w)) }));
  }, [wires]);

  return (
    <group>
      {/* Joint envelopes replace individual cones for paired rods */}
      {jointGeos.map(({ key, geo }) => (
        <mesh key={key} geometry={geo}>
          <meshBasicMaterial color="#e74c3c" transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      {/* Individual cones for unpaired rods */}
      {rodGeos.map(({ key, geo }) => (
        <mesh key={key} geometry={geo}>
          <meshBasicMaterial color="#e74c3c" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
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
