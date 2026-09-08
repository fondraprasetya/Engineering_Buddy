import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

const statuses = [
    'draft', 'pending_dept_head', 'pending_chief_engineer', 'rejected', 'approved',
    'assigned', 'in_progress', 'pending_check', 'completed', 'pending_close', 'closed',
];

const priorities = ['low', 'medium', 'high', 'urgent'];

const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    pending_dept_head: 'bg-yellow-100 text-yellow-700',
    pending_chief_engineer: 'bg-orange-100 text-orange-700',
    rejected: 'bg-red-100 text-red-700',
    approved: 'bg-brand-50 text-brand-700',
    assigned: 'bg-purple-100 text-purple-700',
    in_progress: 'bg-cyan-100 text-cyan-700',
    pending_check: 'bg-rose-100 text-rose-700',
    completed: 'bg-green-100 text-green-700',
    pending_close: 'bg-indigo-100 text-indigo-700',
    closed: 'bg-gray-200 text-gray-600',
};

export default function Index({ auth, workOrders, filters }) {
    const role = auth.user.roles?.[0] ?? 'employee';
    const [status, setStatus] = useState(filters?.status ?? '');
    const [priority, setPriority] = useState(filters?.priority ?? '');
    const [dateFrom, setDateFrom] = useState(filters?.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters?.date_to ?? '');

    const applyFilters = () => {
        router.get('/work-orders', { status, priority, date_from: dateFrom, date_to: dateTo }, { preserveState: true, replace: true });
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Work Orders" />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Work Orders</h2>
                    {role !== 'gm' && (
                        <Link
                            href="/work-orders/create"
                            className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600"
                        >
                            New Work Order
                        </Link>
                    )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-3 flex items-end gap-2 flex-wrap">
                    <div className="min-w-[140px] flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-400">
                            <option value="">All Statuses</option>
                            {statuses.map(s => (
                                <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                            ))}
                        </select>
                    </div>
                    <div className="min-w-[120px] flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                        <select value={priority} onChange={e => setPriority(e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-400">
                            <option value="">All Priorities</option>
                            {priorities.map(p => (
                                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="min-w-[130px] flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-400" />
                    </div>
                    <div className="min-w-[130px] flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-400" />
                    </div>
                    <button onClick={applyFilters}
                        className="bg-brand-400 text-white rounded-xl px-4 py-1.5 text-sm font-medium hover:bg-brand-600 shrink-0">Filter</button>
                </div>

                {workOrders.data.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
                        No work orders found.
                    </div>
                ) : (
                    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.04 } } }} className="space-y-3">
                        {workOrders.data.map((wo) => (
                            <motion.div key={wo.id} variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}>
                                <Link
                                    href={`/work-orders/${wo.id}`}
                                    className="block bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-gray-900 truncate"><span className="text-gray-400 font-normal">#{wo.id}</span> {wo.title}</h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {wo.requester?.name} · {wo.priority}
                                            </p>
                                            {wo.asset && (
                                                <p className="text-sm text-gray-400 mt-0.5">{wo.asset.name}</p>
                                            )}
                                            {(wo.status === 'completed' || wo.status === 'closed') && (
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Completed {new Date(wo.completed_at ?? wo.updated_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </p>
                                            )}
                                        </div>
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full ml-3 ${statusColors[wo.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                            {wo.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                        </span>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {workOrders.meta && workOrders.meta.last_page > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                        {workOrders.meta.links?.filter(l => l.url).map((link, i) => (
                            <Link
                                key={i}
                                href={link.url}
                                className={`px-3 py-1 text-sm rounded-xl ${link.active ? 'bg-brand-400 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
