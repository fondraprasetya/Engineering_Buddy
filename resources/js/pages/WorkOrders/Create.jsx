import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

export default function Create({ auth, assets, projects, locationOptions }) {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        description: '',
        asset_id: '',
        location_id: '',
        priority: 'medium',
        project_id: '',
        actual_cost: '',
        photo: null,
    });

    const [photoPreview, setPhotoPreview] = useState(null);

    const submit = (e) => {
        e.preventDefault();
        post('/work-orders');
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Create Work Order" />

            <div className="max-w-lg mx-auto">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Work Order</h2>

                <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    {errors.title && (
                        <div className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{errors.title}</div>
                    )}

                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                            id="title"
                            type="text"
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            rows={4}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label htmlFor="asset_id" className="block text-sm font-medium text-gray-700 mb-1">Asset (optional)</label>
                        <select
                            id="asset_id"
                            value={data.asset_id}
                            onChange={(e) => setData('asset_id', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                        >
                            <option value="">No asset</option>
                            {assets?.map((asset) => (
                                <option key={asset.id} value={asset.id}>{asset.name} ({asset.code})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="location_id" className="block text-sm font-medium text-gray-700 mb-1">Location (optional)</label>
                        <select
                            id="location_id"
                            value={data.location_id}
                            onChange={(e) => setData('location_id', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                        >
                            <option value="">No location</option>
                            {locationOptions?.map((loc) => (
                                <option key={loc.id} value={loc.id}>{loc.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                        <select
                            id="priority"
                            value={data.priority}
                            onChange={(e) => setData('priority', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 mb-1">Project (optional)</label>
                        <select
                            id="project_id"
                            value={data.project_id}
                            onChange={(e) => setData('project_id', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                        >
                            <option value="">No project</option>
                            {projects?.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="actual_cost" className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost (IDR, optional)</label>
                        <input
                            id="actual_cost"
                            type="number"
                            min="0"
                            step="0.01"
                            value={data.actual_cost}
                            onChange={(e) => setData('actual_cost', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                            placeholder="0"
                        />
                    </div>

                    <div>
                        <span className="block text-sm font-medium text-gray-700 mb-1">Photo (optional)</span>
                        {[
                            { id: 'photo-camera', label: '📷 Take photo', capture: 'environment' },
                            { id: 'photo-file', label: '🖼️ Choose file', capture: undefined },
                        ].map(opt => (
                            <span key={opt.id} className="inline-block mr-2 mb-2">
                                <input
                                    id={opt.id}
                                    type="file"
                                    accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                                    {...(opt.capture ? { capture: opt.capture } : {})}
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        setData('photo', file);
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (ev) => setPhotoPreview(ev.target.result);
                                            reader.readAsDataURL(file);
                                        } else {
                                            setPhotoPreview(null);
                                        }
                                        e.target.value = '';
                                    }}
                                    className="hidden"
                                />
                                <label htmlFor={opt.id} className="inline-block cursor-pointer text-sm font-medium px-4 py-2 rounded-xl bg-blue-50 text-brand-700 hover:bg-brand-50">
                                    {opt.label}
                                </label>
                            </span>
                        ))}
                        {data.photo && <p className="text-xs text-gray-500 truncate">{data.photo.name}</p>}
                        {photoPreview && (
                            <div className="mt-2">
                                <img src={photoPreview} alt="Preview" className="w-32 h-32 object-cover rounded-xl border" />
                                <button type="button" onClick={() => { setData('photo', null); setPhotoPreview(null); }} className="text-xs text-red-600 mt-1 block">Remove</button>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full bg-brand-400 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
                    >
                        {processing ? 'Submitting...' : 'Submit Work Order'}
                    </button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}