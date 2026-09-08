import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

const typeLabels = { building: 'Building', area: 'Area', room: 'Room' };

const parentType = { building: null, area: 'building', room: 'area' };

export default function Edit({ auth, location, buildings, areas }) {
    const { data, setData, post, processing, errors } = useForm({
        name: location.name,
        type: location.type,
        parent_id: location.parent_id ?? '',
        description: location.description ?? '',
        floor_number: location.floor_number ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(`/locations/${location.id}`);
    };

    const pt = parentType[data.type];
    const parentOptions = pt === 'building' ? buildings : pt === 'area' ? areas : null;

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title={`Edit ${location.name}`} />
            <div className="max-w-lg mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Edit Location</h2>
                    <Link href="/locations" className="text-sm text-brand-600 hover:text-brand-700 font-medium">Back</Link>
                </div>
                <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    {Object.values(errors).length > 0 && (
                        <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{Object.values(errors)[0]}</div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select value={data.type} onChange={e => { setData('type', e.target.value); setData('parent_id', ''); }} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                            {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                    </div>

                    {pt && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{typeLabels[pt]}</label>
                            <select value={data.parent_id} onChange={e => setData('parent_id', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required>
                                <option value="">Select {typeLabels[pt].toLowerCase()}</option>
                                {parentOptions?.map(p => <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ''}</option>)}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                        <input type="text" value={location.code ?? ''} readOnly className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                        <textarea value={data.description} onChange={e => setData('description', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" rows={3} />
                    </div>

                    {data.type === 'room' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Floor Number <span className="text-red-500">*</span></label>
                            <input type="text" value={data.floor_number} onChange={e => setData('floor_number', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required placeholder="e.g. 1st, 2nd, Ground" />
                        </div>
                    )}

                    <button type="submit" disabled={processing} className="w-full bg-brand-400 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                        {processing ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
