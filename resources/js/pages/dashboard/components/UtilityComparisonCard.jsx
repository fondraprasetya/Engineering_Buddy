import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { Zap, TrendingUp, TrendingDown } from 'lucide-react';

const utilityMeta = {
    electricity: { label: 'Electricity', unit: 'kWh', icon: '⚡', color: '#D97706' },
    water: { label: 'Water', unit: 'm³', icon: '💧', color: '#0284C7' },
    gas: { label: 'Gas', unit: 'm³', icon: '🔥', color: '#EA580C' },
};

function formatCurrency(v) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v ?? 0);
}

function formatNum(v) {
    return (v ?? 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export default function UtilityComparisonCard({ energy }) {
    if (!energy?.length) return null;

    const totalToday = energy.reduce((sum, e) => sum + (e.today?.cost ?? 0), 0);
    const totalMonth = energy.reduce((sum, e) => sum + (e.month?.cost ?? 0), 0);
    const totalYear = energy.reduce((sum, e) => sum + (e.year?.cost ?? 0), 0);

    const chartData = energy.map(e => {
        const meta = utilityMeta[e.type.toLowerCase()] ?? {};
        const curToday = e.today?.consumption ?? 0;
        const curMonth = e.month?.consumption ?? 0;
        const curYear = e.year?.consumption ?? 0;
        const lyToday = e.lastYear?.today?.consumption ?? 0;
        const lyMonth = e.lastYear?.month?.consumption ?? 0;
        const lyYear = e.lastYear?.year?.consumption ?? 0;
        return {
            name: meta.label || e.type,
            color: meta.color,
            'This Year': curYear,
            'Last Year': lyYear,
            todayCur: curToday,
            todayLy: lyToday,
            monthCur: curMonth,
            monthLy: lyMonth,
            yearCur: curYear,
            yearLy: lyYear,
            cost: e.year?.cost ?? 0,
        };
    });

    return (
        <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Zap size={18} className="text-gray-500" />
                    <h3 className="text-sm font-semibold text-gray-900">Utility Consumption</h3>
                </div>
                <div className="text-right">
                    <span className="text-xs font-semibold text-gray-500 block">Total {formatCurrency(totalYear)}</span>
                    <span className="text-[10px] text-gray-400">Today {formatCurrency(totalToday)} · MTD {formatCurrency(totalMonth)}</span>
                </div>
            </div>

            <div className="space-y-4">
                {energy.map(e => {
                    const meta = utilityMeta[e.type.toLowerCase()] ?? {};
                    const curToday = e.today?.consumption ?? 0;
                    const curMonth = e.month?.consumption ?? 0;
                    const curYear = e.year?.consumption ?? 0;
                    const lyToday = e.lastYear?.today?.consumption ?? 0;
                    const lyMonth = e.lastYear?.month?.consumption ?? 0;
                    const lyYear = e.lastYear?.year?.consumption ?? 0;
                    const yearDiff = curYear - lyYear;
                    const yearPct = lyYear > 0 ? ((yearDiff / lyYear) * 100) : 0;
                    const monthDiff = curMonth - lyMonth;
                    const monthPct = lyMonth > 0 ? ((monthDiff / lyMonth) * 100) : 0;
                    const todayCost = e.today?.cost ?? 0;
                    const monthCost = e.month?.cost ?? 0;
                    const yearCost = e.year?.cost ?? 0;

                    return (
                        <div key={e.type} className="border border-gray-100 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-base">{meta.icon}</span>
                                <span className="text-sm font-semibold text-gray-900">{meta.label}</span>
                                <span className="text-[10px] text-gray-400 ml-auto">{meta.unit}</span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-3">
                                {[
                                    { label: 'Today', cur: curToday, ly: lyToday, cost: todayCost },
                                    { label: 'MTD', cur: curMonth, ly: lyMonth, cost: monthCost, pct: monthPct, diff: monthDiff },
                                    { label: 'YTD', cur: curYear, ly: lyYear, cost: yearCost, pct: yearPct, diff: yearDiff },
                                ].map(p => (
                                    <div key={p.label} className="text-center p-2 rounded-md bg-gray-50">
                                        <p className="text-[10px] text-gray-500 mb-1">{p.label}</p>
                                        <p className="text-sm font-bold" style={{ color: meta.color }}>{formatNum(p.cur)}</p>
                                        <p className="text-[10px] text-gray-400">{formatNum(p.ly)} last yr</p>
                                        {p.pct !== undefined && p.ly > 0 && (
                                            <div className="flex items-center justify-center gap-0.5 mt-0.5">
                                                {p.diff > 0
                                                    ? <TrendingUp size={10} className="text-red-500" />
                                                    : p.diff < 0
                                                        ? <TrendingDown size={10} className="text-green-500" />
                                                        : null}
                                                <span className={`text-[10px] font-semibold ${p.diff > 0 ? 'text-red-500' : p.diff < 0 ? 'text-green-500' : 'text-gray-400'}`}>
                                                    {p.diff > 0 ? '+' : ''}{p.pct.toFixed(1)}%
                                                </span>
                                            </div>
                                        )}
                                        {p.ly === 0 && p.cur > 0 && (
                                            <span className="text-[10px] text-brand-400 font-semibold">New</span>
                                        )}
                                        <p className="text-[9px] text-gray-400 mt-0.5">{formatCurrency(p.cost)}</p>
                                    </div>
                                ))}
                            </div>

                            {curYear > 0 && (
                                <div className="grid grid-cols-3 gap-1">
                                    {[
                                        { label: 'Today', cur: curToday, ly: lyToday },
                                        { label: 'MTD', cur: curMonth, ly: lyMonth },
                                        { label: 'YTD', cur: curYear, ly: lyYear },
                                    ].map(p => (
                                        <div key={p.label} className="h-16">
                                            <p className="text-[9px] text-gray-400 text-center mb-0.5">{p.label}</p>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={[{ name: p.label, 'This Year': p.cur, 'Last Year': p.ly }]} barSize={24} barGap={2}>
                                                    <XAxis dataKey="name" hide />
                                                    <YAxis hide />
                                                    <Tooltip
                                                        contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
                                                        formatter={(v) => formatNum(v)}
                                                    />
                                                    <Bar dataKey="Last Year" fill="#D1D5DB" radius={[2, 2, 0, 0]} />
                                                    <Bar dataKey="This Year" fill={meta.color} radius={[2, 2, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {(yearPct > 0 && yearCost > 0) && (
                                <div className="flex items-center gap-1 mt-2 text-[10px] text-amber-600 bg-amber-50 rounded px-2 py-1">
                                    <TrendingUp size={12} />
                                    <span>Est. {formatCurrency(yearCost * (yearPct / (100 + yearPct)))} overspent vs last year</span>
                                </div>
                            )}
                            {(yearPct < 0 && yearCost > 0) && (
                                <div className="flex items-center gap-1 mt-2 text-[10px] text-green-600 bg-green-50 rounded px-2 py-1">
                                    <TrendingDown size={12} />
                                    <span>Est. {formatCurrency(Math.abs(yearCost * (yearPct / (100 + yearPct))))} saved vs last year</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
