import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

/** Module-level ref so Draggable can synchronously disable OrbitControls. */
export const orbitControlsRef = { current: null as OrbitControlsImpl | null };
