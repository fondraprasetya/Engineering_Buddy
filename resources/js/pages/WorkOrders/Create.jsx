import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

function SearchSelect({ options, value, onChange, placeholder, inputId }) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const selected = options.find(o => String(o.id) === String(value));

    const q = query.trim().toLowerCase();
    const matches = (options ?? []).filter(o => !q || (o.label ?? '').toLowerCase().includes(q)).slice(0, 50);

    return (
        <div className="relative">
            <div className="flex gap-2">
                <input
                    id={inputId ?? 'search_select'}
                    type="text"
                    value={selected ? selected.label : query}
                    onChange={e => { if (selected) onChange(''); setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    placeholder={selected ? selected.label : (placeholder ?? 'Type to search…')}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                />
                {(selected || query) && (
                    <button
                        type="button"
                        onClick={() => { onChange(''); setQuery(''); }}
                        className="shrink-0 px-3 rounded-xl border border-gray-300 text-gray-500 hover:bg-gray-50 text-sm"
                        title="Clear location"
                    >
                        ✕
                    </button>
                )}
            </div>
            {open && !selected && (
                <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg">
                    {matches.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-gray-400">No locations match “{query}”.</p>
                    ) : (
                        matches.map(o => (
                            <button
                                type="button"
                                key={o.id}
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => { onChange(String(o.id)); setQuery(''); setOpen(false); }}
                                className="block w-full text-left px-3 py-2 text-sm hover:bg-brand-50 text-gray-800"
                            >
                                {o.label}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

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
                        <label htmlFor="asset_search" className="block text-sm font-medium text-gray-700 mb-1">Asset (optional)</label>
                        <SearchSelect
                            inputId="asset_search"
                            placeholder="Type to search asset…"
                            options={(assets ?? []).map(a => ({ id: a.id, label: `${a.name} (${a.code})` }))}
                            value={data.asset_id}
                            onChange={(id) => setData('asset_id', id)}
                        />
                    </div>

                    <div>
                        <label htmlFor="location_search" className="block text-sm font-medium text-gray-700 mb-1">Location (optional)</label>
                        <SearchSelect
                            inputId="location_search"
                            placeholder="Type to search location…"
                            options={locationOptions ?? []}
                            value={data.location_id}
                            onChange={(id) => setData('location_id', id)}
                        />
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
                        <label htmlFor="project_search" className="block text-sm font-medium text-gray-700 mb-1">Project (optional)</label>
                        <SearchSelect
                            inputId="project_search"
                            placeholder="Type to search project…"
                            options={(projects ?? []).map(p => ({ id: p.id, label: p.name }))}
                            value={data.project_id}
                            onChange={(id) => setData('project_id', id)}
                        />
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