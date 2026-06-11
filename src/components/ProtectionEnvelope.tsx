import { useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { generateRodEnvelope, generateWireEnvelope } from '../engine/envelope';

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

  const rodGeos = useMemo(() => {
    return rods.map(r => ({ key: r.id, geo: toGeo(generateRodEnvelope(r)) }));
  }, [rods]);

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
      {wireGeos.map(({ key, geo }) => (
        <mesh key={key} geometry={geo}>
          <meshBasicMaterial color="#1a7a6d" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
