import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Activity } from 'lucide-react';

const data = [
    { name: 'Healthy', value: 42, color: '#22C55E' },
    { name: 'Warning', value: 8, color: '#F59E0B' },
    { name: 'Critical', value: 3, color: '#EF4444' },
];

export default function AssetHealthChart() {
    return (
        <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
                <Activity size={18} className="text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Asset Health</h3>
                <span className="ml-auto text-xs font-bold text-green-600">
                    {Math.round((data[0].value / data.reduce((s, d) => s + d.value, 0)) * 100)}%
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
