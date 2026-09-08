import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

function fmt(v) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v ?? 0);
}

const statusColors = {
    actual: { bg: 'bg-green-50', text: 'text-green-700' },
    accrue: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
};

export default function Index({ auth, expenses, totalAmount, months, filterMonth }) {
    const [showDelete, setShowDelete] = useState(null);

    const handleDelete = (id) => {
        router.delete(`/expenses/${id}`, {
            onSuccess: () => setShowDelete(null),
        });
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Actual Expenses" />
            <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Actual Expenses</h2>
                        <p className="text-sm text-gray-500">Total: {fmt(totalAmount)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <select value={filterMonth ?? ''} onChange={e => { router.get('/expenses', { month: e.target.value }, { preserveState: true }); }} className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm">
                            <option value="">All Months</option>
                            {months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <Link href="/expenses/create" className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">Record Expense</Link>
                    </div>
                </div>

                {expenses.data.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">No expenses recorded yet.</div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
                        {expenses.data.map(e => {
                            const link = e.work_order
                                ? { label: `WO: ${e.work_order.title}`, href: `/work-orders/${e.work_order.id}` }
                                : e.project
                                    ? { label: `Project: ${e.project.name}`, href: `/projects/${e.project.id}` }
                                    : e.maintenance_schedule
                                        ? { label: 'Schedule', href: null }
                                        : null;
                            return (
                                <div key={e.id} className="p-4 flex items-center justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-medium text-gray-900">{fmt(e.amount)}</p>
                                            {e.post_account && <span className="text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">{e.post_account}</span>}
                                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColors[e.status]?.bg ?? 'bg-gray-50'} ${statusColors[e.status]?.text ?? 'text-gray-600'}`}>
                                                {e.status}
                                            </span>
                                        </div>
                                        {e.document_ref && <p className="text-xs text-gray-500 mt-0.5">Ref: {e.document_ref}</p>}
                                        {e.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{e.description}</p>}
                                        {link && (
                                            <p className="text-xs mt-0.5">
                                                {link.href
                                                    ? <Link href={link.href} className="text-brand-600 hover:text-brand-800">{link.label}</Link>
                                                    : <span className="text-gray-400">{link.label}</span>
                                                }
                                            </p>
                                        )}
                                        <p className="text-[11px] text-gray-400 mt-0.5">
                                            {new Date(e.expense_date).toLocaleDateString()} · by {e.creator?.name}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-3 shrink-0">
                                        <Link href={`/expenses/${e.id}/edit`} className="text-xs text-brand-600 hover:text-brand-800">Edit</Link>
                                        {showDelete === e.id ? (
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleDelete(e.id)} className="text-xs text-red-600 font-medium hover:text-red-800">Confirm</button>
                                                <button onClick={() => setShowDelete(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setShowDelete(e.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {expenses.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        {Array.from({ length: expenses.last_page }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => router.get('/expenses', { ...{ month: filterMonth }, page }, { preserveState: true })}
                                className={`px-3 py-1 rounded-xl text-sm ${expenses.current_page === page ? 'bg-brand-400 text-white' : 'bg-white text-gray-700 hover:bg-brand-50'}`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
