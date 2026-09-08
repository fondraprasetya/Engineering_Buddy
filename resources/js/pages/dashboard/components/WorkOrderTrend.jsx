import { BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function WorkOrderTrend({ monthlyTrend }) {
    if (!monthlyTrend?.length) return null;

    const data = monthlyTrend.slice(-12).map(m => ({
        month: m.month?.slice(-2) ?? m.month,
        Created: m.created ?? 0,
        Completed: m.completed ?? 0,
    }));

    return (
        <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={18} className="text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Work Order Trend</h3>
            </div>
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="Created" stroke="#3B82F6" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="Completed" stroke="#22C55E" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
