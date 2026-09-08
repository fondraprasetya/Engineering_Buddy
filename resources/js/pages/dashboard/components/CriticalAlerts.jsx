import { AlertTriangle } from 'lucide-react';

const severityConfig = {
    critical: { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', text: 'text-red-700' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500', text: 'text-amber-700' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-brand-400', text: 'text-brand-700' },
};

export default function CriticalAlerts({ criticalAlerts }) {
    const items = criticalAlerts ?? [];
    const criticalCount = items.filter(a => a.severity === 'critical').length;

    if (!items.length) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={18} className="text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Critical Alerts</h3>
                {criticalCount > 0 && <span className="ml-auto bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{criticalCount}</span>}
            </div>
            <div className="space-y-2">
                {items.map((a, i) => {
                    const cfg = severityConfig[a.severity];
                    return (
                        <div key={i} className={`${cfg.bg} ${cfg.border} border rounded-xl px-3 py-2 flex items-center gap-2`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                            <span className={`text-xs ${cfg.text}`}>{a.message}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
