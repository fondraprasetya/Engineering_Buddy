import { DollarSign, TrendingDown } from 'lucide-react';

function formatCurrency(v) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v ?? 0);
}

const breakdownColors = {
    Energy: '#D97706',
    Projects: '#10B981',
    Maintenance: '#3B82F6',
    Expenses: '#8B5CF6',
};

export default function BudgetOverview({ costOverview }) {
    const budget = costOverview?.total_budget ?? 0;
    const actual = costOverview?.total_actual ?? 0;
    const remaining = Math.max(budget - actual, 0);
    const pct = budget > 0 ? Math.min((actual / budget) * 100, 100) : 0;

    const gaugeColor = pct > 90 ? '#EF4444' : pct > 75 ? '#F59E0B' : '#22C55E';

    const rawBreakdown = costOverview?.breakdown ?? {};
    const breakdown = Object.entries(rawBreakdown)
        .filter(([, v]) => v > 0)
        .map(([label, value]) => ({ label, value: Math.round(value), color: breakdownColors[label] ?? '#6B7280' }));

    return (
        <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
                <DollarSign size={18} className="text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Cost Overview</h3>
            </div>

            <div className="flex items-center gap-6 mb-5">
                <div className="relative w-24 h-24 shrink-0">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#E5E7EB" strokeWidth="8" />
                        <circle cx="50" cy="50" r="42" fill="none" stroke={gaugeColor} strokeWidth="8"
                            strokeDasharray={`${(pct / 100) * 264} 264`}
                            strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-lg font-bold" style={{ color: gaugeColor }}>{Math.round(pct)}%</span>
                        <span className="text-[9px] text-gray-400">Used</span>
                    </div>
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Budget</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(budget)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Actual</span>
                        <span className="font-semibold text-gray-700">{formatCurrency(actual)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Remaining</span>
                        <span className={`font-semibold ${remaining > 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(remaining)}</span>
                    </div>
                    {budget > 0 && (
                        <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
                            <TrendingDown size={12} />
                            <span>{Math.round(pct)}% utilization</span>
                        </div>
                    )}
                </div>
            </div>

            {actual > 0 && (
                <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Cost Breakdown</p>
                    <div className="space-y-2">
                        {breakdown.map(b => (
                            <div key={b.label}>
                                <div className="flex justify-between text-xs mb-0.5">
                                    <span className="text-gray-600">{b.label}</span>
                                    <span className="font-medium text-gray-700">{formatCurrency(b.value)}</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${(b.value / actual) * 100}%`, backgroundColor: b.color }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
