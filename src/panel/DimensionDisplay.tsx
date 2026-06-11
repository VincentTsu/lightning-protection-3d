import { useStore } from '../store/useStore';
import { groundProtectionRadius, distanceBetweenRods, equivalentJointPair } from '../engine/rodCalc';
import { groundProtectionWidth, wireLength } from '../engine/wireCalc';

function last4(id: string) {
  return id.slice(-4);
}

export function DimensionDisplay() {
  const rods = useStore((s) => s.rods);
  const wires = useStore((s) => s.wires);

  if (rods.length === 0 && wires.length === 0) {
    return (
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">关键参数</h3>
        <p className="text-xs text-gray-400 italic">暂无防雷设施数据</p>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">关键参数</h3>

      <div className="p-3 bg-gray-50 border border-gray-200 rounded space-y-2 text-xs text-gray-700">
        {/* Rods section */}
        {rods.length > 0 && (
          <div>
            <div className="font-medium text-gray-800 mb-1 text-[11px] uppercase tracking-wide">避雷针</div>
            {rods.map((rod) => {
              const r0 = groundProtectionRadius(rod.height);
              return (
                <div key={rod.id} className="flex justify-between items-center py-0.5 border-b border-gray-100 last:border-0">
                  <span className="text-gray-600">针 {last4(rod.id)}</span>
                  <span className="text-gray-500">
                    h={rod.height.toFixed(1)}m, r₀={r0.toFixed(2)}m
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Rod pair joint heights */}
        {rods.length >= 2 && (
          <div>
            <div className="font-medium text-gray-800 mb-1 text-[11px] uppercase tracking-wide mt-2">针间联合保护</div>
            {rods.flatMap((a, i) =>
              rods.slice(i + 1).map((b) => {
                const D = distanceBetweenRods(a, b);
                const pair = equivalentJointPair(a, b);
                const h0 = pair?.h0 ?? 0;
                return (
                  <div key={`${a.id}-${b.id}`} className="flex justify-between items-center py-0.5 border-b border-gray-100 last:border-0">
                    <span className="text-gray-600">
                      {last4(a.id)} ↔ {last4(b.id)}
                    </span>
                    <span className="text-gray-500">
                      D={D.toFixed(1)}m, h₀={h0.toFixed(2)}m
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Wires section */}
        {wires.length > 0 && (
          <div>
            <div className="font-medium text-gray-800 mb-1 text-[11px] uppercase tracking-wide mt-2">避雷线</div>
            {wires.map((wire) => {
              const b0 = groundProtectionWidth(wire.height);
              const len = wireLength(wire);
              return (
                <div key={wire.id} className="flex justify-between items-center py-0.5 border-b border-gray-100 last:border-0">
                  <span className="text-gray-600">线 {last4(wire.id)}</span>
                  <span className="text-gray-500">
                    h={wire.height.toFixed(1)}m, b₀={b0.toFixed(2)}m, L={len.toFixed(1)}m
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary */}
        <div className="pt-1 border-t border-gray-200 mt-1">
          <div className="text-[10px] text-gray-400">
            针数: {rods.length} | 线数: {wires.length}
          </div>
        </div>
      </div>
    </div>
  );
}
