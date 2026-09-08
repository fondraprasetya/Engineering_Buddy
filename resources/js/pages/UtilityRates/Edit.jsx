import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

const typeOptions = [
    { value: 'electricity', label: 'Electricity', unit: 'kWh' },
    { value: 'gas', label: 'Gas', unit: 'm³' },
    { value: 'water', label: 'Water', unit: 'm³' },
    { value: 'waste', label: 'Waste', unit: 'kg' },
    { value: 'fuel', label: 'Fuel', unit: 'liter' },
];

export default function Edit({ auth, rate }) {
    const { data, setData, put, processing, errors } = useForm({
        type: rate.type,
        cost_per_unit: rate.cost_per_unit,
        unit: rate.unit,
        start_date: rate.start_date ?? '',
        end_date: rate.end_date ?? '',
        notes: rate.notes ?? '',
        is_active: rate.is_active,
    });

    const handleTypeChange = (value) => {
        const opt = typeOptions.find(o => o.value === value);
        setData({ ...data, type: value, unit: opt?.unit ?? '' });
    };

    const submit = (e) => {
        e.preventDefault();
        put(`/utility-rates/${rate.id}`);
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Edit Utility Rate" />
            <div className="max-w-lg mx-auto">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Utility Rate</h2>
                <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    {Object.keys(errors).length > 0 && (
                        <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">
                            {Object.values(errors).map((err, i) => <p key={i}>{err}</p>)}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select value={data.type} onChange={e => handleTypeChange(e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                            {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label} ({o.unit})</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Unit (IDR)</label>
                        <input type="number" step="1" min="0" value={data.cost_per_unit} onChange={e => setData('cost_per_unit', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                        <p className="text-xs text-gray-400 mt-1">Per {data.unit}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input type="date" value={data.start_date} onChange={e => setData('start_date', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input type="date" value={data.end_date} onChange={e => setData('end_date', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 -mt-2">Leave both empty for indefinite rate</p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                        <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows={2} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" />
                    </div>

                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="is_active" checked={data.is_active} onChange={e => setData('is_active', e.target.checked)} className="rounded border-gray-300 text-brand-600 focus:ring-brand-400" />
                        <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
                    </div>

                    <button type="submit" disabled={processing} className="w-full bg-brand-400 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                        {processing ? 'Saving...' : 'Update Rate'}
                    </button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
