import { useState } from 'react';
import { useStore } from '../store/useStore';
import { groundProtectionWidth, wireLength } from '../engine/wireCalc';

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

export function WireList() {
  const wires = useStore((s) => s.wires);
  const addWire = useStore((s) => s.addWire);
  const updateWire = useStore((s) => s.updateWire);
  const removeWire = useStore((s) => s.removeWire);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [newX1, setNewX1] = useState('0');
  const [newY1, setNewY1] = useState('0');
  const [newX2, setNewX2] = useState('20');
  const [newY2, setNewY2] = useState('0');
  const [newH, setNewH] = useState('15');

  const toggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleAdd = () => {
    const x1 = parseFloat(newX1) || 0;
    const y1 = parseFloat(newY1) || 0;
    const x2 = parseFloat(newX2) || 0;
    const y2 = parseFloat(newY2) || 0;
    const h = parseFloat(newH) || 15;
    addWire(x1, y1, x2, y2, h);
    setAdding(false);
    setNewX1('0');
    setNewY1('0');
    setNewX2('20');
    setNewY2('0');
    setNewH('15');
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">避雷线</h3>
        <button
          onClick={() => { setAdding(!adding); setExpandedId(null); }}
          className="text-xs px-2 py-0.5 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          + 添加
        </button>
      </div>

      {adding && (
        <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">X1 (m)</label>
              <input
                type="number"
                value={newX1}
                onChange={(e) => setNewX1(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                step="0.5"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Y1 (m)</label>
              <input
                type="number"
                value={newY1}
                onChange={(e) => setNewY1(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                step="0.5"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">X2 (m)</label>
              <input
                type="number"
                value={newX2}
                onChange={(e) => setNewX2(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                step="0.5"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Y2 (m)</label>
              <input
                type="number"
                value={newY2}
                onChange={(e) => setNewY2(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                step="0.5"
              />
            </div>
          </div>
          <div className="mb-2">
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

      {wires.length === 0 && (
        <p className="text-xs text-gray-400 italic py-2">暂无避雷线，点击"添加"创建</p>
      )}

      <div className="space-y-1.5">
        {wires.map((wire) => {
          const isOpen = expandedId === wire.id;
          const len = wireLength(wire);
          const b0 = groundProtectionWidth(wire.height);

          return (
            <div key={wire.id} className="border border-gray-200 rounded bg-white shadow-sm">
              <button
                onClick={() => toggle(wire.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <CollapseIcon open={isOpen} />
                  <span className="text-sm font-medium text-gray-800">线 {last4(wire.id)}</span>
                </div>
                <span className="text-xs text-gray-500">
                  h={wire.height}m L={len.toFixed(1)}m
                </span>
              </button>

              {isOpen && (
                <div className="px-3 pb-3 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-0.5">X1 (m)</label>
                      <input
                        type="number"
                        value={wire.x1}
                        onChange={(e) => updateWire(wire.id, { x1: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                        step="0.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-0.5">Y1 (m)</label>
                      <input
                        type="number"
                        value={wire.y1}
                        onChange={(e) => updateWire(wire.id, { y1: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                        step="0.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-0.5">X2 (m)</label>
                      <input
                        type="number"
                        value={wire.x2}
                        onChange={(e) => updateWire(wire.id, { x2: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                        step="0.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-0.5">Y2 (m)</label>
                      <input
                        type="number"
                        value={wire.y2}
                        onChange={(e) => updateWire(wire.id, { y2: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                        step="0.5"
                      />
                    </div>
                  </div>

                  <div className="mt-2">
                    <label className="block text-xs text-gray-400 mb-0.5">
                      h: {wire.height.toFixed(1)} m
                    </label>
                    <input
                      type="range"
                      value={wire.height}
                      onChange={(e) => updateWire(wire.id, { height: parseFloat(e.target.value) })}
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
                    <div>长度 L = {len.toFixed(2)} m</div>
                    <div>b₀ = {b0.toFixed(2)} m</div>
                  </div>

                  <button
                    onClick={() => {
                      removeWire(wire.id);
                      if (expandedId === wire.id) setExpandedId(null);
                    }}
                    className="mt-2 w-full py-1.5 text-xs bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors"
                  >
                    删除避雷线
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
