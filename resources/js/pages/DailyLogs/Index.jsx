import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

export default function Index({ auth, logs, technicians, filters }) {
    const role = auth.user.roles?.[0] ?? 'employee';

    const [filterTech, setFilterTech] = useState(filters?.technician_id ?? '');
    const [filterFrom, setFilterFrom] = useState(filters?.date_from ?? '');
    const [filterTo, setFilterTo] = useState(filters?.date_to ?? '');

    const applyFilters = () => {
        router.get('/daily-logs', { technician_id: filterTech, date_from: filterFrom, date_to: filterTo }, { preserveState: true });
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Daily Logs" />
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Daily Logs</h2>
                    {role === 'technician' && (
                        <Link href="/daily-logs/create" className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">New Log</Link>
                    )}
                </div>

                {(role === 'eng-admin' || role === 'chief-engineer') && (
                    <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap gap-3 items-end">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Technician</label>
                            <select value={filterTech} onChange={e => setFilterTech(e.target.value)} className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm">
                                <option value="">All</option>
                                {technicians?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">From</label>
                            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">To</label>
                            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm" />
                        </div>
                        <button onClick={applyFilters} className="bg-gray-100 text-gray-700 rounded-xl px-4 py-1.5 text-sm hover:bg-brand-50">Filter</button>
                    </div>
                )}

                {logs.data.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">No daily logs found.</div>
                ) : (
                    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.04 } } }} className="space-y-3">
                        {logs.data.map((log) => (
                            <motion.div key={log.id} variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }} className="bg-white rounded-2xl shadow-sm p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">{log.technician?.name} · {new Date(log.log_date).toLocaleDateString()}</p>
                                        <p className="text-sm text-gray-900 mt-1">{log.activities}</p>
                                        {log.issues_found && <p className="text-sm text-red-600 mt-1">Issue: {log.issues_found}</p>}
                                    </div>
                                    <div className="text-right text-sm">
                                        <p className="text-gray-700 font-medium">{log.hours_worked}h</p>
                                        {log.work_order && <p className="text-xs text-gray-400 mt-1">{log.work_order.title}</p>}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
