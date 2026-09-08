import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

const categories = ['Furniture', 'Electronic', 'Mechanical', 'Equipment', 'Vehicle', 'HVAC', 'Building'];

export default function Edit({ auth, asset, locationOptions }) {
    const { data, setData, post, processing, errors } = useForm({
        name: asset.name, category: asset.category,
        location_id: asset.location_id ?? '', status: asset.status ?? 'active', photo: null,
        acquisition_cost: asset.acquisition_cost ?? '', acquisition_date: asset.acquisition_date ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(`/assets/${asset.id}`, {
            forceFormData: true,
        });
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title={`Edit ${asset.name}`} />
            <div className="max-w-lg mx-auto">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Asset</h2>
                <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    {Object.values(errors).length > 0 && (
                        <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{Object.values(errors)[0]}</div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                        <input type="text" value={asset.code} readOnly className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select value={data.category} onChange={e => setData('category', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required>
                            <option value="">Select category</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <select value={data.location_id} onChange={e => setData('location_id', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                            <option value="">Select location</option>
                            {locationOptions?.map(l => (
                                <option key={l.id} value={l.id}>{l.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select value={data.status} onChange={e => setData('status', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="under_maintenance">Under Maintenance</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Acquisition Cost (Rp)</label>
                        <input type="number" step="0.01" min="0" value={data.acquisition_cost} onChange={e => setData('acquisition_cost', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Acquisition Date</label>
                        <input type="date" value={data.acquisition_date} onChange={e => setData('acquisition_date', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                        {asset.photo && (
                            <img src={`/storage/${asset.photo}`} alt={asset.name} className="w-32 h-32 object-cover rounded-xl mb-2" />
                        )}
                        <input type="file" accept="image/*" onChange={e => setData('photo', e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-brand-700 hover:file:bg-brand-50" />
                    </div>
                    <button type="submit" disabled={processing} className="w-full bg-brand-400 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                        {processing ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
