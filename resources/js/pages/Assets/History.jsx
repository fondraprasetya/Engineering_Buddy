import { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { useLang } from '../../i18n';

export default function History({ auth, asset }) {
    const { lang, t } = useLang();
    const locale = lang === 'id' ? 'id-ID' : 'en-US';
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

    const freqLabel = (ms) =>
        ({ daily: t('ms.freq_daily'), weekly: t('ms.freq_weekly'), monthly: t('ms.freq_monthly'), quarterly: t('ms.freq_quarterly'), 'bi-annual': t('ms.freq_biannual'), annual: t('ms.freq_annual'), fixed_days: `${t('ms.every_prefix')} ${ms.frequency_value} ${t('ms.every_days')}`, calendar: `${t('ms.every_prefix')} ${ms.frequency_value} ${t('ms.every_months')}`, usage: `${t('ms.every_prefix')} ${ms.frequency_value} ${t('ms.every_units')}` })[ms.frequency_type] ?? ms.frequency_type;

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title={`${asset.name} - ${t('asset.history')}`} />
            <div className="space-y-4">
                <Link href={`/assets/${asset.id}`} className="text-sm text-brand-600 hover:text-brand-700">&larr; {t('asset.back_one')}</Link>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900">{asset.name} — {t('asset.full_history')}</h2>
                    <p className="text-sm text-gray-500 mt-1">{asset.code} · {asset.category}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap gap-3 items-end">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">{t('common.from')}</label>
                        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); }} className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">{t('common.to')}</label>
                        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); }} className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm" />
                    </div>
                    <button onClick={fetchHistory} className="bg-brand-400 text-white rounded-xl px-4 py-1.5 text-sm hover:bg-brand-600">{t('asset.filter')}</button>
                </div>

                {loading ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">{t('asset.loading')}</div>
                ) : history ? (
                    <div className="space-y-4">
                        {history.work_orders?.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">{t('asset.wo_title')} ({history.work_orders.length})</h3>
                                <div className="space-y-2">
                                    {history.work_orders.map(wo => (
                                        <Link key={wo.id} href={`/work-orders/${wo.id}`} className="block p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-900">{wo.title}</span>
                                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[wo.status]}`}>
                                                    {t('st.' + wo.status)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">{wo.requester?.name} · {new Date(wo.created_at).toLocaleDateString(locale)}</p>
                                            {wo.checklist_responses?.length > 0 && (
                                                <div className="mt-2 text-xs text-gray-400">
                                                    {wo.checklist_responses.length} {t('asset.checklist_resp')}
                                                </div>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {history.expenses?.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">{t('asset.expenses')} ({history.expenses.length})</h3>
                                <div className="space-y-2">
                                    {history.expenses.map((exp, i) => (
                                        <div key={i} className="p-3 rounded-xl border border-gray-100">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-900">{exp.description || t('asset.no_desc')}</span>
                                                <span className="text-sm font-semibold text-red-600">Rp {Number(exp.amount).toLocaleString()}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {exp.post_account} · {new Date(exp.expense_date).toLocaleDateString(locale)}
                                                {exp.work_order_id && (
                                                    <Link href={`/work-orders/${exp.work_order_id}`} className="text-brand-600 hover:underline ml-2">
                                                        {t('asset.view_wo')}
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
                                <h3 className="font-semibold text-gray-900 mb-3">{t('asset.projects')} ({history.projects.length})</h3>
                                <div className="space-y-2">
                                    {history.projects.map(proj => (
                                        <Link key={proj.id} href={`/projects/${proj.id}`} className="block p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-900">{proj.name}</span>
                                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${proj.status === 'active' ? 'bg-brand-50 text-brand-700' : 'bg-green-100 text-green-700'}`}>
                                                    {proj.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">{proj.creator?.name} · {new Date(proj.start_date).toLocaleDateString(locale)} - {new Date(proj.end_date).toLocaleDateString(locale)}</p>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {history.daily_logs?.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">{t('asset.daily_logs')} ({history.daily_logs.length})</h3>
                                <div className="space-y-2">
                                    {history.daily_logs.map((log, i) => (
                                        <div key={i} className="p-3 rounded-xl border border-gray-100">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-500">{log.technician?.name} · {new Date(log.log_date).toLocaleDateString(locale)}</span>
                                                <span className="text-sm text-gray-700">{log.hours_worked}h</span>
                                            </div>
                                            <p className="text-sm text-gray-900 mt-1">{log.activities}</p>
                                            {log.issues_found && <p className="text-xs text-red-600 mt-0.5">{t('asset.issue')}: {log.issues_found}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {history.maintenance_schedules?.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">{t('asset.maint_sched')} ({history.maintenance_schedules.length})</h3>
                                <div className="space-y-2">
                                    {history.maintenance_schedules.map(ms => (
                                        <div key={ms.id} className="p-3 rounded-xl border border-gray-100 text-sm">
                                            <p>{freqLabel(ms)}</p>
                                            <p className="text-xs text-gray-500">{t('asset.next_due')}: {new Date(ms.next_due_date).toLocaleDateString(locale)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!history.work_orders?.length && !history.daily_logs?.length && !history.maintenance_schedules?.length && !history.expenses?.length && !history.projects?.length && (
                            <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">{t('asset.no_history')}</div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">{t('asset.load_fail')}</div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
