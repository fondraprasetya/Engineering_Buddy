import { History } from 'lucide-react';

export default function ActivityTimeline({ activities }) {
    const items = activities ?? [];

    return (
        <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
                <History size={18} className="text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Recent Activities</h3>
            </div>
            {items.length > 0 ? (
                <div className="space-y-0">
                    {items.map((a, i) => (
                        <div key={i} className="flex gap-3 pb-3 last:pb-0">
                            <div className="flex flex-col items-center">
                                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: a.color }} />
                                {i < items.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1" />}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-gray-700">{a.action}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{a.time}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-gray-400 text-center py-6">No recent activities</p>
            )}
        </div>
    );
}
