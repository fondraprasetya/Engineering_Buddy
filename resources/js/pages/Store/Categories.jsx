import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

export default function Categories({ auth, categories }) {
    const [name, setName] = useState('');
    const [type, setType] = useState('supply');
    const [saving, setSaving] = useState(false);
    const [showDelete, setShowDelete] = useState(null);

    const handleCreate = (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        router.post('/store/categories', { name: name.trim(), type }, {
            onSuccess: () => { setName(''); setSaving(false); },
            onError: () => setSaving(false),
        });
    };

    const handleDelete = (id) => {
        router.delete(`/store/categories/${id}`, {
            onSuccess: () => setShowDelete(null),
        });
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Manage Categories" />
            <div className="max-w-lg mx-auto space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Store Categories</h2>
                    <Link href="/store" className="text-sm text-brand-600 hover:text-brand-800">&larr; Back to Store</Link>
                </div>

                <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-sm p-4 flex gap-2 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">New Category</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400"
                            placeholder="Category name" required />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                        <select value={type} onChange={e => setType(e.target.value)}
                            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                            <option value="supply">Supply</option>
                            <option value="tool">Tool</option>
                        </select>
                    </div>
                    <button type="submit" disabled={saving || !name.trim()}
                        className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 disabled:opacity-50 whitespace-nowrap">
                        {saving ? 'Adding...' : 'Add'}
                    </button>
                </form>

                {categories.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">No categories yet.</div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
                        {categories.map(c => (
                            <div key={c.id} className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                                    <p className="text-xs text-gray-500">
                                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${c.type === 'supply' ? 'bg-blue-50 text-brand-600' : 'bg-orange-50 text-orange-600'}`}>
                                            {c.type}
                                        </span>
                                        {' · '}{c.items_count} item{c.items_count !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                {c.items_count === 0 && (
                                    <div className="flex items-center gap-2">
                                        {showDelete === c.id ? (
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleDelete(c.id)} className="text-xs text-red-600 font-medium hover:text-red-800">Confirm</button>
                                                <button onClick={() => setShowDelete(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setShowDelete(c.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
