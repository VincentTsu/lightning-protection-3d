import { useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Ground } from './Ground';
import { CameraController } from './CameraController';
import { LightningRod3D } from './LightningRod';
import { LightningWire3D } from './LightningWire';
import { Equipment } from './Equipment';
import { ProtectionEnvelope } from './ProtectionEnvelope';
import { ProtectionSlice } from './ProtectionSlice';
import { DimensionLines } from './DimensionLines';
import { Draggable } from './Draggable';
import { useStore } from '../store/useStore';

export function Scene3D() {
  const rods = useStore(s => s.rods);
  const wires = useStore(s => s.wires);
  const equipment = useStore(s => s.equipment);
  const protectionStatuses = useStore(s => s.protectionStatuses);
  const moveRod = useStore(s => s.moveRod);
  const moveEquipment = useStore(s => s.moveEquipment);
  const recalculate = useStore(s => s.recalculate);

  const onRodDragEnd = useCallback(
    (rodId: string) => (x: number, z: number) => {
      moveRod(rodId, x, z);
      recalculate();
    },
    [moveRod, recalculate],
  );

  const onEquipDragEnd = useCallback(
    (eqId: string) => (x: number, z: number) => {
      moveEquipment(eqId, x, z);
      recalculate();
    },
    [moveEquipment, recalculate],
  );

  return (
    <div className="flex-1 h-full">
      <Canvas
        camera={{ fov: 50, near: 0.1, far: 1000 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        style={{ background: '#e8ecf1' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[50, 80, 50]} intensity={0.8} castShadow />
        <directionalLight position={[-20, 30, -20]} intensity={0.3} />

        <Ground />
        <CameraController />

        {rods.map(rod => (
          <Draggable
            key={rod.id}
            anchorX={rod.x}
            anchorZ={rod.y}
            onDragEnd={onRodDragEnd(rod.id)}
          >
            <LightningRod3D rod={rod} />
          </Draggable>
        ))}
        {wires.map(wire => (
          <LightningWire3D key={wire.id} wire={wire} />
        ))}
        {equipment.map(eq => {
          const status = protectionStatuses.find(s => s.equipmentId === eq.id);
          return (
            <Draggable
              key={eq.id}
              anchorX={eq.x}
              anchorZ={eq.y}
              onDragEnd={onEquipDragEnd(eq.id)}
            >
              <Equipment
                equipment={eq}
                isProtected={status?.protected ?? false}
              />
            </Draggable>
          );
        })}

        <ProtectionEnvelope />
        <ProtectionSlice />
        <DimensionLines />
      </Canvas>
    </div>
  );
}
