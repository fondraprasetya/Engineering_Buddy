import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CheckCircle } from 'lucide-react';

export default function ComplianceChart({ assetStats }) {
    const completed = assetStats?.maintenance_completed ?? 0;
    const scheduled = assetStats?.maintenance_scheduled ?? 0;
    const overdue = assetStats?.overdue_schedules ?? 0;
    const total = scheduled + overdue + completed;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const data = [
        { name: 'Completed', value: completed, color: '#22C55E' },
        { name: 'Scheduled', value: scheduled, color: '#3B82F6' },
        { name: 'Overdue', value: overdue, color: '#EF4444' },
    ].filter(d => d.value > 0);

    if (!data.length) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={18} className="text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Maintenance Compliance</h3>
                <span className={`ml-auto text-xs font-bold ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                    {pct}%
                </span>
            </div>
            <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={data} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value">
                            {data.map((e, i) => (
                                <Cell key={i} fill={e.color} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-[10px] text-gray-500 mt-1">
                {data.map(d => (
                    <span key={d.name} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.name} ({d.value})
                    </span>
                ))}
            </div>
        </div>
    );
}
