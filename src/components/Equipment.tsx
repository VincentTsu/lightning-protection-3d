import { useMemo } from 'react';
import * as THREE from 'three';
import { Equipment as EqType } from '../types';

interface Props {
  equipment: EqType;
  isProtected: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export function Equipment({ equipment: eq, isProtected, selected, onClick }: Props) {
  const color = isProtected ? '#7c3aed' : '#ef4444';
  const outlineColor = isProtected ? '#22c55e' : '#ef4444';

  const edgeGeo = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(eq.width, eq.height, eq.depth)),
    [eq.width, eq.height, eq.depth]
  );

  return (
    <group position={[eq.x, eq.height / 2, eq.y]} onClick={onClick}>
      <mesh castShadow>
        <boxGeometry args={[eq.width, eq.height, eq.depth]} />
        <meshStandardMaterial color={color} metalness={0.1} roughness={0.6} />
      </mesh>
      {/* 保护状态描边 */}
      <lineSegments geometry={edgeGeo}>
        <lineBasicMaterial color={outlineColor} />
      </lineSegments>
      {/* 选中高亮框 */}
      {selected && (
        <mesh>
          <boxGeometry args={[eq.width + 0.3, eq.height + 0.3, eq.depth + 0.3]} />
          <meshBasicMaterial color={outlineColor} wireframe />
        </mesh>
      )}
    </group>
  );
}
