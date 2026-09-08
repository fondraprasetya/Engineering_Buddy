import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../../layouts/AuthenticatedLayout';

export default function Create({ auth, items, workOrders }) {
    const { data, setData, post, processing, errors } = useForm({
        item_id: '', qty_requested: '', work_order_id: '',
        request_date: new Date().toISOString().slice(0, 10), notes: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/store/requests');
    };

    const selectedItem = items.find(i => i.id == data.item_id);

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="New Store Request" />
            <div className="max-w-lg mx-auto">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">New Store Request</h2>
                <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    {errors.item_id && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{errors.item_id}</div>}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
                        <select value={data.item_id} onChange={e => setData('item_id', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required>
                            <option value="">Select item...</option>
                            {items.map(i => (
                                <option key={i.id} value={i.id}>{i.name} ({i.stock} {i.unit} available)</option>
                            ))}
                        </select>
                        {selectedItem && (
                            <p className="text-xs text-gray-400 mt-1">Available: {selectedItem.stock} {selectedItem.unit}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Qty Requested</label>
                        <input type="number" min="1" value={data.qty_requested} onChange={e => setData('qty_requested', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Linked to Work Order (optional)</label>
                        <select value={data.work_order_id} onChange={e => setData('work_order_id', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                            <option value="">No work order</option>
                            {workOrders.map(wo => (
                                <option key={wo.id} value={wo.id}>{wo.title}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Request Date</label>
                        <input type="date" value={data.request_date} onChange={e => setData('request_date', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                        <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows={2}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" placeholder="Why do you need this item?" />
                    </div>

                    <button type="submit" disabled={processing}
                        className="w-full bg-brand-400 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                        {processing ? 'Submitting...' : 'Submit Request'}
                    </button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
