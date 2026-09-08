import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

const freqLabel = (s) =>
    ({ daily:'Daily', weekly:'Weekly', monthly:'Monthly', quarterly:'Quarterly', 'bi-annual':'Bi-Annual', annual:'Annual', fixed_days:`Every ${s.frequency_value} days`, calendar:`Every ${s.frequency_value} month(s)`, usage:`Every ${s.frequency_value} units` })[s.frequency_type] ?? s.frequency_type;

function ScheduleCard({ s }) {
    const status = s.status ?? (s.is_active ? (new Date(s.next_due_date) < new Date() ? 'overdue' : 'scheduled') : 'inactive');
    const isComplete = status === 'complete';
    const isOverdue = status === 'overdue';
    const badge = {
        complete: { text: 'Complete', cls: 'bg-green-100 text-green-700' },
        overdue: { text: 'Overdue', cls: 'bg-red-100 text-red-700' },
        inactive: { text: 'Inactive', cls: 'bg-gray-200 text-gray-600' },
        scheduled: { text: 'Scheduled', cls: 'bg-blue-100 text-blue-700' },
    }[status];
    const [assignOpen, setAssignOpen] = useState(false);
    const [technicians, setTechnicians] = useState(null);
    const [loading, setLoading] = useState(false);

    const csrf = () => document.querySelector('meta[name=csrf-token]')?.content ?? '';

    const toggle = () => {
        fetch(`/maintenance-schedules/${s.id}/toggle-active`, {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': csrf() },
        }).then(r => { if (r.ok) router.reload(); });
    };

    const loadAvailable = async () => {
        if (technicians !== null) {
            setAssignOpen(v => !v);
            return;
        }
        setLoading(true);
        setAssignOpen(true);
        try {
            const res = await fetch(`/api/v1/technicians/available?date=${s.next_due_date}&shift=morning`, {
                headers: { 'Accept': 'application/json' },
            });
            setTechnicians(res.ok ? await res.json() : []);
        } catch {
            setTechnicians([]);
        } finally {
            setLoading(false);
        }
    };

    const assign = (technicianId) => {
        fetch(`/maintenance-schedules/${s.id}/assign`, {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': csrf(), 'Accept': 'application/json' },
            body: new URLSearchParams({ technician_id: technicianId }),
        }).then(r => { if (r.ok) router.reload(); });
    };

    return (
        <motion.div
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
        >
            <div className={`bg-white rounded-2xl shadow-sm p-4 ${!s.is_active ? 'opacity-50' : 'hover:shadow-md transition-shadow'}`}>
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                            {s.title || 'Maintenance Schedule'}
                            <span className="text-xs font-normal text-gray-400 ml-1">#{s.id}</span>
                        </p>
                        <p className="text-sm text-gray-500">
                            {freqLabel(s)}
                        </p>
                        <p className="text-sm mt-0.5">
                            Next due: <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}>{new Date(s.next_due_date).toLocaleDateString()}</span>
                            {isComplete && <span className="ml-2 text-xs text-green-600">Linked WO complete</span>}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                        {badge && <span className={`text-xs font-medium px-2 py-1 rounded-full ${badge.cls}`}>{badge.text}</span>}
                        <button onClick={toggle} className={`text-xs font-medium px-2 py-1 rounded-full border ${s.is_active ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50' : 'border-green-300 text-green-700 hover:bg-green-50'}`}>
                            {s.is_active ? 'Inactivate' : 'Activate'}
                        </button>
                        <div className="relative">
                            <button onClick={loadAvailable} className="text-xs font-medium px-2 py-1 rounded-full border border-brand-300 text-brand-700 hover:bg-brand-50">
                                Assign
                            </button>
                            {assignOpen && (
                                <div className="absolute right-0 top-full mt-1 z-10 w-56 bg-white rounded-xl shadow-lg border border-gray-100 p-1.5 max-h-64 overflow-auto">
                                    <p className="text-xs text-gray-500 px-2 py-1">Available {new Date(s.next_due_date).toLocaleDateString()}</p>
                                    {loading ? (
                                        <p className="text-xs text-gray-400 px-2 py-1.5">Loading...</p>
                                    ) : technicians?.length ? (
                                        technicians.map(t => (
                                            <button key={t.id} onClick={() => assign(t.id)} className="w-full text-left text-sm px-2 py-1.5 rounded-lg hover:bg-gray-100">
                                                {t.name}
                                            </button>
                                        ))
                                    ) : (
                                        <p className="text-xs text-gray-400 px-2 py-1.5">No technicians available</p>
                                    )}
                                </div>
                            )}
                        </div>
                        <Link href={`/maintenance-schedules/${s.id}/edit`} className="text-xs font-medium px-2 py-1 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50">
                            Edit
                        </Link>
                    </div>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                    {s.checklistTemplate?.name && <span>Template: {s.checklistTemplate.name}</span>}
                    {s.default_technician && <span className="ml-3">Tech: {s.default_technician.name}</span>}
                    {s.workOrder && <span className="ml-3">Work Order: <a className="text-brand-600 hover:underline" href={`/work-orders/${s.workOrder.id}`}>#{s.workOrder.id}</a></span>}
                </div>
            </div>
        </motion.div>
    );
}

export default function Index({ auth, grouped, overdueCount, inactiveCount, selectedMonth, selectedStatus }) {
    const [month, setMonth] = useState(selectedMonth);
    const [status, setStatus] = useState(selectedStatus);

    const applyFilters = () => {
        router.get('/maintenance-schedules', { month, status }, { preserveState: true, replace: true });
    };

    const entries = Object.entries(grouped ?? {});

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Maintenance Schedules" />
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Maintenance Schedules</h2>
                        <div className="flex gap-3 text-sm mt-1">
                            {overdueCount > 0 && <span className="text-red-600 font-medium">{overdueCount} overdue</span>}
                            {inactiveCount > 0 && <span className="text-gray-400">{inactiveCount} inactive</span>}
                        </div>
                    </div>
                    <Link href="/maintenance-schedules/create" className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">New Schedule</Link>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-4 flex items-end gap-3">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
                        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                            <option value="all">All</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                    <button onClick={applyFilters} className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 shrink-0">Filter</button>
                </div>

                {entries.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">No maintenance schedules found for this period.</div>
                ) : (
                    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.04 } } }} className="space-y-6">
                        {entries.map(([title, scheduleList]) => (
                            <div key={title}>
                                <h3 className="font-semibold text-gray-900 text-base mb-2 flex items-center gap-2">
                                    <Link href={`/maintenance-schedules?asset=${encodeURIComponent(title)}`} className="hover:text-brand-600">{title}</Link>
                                    <span className="text-xs font-normal text-gray-400">({scheduleList.length})</span>
                                </h3>
                                <div className="space-y-2">
                                    {scheduleList.map((s) => (
                                        <ScheduleCard key={s.id} s={s} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
