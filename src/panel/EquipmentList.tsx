import { useState } from 'react';
import { useStore } from '../store/useStore';

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

export function EquipmentList() {
  const equipment = useStore((s) => s.equipment);
  const protectionStatuses = useStore((s) => s.protectionStatuses);
  const addEquipment = useStore((s) => s.addEquipment);
  const updateEquipment = useStore((s) => s.updateEquipment);
  const removeEquipment = useStore((s) => s.removeEquipment);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [newLabel, setNewLabel] = useState('');
  const [newX, setNewX] = useState('0');
  const [newY, setNewY] = useState('0');
  const [newHx, setNewHx] = useState('5');
  const [newWidth, setNewWidth] = useState('2');
  const [newDepth, setNewDepth] = useState('2');

  const toggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleAdd = () => {
    const x = parseFloat(newX) || 0;
    const y = parseFloat(newY) || 0;
    const hx = parseFloat(newHx) || 5;
    const w = parseFloat(newWidth) || 2;
    const d = parseFloat(newDepth) || 2;
    const label = newLabel.trim() || `设备 #${equipment.length + 1}`;
    addEquipment(x, y, hx, w, d, label);
    setAdding(false);
    setNewLabel('');
    setNewX('0');
    setNewY('0');
    setNewHx('5');
    setNewWidth('2');
    setNewDepth('2');
  };

  const getStatus = (eqId: string) => {
    return protectionStatuses.find((s) => s.equipmentId === eqId);
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">受保护设备</h3>
        <button
          onClick={() => { setAdding(!adding); setExpandedId(null); }}
          className="text-xs px-2 py-0.5 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          + 添加
        </button>
      </div>

      {adding && (
        <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="mb-2">
            <label className="block text-xs text-gray-500 mb-0.5">名称</label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="设备名称"
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
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
              <label className="block text-xs text-gray-500 mb-0.5">hx (m)</label>
              <input
                type="number"
                value={newHx}
                onChange={(e) => setNewHx(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                min={0.1}
                step="0.5"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">宽度 (m)</label>
              <input
                type="number"
                value={newWidth}
                onChange={(e) => setNewWidth(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                min={0.1}
                step="0.5"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">深度 (m)</label>
              <input
                type="number"
                value={newDepth}
                onChange={(e) => setNewDepth(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                min={0.1}
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

      {equipment.length === 0 && (
        <p className="text-xs text-gray-400 italic py-2">暂无设备，点击"添加"创建</p>
      )}

      <div className="space-y-1.5">
        {equipment.map((eq) => {
          const isOpen = expandedId === eq.id;
          const st = getStatus(eq.id);
          const isProtected = st?.protected === true;

          return (
            <div
              key={eq.id}
              className={`border rounded bg-white shadow-sm ${isProtected ? 'border-green-200' : 'border-red-200'}`}
            >
              <button
                onClick={() => toggle(eq.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <CollapseIcon open={isOpen} />
                  <span className="text-sm font-medium text-gray-800 truncate">{eq.label}</span>
                </div>
                {isProtected ? (
                  <span className="text-xs text-green-600 font-medium whitespace-nowrap ml-2">✓ 受保护</span>
                ) : (
                  <span className="text-xs text-red-500 font-medium whitespace-nowrap ml-2">✗ 未保护</span>
                )}
              </button>

              {isOpen && (
                <div className="px-3 pb-3 border-t border-gray-100">
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-0.5">X (m)</label>
                      <input
                        type="number"
                        value={eq.x}
                        onChange={(e) => updateEquipment(eq.id, { x: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                        step="0.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-0.5">Y (m)</label>
                      <input
                        type="number"
                        value={eq.y}
                        onChange={(e) => updateEquipment(eq.id, { y: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                        step="0.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-0.5">hx (m)</label>
                      <input
                        type="number"
                        value={eq.height}
                        onChange={(e) => updateEquipment(eq.id, { height: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                        min={0.1}
                        step="0.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-0.5">宽度 (m)</label>
                      <input
                        type="number"
                        value={eq.width}
                        onChange={(e) => updateEquipment(eq.id, { width: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                        min={0.1}
                        step="0.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-0.5">深度 (m)</label>
                      <input
                        type="number"
                        value={eq.depth}
                        onChange={(e) => updateEquipment(eq.id, { depth: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                        min={0.1}
                        step="0.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-0.5">名称</label>
                      <input
                        type="text"
                        value={eq.label}
                        onChange={(e) => updateEquipment(eq.id, { label: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                  </div>

                  {st && (
                    <div className={`mt-2 p-2 rounded text-xs ${isProtected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      <div className="font-medium">
                        {isProtected ? '受保护' : '未保护'}
                        {st.margin > 0 && <span className="ml-1">(裕度: {st.margin.toFixed(2)} m)</span>}
                      </div>
                      {st.protectedBy.length > 0 && (
                        <div className="mt-0.5 text-gray-500">
                          保护源: {st.protectedBy.map((p) => p.slice(-4)).join(', ')}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      removeEquipment(eq.id);
                      if (expandedId === eq.id) setExpandedId(null);
                    }}
                    className="mt-2 w-full py-1.5 text-xs bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors"
                  >
                    删除设备
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
