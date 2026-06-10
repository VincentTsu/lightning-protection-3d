import { useEffect } from 'react';
import { Sidebar } from './panel/Sidebar';
import { Scene3D } from './components/Scene3D';
import { useStore } from './store/useStore';

export default function App() {
  const recalculate = useStore(s => s.recalculate);

  useEffect(() => {
    recalculate();
  }, [recalculate]);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <Scene3D />
    </div>
  );
}
