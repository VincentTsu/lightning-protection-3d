import { useState } from 'react';
import { useStore } from '../store/useStore';
import { distanceBetweenRods, equivalentJointPair, groundProtectionRadius } from '../engine/rodCalc';

function last4(id: string) {
  return id.slice(-4);
}

function CollapseIcon({ open }: { open: boolean }) {
  return (
    <span className="text-gray-400 text-xs transition-transform duration-150 inline-block" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
      ▶
    </span>
  );
}

export function RodList() {
  const rods = useStore((s) => s.rods);
  const addRod = useStore((s) => s.addRod);
  const updateRod = useStore((s) => s.updateRod);
  const removeRod = useStore((s) => s.removeRod);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [newX, setNewX] = useState('0');
  const [newY, setNewY] = useState('0');
  const [newH, setNewH] = useState('20');

  const toggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleAdd = () => {
    const x = parseFloat(newX) || 0;
    const y = parseFloat(newY) || 0;
    const h = parseFloat(newH) || 20;
    addRod(x, y, h);
    setAdding(false);
    setNewX('0');
    setNewY('0');
    setNewH('20');
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">避雷针</h3>
        <button
          onClick={() => { setAdding(!adding); setExpandedId(null); }}
          className="text-xs px-2 py-0.5 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          + 添加
        </button>
      </div>

      {adding && (
        <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">X (m)</label>
              <input
                type="number"
                value={newX}
                onChange={(e) => setNewX(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                step="0.5"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Y (m)</label>
              <input
                type="number"
                value={newY}
                onChange={(e) => setNewY(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                step="0.5"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">H (m)</label>
              <input
                type="number"
                value={newH}
                onChange={(e) => setNewH(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                min={1}
                max={120}
                step="0.5"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="flex-1 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              确认
            </button>
            <button
              onClick={() => setAdding(false)}
              className="flex-1 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {rods.length === 0 && (
        <p className="text-xs text-gray-400 italic py-2">暂无避雷针，点击"添加"创建</p>
      )}

      <div className="space-y-1.5">
        {rods.map((rod) => {
          const isOpen = expandedId === rod.id;
          const r0 = groundProtectionRadius(rod.height);

          // Find joint heights with other rods
          const jointPairs: { otherId: string; D: number; h0: number }[] = [];
          rods.forEach((other) => {
            if (other.id === rod.id) return;
            const D = distanceBetweenRods(rod, other);
            const pair = equivalentJointPair(rod, other);
            if (pair) jointPairs.push({ otherId: other.id, D, h0: pair.h0 });
          });

          return (
            <div key={rod.id} className="border border-gray-200 rounded bg-white shadow-sm">
              <button
                onClick={() => toggle(rod.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <CollapseIcon open={isOpen} />
                  <span className="text-sm font-medium text-gray-800">针 {last4(rod.id)}</span>
                </div>
                <span className="text-xs text-gray-500">h={rod.height}m</span>
              </button>

              {isOpen && (
                <div className="px-3 pb-3 border-t border-gray-100">
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-0.5">X (m)</label>
                      <input
                        type="number"
                        value={rod.x}
                        onChange={(e) => updateRod(rod.id, { x: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                        step="0.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-0.5">Y (m)</label>
                      <input
                        type="number"
                        value={rod.y}
                        onChange={(e) => updateRod(rod.id, { y: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                        step="0.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-0.5">h (m)</label>
                      <input
                        type="number"
                        value={rod.height}
                        onChange={(e) => {
                          const v = Math.max(1, Math.min(120, parseFloat(e.target.value) || 1));
                          updateRod(rod.id, { height: v });
                        }}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                        min={1}
                        max={120}
                        step="0.5"
                      />
                    </div>
                  </div>

                  <div className="mt-2">
                    <label className="block text-xs text-gray-400 mb-0.5">
                      h: {rod.height.toFixed(1)} m
                    </label>
                    <input
                      type="range"
                      value={rod.height}
                      onChange={(e) => updateRod(rod.id, { height: parseFloat(e.target.value) })}
                      min={1}
                      max={120}
                      step="0.5"
                      className="w-full h-1.5 accent-blue-500"
                    />
                    <div className="flex justify-between text-[10px] text-gray-300">
                      <span>1m</span>
                      <span>120m</span>
                    </div>
                  </div>

                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                    <div>r₀ = {r0.toFixed(2)} m</div>
                    {jointPairs.map((jp) => (
                      <div key={jp.otherId} className="mt-0.5">
                        与 {last4(jp.otherId)}: D={jp.D.toFixed(1)}m, h₀={jp.h0.toFixed(2)}m
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      removeRod(rod.id);
                      if (expandedId === rod.id) setExpandedId(null);
                    }}
                    className="mt-2 w-full py-1.5 text-xs bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors"
                  >
                    删除避雷针
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
