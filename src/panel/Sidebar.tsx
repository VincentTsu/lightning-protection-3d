import { useStore } from '../store/useStore';
import { RodList } from './RodList';
import { WireList } from './WireList';
import { EquipmentList } from './EquipmentList';
import { DimensionDisplay } from './DimensionDisplay';
import { ExportButton } from './ExportButton';

export function Sidebar() {
  const sliceHeight = useStore(s => s.sliceHeight);
  const setSliceHeight = useStore(s => s.setSliceHeight);

  return (
    <div className="w-80 h-full bg-white border-r border-gray-200 overflow-y-auto p-4 flex flex-col">
      <h2 className="text-lg font-bold text-gray-800 mb-1">防雷计算 · GB50064</h2>
      <p className="text-xs text-gray-400 mb-4">折线法（保护角法）· 3D 可视化</p>

      {/* Slice height control */}
      <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">📐 保护截面高度</h3>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={60}
            step={0.5}
            value={sliceHeight}
            onChange={e => setSliceHeight(+e.target.value)}
            className="flex-1"
          />
          <input
            type="number"
            value={sliceHeight}
            onChange={e => setSliceHeight(+e.target.value)}
            className="w-16 px-2 py-1 text-xs border rounded text-center"
            step={0.5}
          />
          <span className="text-xs text-gray-500">m</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          黑色线条为该高度的保护范围截面
        </p>
      </div>

      <div className="flex-1">
        <RodList />
        <WireList />
        <EquipmentList />
        <DimensionDisplay />
      </div>
      <ExportButton />
    </div>
  );
}
