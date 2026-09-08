import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

export default function Edit({ auth, budget, years, postAccounts }) {
    const { data, setData, put, processing, errors } = useForm({
        year: budget.year,
        month: budget.month,
        post_account: budget.post_account ?? '',
        amount: budget.amount ?? '',
        notes: budget.notes ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        put(`/budgets/${budget.id}`);
    };

    const handleDelete = () => {
        if (confirm('Delete this budget?')) {
            router.delete(`/budgets/${budget.id}`);
        }
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Edit Budget" />
            <div className="max-w-lg mx-auto">
                <div className="flex items-center gap-3 mb-4">
                    <Link href="/budgets" className="text-gray-500 hover:text-gray-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </Link>
                    <h2 className="text-xl font-semibold text-gray-900">Edit Budget</h2>
                </div>
                <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    {Object.keys(errors).length > 0 && (
                        <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">
                            {Object.values(errors).map((err, i) => <p key={i}>{err}</p>)}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                            <select value={data.year} onChange={e => setData('year', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                            <select value={data.month} onChange={e => setData('month', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Post Account (optional)</label>
                        <select value={data.post_account} onChange={e => setData('post_account', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                            <option value="">— Select —</option>
                            {postAccounts.map(a => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Budget Amount (IDR)</label>
                        <input type="number" step="1000" min="0" value={data.amount} onChange={e => setData('amount', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" placeholder="0" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                        <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows={2} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" placeholder="Any notes about this budget" />
                    </div>

                    <div className="flex gap-2">
                        <button type="submit" disabled={processing} className="flex-1 bg-brand-400 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                            {processing ? 'Saving...' : 'Update Budget'}
                        </button>
                        <button type="button" onClick={handleDelete} className="bg-red-50 text-red-600 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-red-100">Delete</button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
