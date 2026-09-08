import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import PostAccountPicker from '../../components/PostAccountPicker';
import SearchPicker from '../../components/SearchPicker';

export default function Edit({ auth, expense, postAccounts, workOrders, projects, schedules }) {
    const { data, setData, put, processing, errors } = useForm({
        expense_date: expense.expense_date,
        post_account: expense.post_account ?? '',
        amount: expense.amount,
        description: expense.description ?? '',
        document_ref: expense.document_ref ?? '',
        status: expense.status ?? 'actual',
        work_order_id: expense.work_order_id ?? '',
        project_id: expense.project_id ?? '',
        maintenance_schedule_id: expense.maintenance_schedule_id ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        put(`/expenses/${expense.id}`);
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Edit Expense" />
            <div className="max-w-lg mx-auto">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Expense</h2>
                <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    {Object.values(errors).length > 0 && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{Object.values(errors)[0]}</div>}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input type="date" value={data.expense_date} onChange={e => setData('expense_date', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                    </div>

                    <PostAccountPicker accounts={postAccounts} value={data.post_account} onChange={v => setData('post_account', v)} />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                        <input type="number" min="0" step="0.01" value={data.amount} onChange={e => setData('amount', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Document Ref (optional)</label>
                        <input type="text" value={data.document_ref} onChange={e => setData('document_ref', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" placeholder="e.g. INV-001, PO-12345" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <div className="flex gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="status" value="actual" checked={data.status === 'actual'} onChange={e => setData('status', e.target.value)} className="accent-blue-600" />
                                <span className="text-sm text-gray-700">Actual</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="status" value="accrue" checked={data.status === 'accrue'} onChange={e => setData('status', e.target.value)} className="accent-blue-600" />
                                <span className="text-sm text-gray-700">Accrue</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Linked To</label>
                        <div className="space-y-2">
                            <SearchPicker type="work_order" items={workOrders} value={data.work_order_id} onChange={v => setData('work_order_id', v)} />
                            <SearchPicker type="project" items={projects} value={data.project_id} onChange={v => setData('project_id', v)} />
                            <SearchPicker type="schedule" items={schedules} value={data.maintenance_schedule_id} onChange={v => setData('maintenance_schedule_id', v)} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                        <textarea value={data.description} onChange={e => setData('description', e.target.value)} rows={3} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" />
                    </div>

                    <button type="submit" disabled={processing} className="w-full bg-brand-400 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                        {processing ? 'Saving...' : 'Update Expense'}
                    </button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
