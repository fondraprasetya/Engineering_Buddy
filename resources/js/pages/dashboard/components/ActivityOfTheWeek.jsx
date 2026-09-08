import { Calendar } from 'lucide-react';

const typeColors = {
    'Work Order': { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
    'Maintenance': { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
    'Checkpoint': { bg: '#ECFDF5', text: '#047857', dot: '#10B981' },
};

function fmtDate(d) {
    if (!d) return '';
    const date = new Date(d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const label = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday' : '';
    const formatted = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return label ? `${label}, ${formatted}` : formatted;
}

function daysRemaining(d) {
    if (!d) return null;
    const diff = Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Overdue';
    if (diff === 0) return 'Due today';
    return `${diff} day${diff > 1 ? 's' : ''}`;
}

export default function ActivityOfTheWeek({ items }) {
    if (!items || items.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Calendar size={18} className="text-gray-500" />
                    <h3 className="text-sm font-semibold text-gray-900">Activity of the Week</h3>
                </div>
                <p className="text-xs text-gray-400 text-center py-6">No upcoming due tasks in the next 7 days.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
                <Calendar size={18} className="text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Activity of the Week</h3>
                <span className="ml-auto text-xs text-gray-400">{items.length} upcoming</span>
            </div>
            <div className="space-y-2">
                {items.map((item, idx) => {
                    const colors = typeColors[item.type] ?? { bg: '#F9FAFB', text: '#374151', dot: '#6B7280' };
                    return (
                        <div key={`${item.type}-${item.id}-${idx}`} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ backgroundColor: colors.bg }}>
                            <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: colors.dot }} />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-gray-900 truncate">{item.title}</p>
                                <p className="text-[11px] text-gray-500 mt-0.5">{item.type}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-xs font-medium text-gray-700">{fmtDate(item.due_date)}</p>
                                <p className="text-[10px] mt-0.5" style={{ color: colors.dot }}>{daysRemaining(item.due_date)}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
