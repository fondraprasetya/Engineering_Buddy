import { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

export default function History({ auth, asset }) {
    const today = new Date().toISOString().slice(0, 10);
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const [dateFrom, setDateFrom] = useState(firstOfMonth);
    const [dateTo, setDateTo] = useState(today);
    const [history, setHistory] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        try {
            const res = await fetch(`/api/v1/assets/${asset.id}/history?${params}`);
            const data = await res.json();
            setHistory(data);
        } finally {
            setLoading(false);
        }
    };

    const statusColors = {
        pending_dept_head: 'bg-yellow-100 text-yellow-700', pending_chief_engineer: 'bg-orange-100 text-orange-700',
        rejected: 'bg-red-100 text-red-700', approved: 'bg-brand-50 text-brand-700',
        assigned: 'bg-purple-100 text-purple-700', in_progress: 'bg-cyan-100 text-cyan-700',
        pending_check: 'bg-rose-100 text-rose-700', pending_close: 'bg-indigo-100 text-indigo-700',
        completed: 'bg-green-100 text-green-700', closed: 'bg-gray-200 text-gray-600',
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title={`${asset.name} - History`} />
            <div className="space-y-4">
                <Link href={`/assets/${asset.id}`} className="text-sm text-brand-600 hover:text-brand-700">&larr; Back to Asset</Link>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900">{asset.name} — Full History</h2>
                    <p className="text-sm text-gray-500 mt-1">{asset.code} · {asset.category}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap gap-3 items-end">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">From</label>
                        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); }} className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">To</label>
                        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); }} className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm" />
                    </div>
                    <button onClick={fetchHistory} className="bg-brand-400 text-white rounded-xl px-4 py-1.5 text-sm hover:bg-brand-600">Filter</button>
                </div>

                {loading ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">Loading...</div>
                ) : history ? (
                    <div className="space-y-4">
                        {history.work_orders?.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Work Orders ({history.work_orders.length})</h3>
                                <div className="space-y-2">
                                    {history.work_orders.map(wo => (
                                        <Link key={wo.id} href={`/work-orders/${wo.id}`} className="block p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-900">{wo.title}</span>
                                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[wo.status]}`}>
                                                    {wo.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">{wo.requester?.name} · {new Date(wo.created_at).toLocaleDateString()}</p>
                                            {wo.checklist_responses?.length > 0 && (
                                                <div className="mt-2 text-xs text-gray-400">
                                                    {wo.checklist_responses.length} checklist response(s)
                                                </div>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {history.expenses?.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Expenses ({history.expenses.length})</h3>
                                <div className="space-y-2">
                                    {history.expenses.map((exp, i) => (
                                        <div key={i} className="p-3 rounded-xl border border-gray-100">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-900">{exp.description || 'No description'}</span>
                                                <span className="text-sm font-semibold text-red-600">Rp {Number(exp.amount).toLocaleString()}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {exp.post_account} · {new Date(exp.expense_date).toLocaleDateString()}
                                                {exp.work_order_id && (
                                                    <Link href={`/work-orders/${exp.work_order_id}`} className="text-brand-600 hover:underline ml-2">
                                                        View Work Order
                                                    </Link>
                                                )}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {history.projects?.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Projects ({history.projects.length})</h3>
                                <div className="space-y-2">
                                    {history.projects.map(proj => (
                                        <Link key={proj.id} href={`/projects/${proj.id}`} className="block p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-900">{proj.name}</span>
                                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${proj.status === 'active' ? 'bg-brand-50 text-brand-700' : 'bg-green-100 text-green-700'}`}>
                                                    {proj.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">{proj.creator?.name} · {new Date(proj.start_date).toLocaleDateString()} - {new Date(proj.end_date).toLocaleDateString()}</p>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {history.daily_logs?.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Daily Logs ({history.daily_logs.length})</h3>
                                <div className="space-y-2">
                                    {history.daily_logs.map((log, i) => (
                                        <div key={i} className="p-3 rounded-xl border border-gray-100">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-500">{log.technician?.name} · {new Date(log.log_date).toLocaleDateString()}</span>
                                                <span className="text-sm text-gray-700">{log.hours_worked}h</span>
                                            </div>
                                            <p className="text-sm text-gray-900 mt-1">{log.activities}</p>
                                            {log.issues_found && <p className="text-xs text-red-600 mt-0.5">Issue: {log.issues_found}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {history.maintenance_schedules?.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Maintenance Schedules ({history.maintenance_schedules.length})</h3>
                                <div className="space-y-2">
                                    {history.maintenance_schedules.map(ms => (
                                        <div key={ms.id} className="p-3 rounded-xl border border-gray-100 text-sm">
                                            <p>{({ daily:'Daily', weekly:'Weekly', monthly:'Monthly', quarterly:'Quarterly', 'bi-annual':'Bi-Annual', annual:'Annual', fixed_days:`Every ${ms.frequency_value} days`, calendar:`Every ${ms.frequency_value} month(s)`, usage:`Every ${ms.frequency_value} units` })[ms.frequency_type] ?? ms.frequency_type}</p>
                                            <p className="text-xs text-gray-500">Next due: {new Date(ms.next_due_date).toLocaleDateString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!history.work_orders?.length && !history.daily_logs?.length && !history.maintenance_schedules?.length && !history.expenses?.length && !history.projects?.length && (
                            <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">No history found for this asset.</div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">Failed to load history.</div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
