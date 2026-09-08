import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

export default function Create({ auth, workOrders }) {
    const { data, setData, post, processing, errors } = useForm({
        log_date: new Date().toISOString().split('T')[0],
        activities: '',
        hours_worked: '',
        issues_found: '',
        work_order_id: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/daily-logs');
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Daily Log" />
            <div className="max-w-lg mx-auto">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Daily Log</h2>
                <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    {errors.log_date && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{errors.log_date}</div>}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input type="date" value={data.log_date} onChange={e => setData('log_date', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Activities Performed</label>
                        <textarea value={data.activities} onChange={e => setData('activities', e.target.value)} rows={4} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" placeholder="Describe what you worked on today..." required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hours Worked</label>
                        <input type="number" step="0.5" min="0.5" max="24" value={data.hours_worked} onChange={e => setData('hours_worked', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Issues Found (optional)</label>
                        <textarea value={data.issues_found} onChange={e => setData('issues_found', e.target.value)} rows={2} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" placeholder="Any issues or observations..." />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Linked Work Order (optional)</label>
                        <select value={data.work_order_id} onChange={e => setData('work_order_id', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                            <option value="">None</option>
                            {workOrders?.map(wo => <option key={wo.id} value={wo.id}>{wo.title}</option>)}
                        </select>
                    </div>

                    <button type="submit" disabled={processing} className="w-full bg-brand-400 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                        {processing ? 'Saving...' : 'Save Log'}
                    </button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
