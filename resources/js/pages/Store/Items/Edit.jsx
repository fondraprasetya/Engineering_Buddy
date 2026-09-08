import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../../layouts/AuthenticatedLayout';

export default function Edit({ auth, item, categories }) {
    const { data, setData, put, processing, errors } = useForm({
        category_id: item.category_id ?? '',
        name: item.name,
        unit: item.unit,
        minimum_stock: item.minimum_stock ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        put(`/store/items/${item.id}`);
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Edit Store Item" />
            <div className="max-w-lg mx-auto">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Item</h2>
                <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    {errors.name && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{errors.name}</div>}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select value={data.category_id} onChange={e => setData('category_id', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                            <option value="">No category</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input type="text" value={data.name} onChange={e => setData('name', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                        <input type="text" value={data.unit} onChange={e => setData('unit', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400"
                            placeholder="e.g. pcs, meter, liter, box, kg, roll" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock</label>
                        <input type="number" min="0" value={data.minimum_stock} onChange={e => setData('minimum_stock', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" />
                    </div>

                    <div className="text-xs text-gray-400">Current stock: {item.stock} {item.unit}</div>

                    <button type="submit" disabled={processing}
                        className="w-full bg-brand-400 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                        {processing ? 'Saving...' : 'Update Item'}
                    </button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
