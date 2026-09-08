import { useState, useCallback, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';
import WidgetPanel from './WidgetPanel';
import WidgetSettingsDrawer from './WidgetSettingsDrawer';
import { WIDGETS, WIDTH_OPTIONS, defaultLayout, DEFAULT_ORDER, DEFAULT_HIDDEN } from '../widgetRegistry';
import NewsSection from './NewsSection';
import UtilityComparisonCard from './UtilityComparisonCard';
import ActivityOfTheWeek from './ActivityOfTheWeek';
import BudgetOverview from './BudgetOverview';
import WorkOrderTrend from './WorkOrderTrend';
import ApprovalQueue from './ApprovalQueue';
import CriticalAlerts from './CriticalAlerts';
import ActivityTimeline from './ActivityTimeline';
import TechnicianRanking from './TechnicianRanking';
import HeroOfTheDay from './HeroOfTheDay';
import ComplianceChart from './ComplianceChart';
import AssetHealthChart from './AssetHealthChart';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const rp = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

function StatsWidget({ widgetData }) {
    const d = widgetData?.stats ?? {};
    const trend = d.monthlyTrend ?? [];
    const totalWo = d.totalWo ?? 0;
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCardValue label="Total Work Orders" value={totalWo} color="#0F6E56" bg="bg-brand-50" href="/work-orders" trend={trend} />
            <StatCardValue label="Total Assets" value={d.totalAssets ?? 0} color="#993C1D" bg="bg-accent-50" href="/assets" />
            <StatCardValue label="Active Schedules" value={d.activeSchedules ?? 0} color="#3B6D11" bg="bg-ok-50" href="/maintenance-schedules" />
            <StatCardValue label="Pending" value={d.pending ?? 0} color="#854F0B" bg="bg-warn-50" href="/work-orders" />
        </div>
    );
}

function StatCardValue({ label, value, color, bg, href, trend }) {
    const maxVal = trend?.length ? Math.max(...trend.map(t => t.v ?? 0), 1) : 1;
    return (
        <a href={href} className={`${bg} rounded-2xl p-4 hover:scale-[1.02] transition-all duration-150 block`}>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
            {trend?.length > 0 && (
                <div className="mt-2 flex items-end gap-[2px] h-8">
                    {trend.slice(-12).map((t, i) => (
                        <div key={i} className="flex-1 rounded-t" style={{ height: `${Math.max((t.v ?? 0) / maxVal * 100, 2)}%`, backgroundColor: color, opacity: 0.6 }} />
                    ))}
                </div>
            )}
        </a>
    );
}

function StatusPieWidget({ widgetData }) {
    const d = widgetData?.workOrdersByStatus ?? {};
    const data = Object.entries(d.data ?? {}).map(([k, v]) => ({
        name: d.labels?.[k] ?? k,
        value: v,
        color: d.colors?.[k] ?? '#9CA3AF',
    }));
    if (data.length === 0) return null;
    return (
        <ResponsiveContainer width="100%" height={240}>
            <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="value">
                    {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
        </ResponsiveContainer>
    );
}

const RENDERERS = {
    news: (d) => <NewsSection occupancy={d?.news?.occupancy} upcomingEvents={d?.news?.upcomingEvents} />,
    stats: (d) => <StatsWidget widgetData={d} />,
    utility: (d) => <UtilityComparisonCard energy={d?.utility} />,
    activityOfWeek: (d) => <ActivityOfTheWeek items={d?.activityOfWeek ?? []} />,
    costOverview: (d) => <BudgetOverview costOverview={d?.costOverview} />,
    workOrderTrend: (d) => <WorkOrderTrend monthlyTrend={d?.workOrderTrend} />,
    workOrdersByStatus: (d) => <StatusPieWidget widgetData={d?.workOrdersByStatus} />,
    approvalQueue: (d) => <ApprovalQueue approvalQueue={d?.approvalQueue} />,
    criticalAlerts: (d) => <CriticalAlerts criticalAlerts={d?.criticalAlerts} />,
    recentActivities: (d) => <ActivityTimeline activities={d?.recentActivities} />,
    topTechnicians: (d) => <TechnicianRanking topPerformers={d?.topTechnicians} />,
    heroOfDay: (d) => <HeroOfTheDay heroOfTheDay={d?.heroOfDay} />,
    complianceChart: (d) => <ComplianceChart assetStats={d?.complianceChart} />,
    assetHealthChart: () => <AssetHealthChart />,
};

function LayoutRow({ items, widgetData, onWidthChange, onRemove }) {
    return (
        <div className="grid grid-cols-12 gap-4">
            {items.map(item => {
                const widget = WIDGETS.find(w => w.key === item.key);
                const widthOption = WIDTH_OPTIONS.find(w => w.value === item.width);
                const gridClass = widthOption?.gridClass ?? 'col-span-12 md:col-span-4';
                const Renderer = RENDERERS[item.key];
                if (!Renderer) return null;
                return (
                    <div key={item.key} className={gridClass}>
                        {item.key === 'stats' || item.key === 'utility' ? (
                            <Renderer {...widgetData} />
                        ) : (
                            <WidgetPanel
                                title={widget?.title ?? item.key}
                                width={item.width}
                                onWidthChange={(w) => onWidthChange(item.key, w)}
                                onRemove={() => onRemove(item.key)}
                            >
                                <Renderer {...widgetData} />
                            </WidgetPanel>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function WidgetGrid({ widgetSettings, widgetData }) {
    const [showSettings, setShowSettings] = useState(false);
    const [layout, setLayout] = useState(() => {
        const saved = widgetSettings?.layout;
        if (saved && Array.isArray(saved) && saved.length > 0) return saved;
        return defaultLayout(DEFAULT_ORDER);
    });
    const [hidden, setHidden] = useState(() => widgetSettings?.hidden ?? DEFAULT_HIDDEN);
    const saveTimer = useRef(null);

    const save = useCallback((newLayout, newHidden) => {
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            fetch('/api/v1/dashboard/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content ?? '',
                },
                body: JSON.stringify({ layout: newLayout, hidden: newHidden }),
            });
        }, 1000);
    }, []);

    useEffect(() => {
        return () => clearTimeout(saveTimer.current);
    }, []);

    const visibleLayout = layout.filter(item => !hidden.includes(item.key));

    const handleWidthChange = (key, width) => {
        const next = layout.map(item => item.key === key ? { ...item, width } : item);
        setLayout(next);
        save(next, hidden);
    };

    const handleRemove = (key) => {
        const nextHidden = [...hidden, key];
        setHidden(nextHidden);
        save(layout, nextHidden);
    };

    const handleToggle = (key) => {
        const nextHidden = hidden.includes(key)
            ? hidden.filter(h => h !== key)
            : [...hidden, key];
        setHidden(nextHidden);
        save(layout, nextHidden);
    };

    const handleReorder = (key, afterKey) => {
        const keys = layout.map(l => l.key);
        const fromIdx = keys.indexOf(key);
        const toIdx = keys.indexOf(afterKey);
        if (fromIdx === -1 || toIdx === -1) return;
        keys.splice(fromIdx, 1);
        keys.splice(toIdx, 0, key);
        const next = keys.map((k, i) => {
            const existing = layout.find(l => l.key === k);
            return { key: k, width: existing?.width ?? '1/3', order: i };
        });
        setLayout(next);
        save(next, hidden);
    };

    const handleReset = () => {
        const next = defaultLayout(DEFAULT_ORDER);
        setLayout(next);
        setHidden(DEFAULT_HIDDEN);
        save(next, DEFAULT_HIDDEN);
    };

    const rows = [];
    let currentRow = [];
    for (const item of visibleLayout) {
        currentRow.push(item);
        const totalCols = currentRow.reduce((sum, i) => {
            const opt = WIDTH_OPTIONS.find(w => w.value === i.width);
            const cls = opt?.gridClass ?? '';
            const m = cls.match(/(?:md:)?col-span-(\d+)/);
            const cols = m ? parseInt(m[1], 10) : 4;
            return sum + cols;
        }, 0);
        if (totalCols >= 12 || item === visibleLayout[visibleLayout.length - 1]) {
            rows.push(currentRow);
            currentRow = [];
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-end">
                <button
                    onClick={() => setShowSettings(true)}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-xl hover:bg-gray-50"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    Widgets
                </button>
            </div>

            {rows.map((row, i) => (
                <LayoutRow
                    key={i}
                    items={row}
                    widgetData={widgetData}
                    onWidthChange={handleWidthChange}
                    onRemove={handleRemove}
                />
            ))}

            {showSettings && (
                <WidgetSettingsDrawer
                    layout={layout}
                    hidden={hidden}
                    onToggle={handleToggle}
                    onReorder={handleReorder}
                    onReset={handleReset}
                    onClose={() => setShowSettings(false)}
                />
            )}
        </div>
    );
}
