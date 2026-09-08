import { ClipboardCheck } from 'lucide-react';

export default function ApprovalQueue({ approvalQueue }) {
    const items = approvalQueue ?? [];
    const total = items.reduce((s, a) => s + a.count, 0);
    if (!items.length) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
                <ClipboardCheck size={18} className="text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Approval Queue</h3>
                {total > 0 && <span className="ml-auto bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{total}</span>}
            </div>
            <div className="grid grid-cols-2 gap-2">
                {items.map(a => (
                    <a key={a.label} href={a.route} className="rounded-xl border border-gray-100 p-3 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-gray-500">{a.label}</span>
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: a.color }}>{a.count}</span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">{a.count}</p>
                        <p className="text-[9px] text-gray-400">Pending</p>
                    </a>
                ))}
            </div>
        </div>
    );
}
