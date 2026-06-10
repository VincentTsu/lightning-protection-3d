import { useMemo } from 'react';
import * as THREE from 'three';
import { LightningWire as WireType } from '../types';

interface Props {
  wire: WireType;
}

export function LightningWire3D({ wire }: Props) {
  const curve = useMemo(() => {
    const start = new THREE.Vector3(wire.x1, wire.height, wire.y1);
    const end = new THREE.Vector3(wire.x2, wire.height, wire.y2);
    const mid = new THREE.Vector3(
      (wire.x1 + wire.x2) / 2,
      wire.height - 0.5,
      (wire.y1 + wire.y2) / 2
    );
    return new THREE.QuadraticBezierCurve3(start, mid, end);
  }, [wire.x1, wire.y1, wire.x2, wire.y2, wire.height]);

  return (
    <group>
      {/* 悬挂线 (catenary curve) */}
      <mesh>
        <tubeGeometry args={[curve, 50, 0.15, 8, false]} />
        <meshStandardMaterial color="#1a7a6d" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* 支柱1 */}
      <mesh position={[wire.x1, wire.height / 2, wire.y1]}>
        <cylinderGeometry args={[0.2, 0.2, wire.height, 8]} />
        <meshStandardMaterial color="#888888" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* 支柱2 */}
      <mesh position={[wire.x2, wire.height / 2, wire.y2]}>
        <cylinderGeometry args={[0.2, 0.2, wire.height, 8]} />
        <meshStandardMaterial color="#888888" metalness={0.5} roughness={0.5} />
      </mesh>
    </group>
  );
}
