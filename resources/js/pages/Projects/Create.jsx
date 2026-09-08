import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

const rp = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

export default function Create({ auth, assets }) {
    const { data, setData, post, processing, errors } = useForm({
        name: '', description: '',
        checkpoints: [{ title: '', due_date: '' }],
        budget_items: [{ description: '', qty: '', amount: '' }],
        asset_id: '',
    });

    const total = data.budget_items.reduce((sum, item) => {
        const qty = parseFloat(item.qty) || 0;
        const amt = parseFloat(item.amount) || 0;
        return sum + qty * amt;
    }, 0);

    const updateItem = (index, field, value) => {
        const items = [...data.budget_items];
        items[index] = { ...items[index], [field]: value };
        setData('budget_items', items);
    };

    const addItem = () => {
        setData('budget_items', [...data.budget_items, { description: '', qty: '', amount: '' }]);
    };

    const removeItem = (index) => {
        if (data.budget_items.length <= 1) return;
        setData('budget_items', data.budget_items.filter((_, i) => i !== index));
    };

    const updateCheckpoint = (index, field, value) => {
        const list = [...data.checkpoints];
        list[index] = { ...list[index], [field]: value };
        setData('checkpoints', list);
    };

    const addCheckpoint = () => {
        setData('checkpoints', [...data.checkpoints, { title: '', due_date: '' }]);
    };

    const removeCheckpoint = (index) => {
        if (data.checkpoints.length <= 1) return;
        setData('checkpoints', data.checkpoints.filter((_, i) => i !== index));
    };

    const submit = (e) => {
        e.preventDefault();
        post('/projects');
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Create Project" />
            <div className="max-w-lg mx-auto">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Project</h2>
                <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    {errors.name && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{errors.name}</div>}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                        <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea value={data.description} onChange={e => setData('description', e.target.value)} rows={3} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Linked Asset (optional)</label>
                        <select value={data.asset_id} onChange={e => setData('asset_id', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                            <option value="">— No asset —</option>
                            {assets?.map(a => (
                                <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">Progress Checkpoints</label>
                            <button type="button" onClick={addCheckpoint} className="text-sm text-brand-600 hover:text-brand-700 font-medium">+ Add Checkpoint</button>
                        </div>
                        {errors['checkpoints'] && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 mb-2">{errors['checkpoints']}</div>}
                        <div className="space-y-2">
                            {data.checkpoints.map((cp, i) => (
                                <div key={i} className="flex gap-2 items-start p-2 rounded-xl border border-gray-200">
                                    <div className="flex-1 min-w-0">
                                        <input
                                            type="text" placeholder="Checkpoint title"
                                            value={cp.title}
                                            onChange={e => updateCheckpoint(i, 'title', e.target.value)}
                                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-400 mb-1"
                                        />
                                        <input
                                            type="date"
                                            value={cp.due_date}
                                            onChange={e => updateCheckpoint(i, 'due_date', e.target.value)}
                                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-400"
                                        />
                                        {errors[`checkpoints.${i}.title`] && <p className="text-xs text-red-500 mt-0.5">{errors[`checkpoints.${i}.title`]}</p>}
                                        {errors[`checkpoints.${i}.due_date`] && <p className="text-xs text-red-500 mt-0.5">{errors[`checkpoints.${i}.due_date`]}</p>}
                                    </div>
                                    <button type="button" onClick={() => removeCheckpoint(i)} className="text-red-400 hover:text-red-600 text-lg leading-none mt-1 shrink-0" disabled={data.checkpoints.length <= 1}>&times;</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">Budget Items</label>
                            <button type="button" onClick={addItem} className="text-sm text-brand-600 hover:text-brand-700 font-medium">+ Add Item</button>
                        </div>
                        {errors['budget_items'] && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 mb-2">{errors['budget_items']}</div>}
                        <div className="space-y-2">
                            {data.budget_items.map((item, i) => (
                                <div key={i} className="flex gap-2 items-start p-2 rounded-xl border border-gray-200">
                                    <div className="flex-1 min-w-0">
                                        <input
                                            type="text" placeholder="Description"
                                            value={item.description}
                                            onChange={e => updateItem(i, 'description', e.target.value)}
                                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-400 mb-1"
                                        />
                                        <div className="flex gap-2">
                                            <input
                                                type="number" min="0" step="1" placeholder="Qty"
                                                value={item.qty}
                                                onChange={e => updateItem(i, 'qty', e.target.value)}
                                                className="w-20 rounded border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-400"
                                            />
                                            <input
                                                type="number" min="0" step="0.01" placeholder="Amount"
                                                value={item.amount}
                                                onChange={e => updateItem(i, 'amount', e.target.value)}
                                                className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-400"
                                            />
                                            <span className="text-sm text-gray-500 self-center whitespace-nowrap w-20 text-right">
                                                {rp((parseFloat(item.qty) || 0) * (parseFloat(item.amount) || 0))}
                                            </span>
                                        </div>
                                        {errors[`budget_items.${i}.description`] && <p className="text-xs text-red-500 mt-0.5">{errors[`budget_items.${i}.description`]}</p>}
                                        {errors[`budget_items.${i}.qty`] && <p className="text-xs text-red-500 mt-0.5">{errors[`budget_items.${i}.qty`]}</p>}
                                        {errors[`budget_items.${i}.amount`] && <p className="text-xs text-red-500 mt-0.5">{errors[`budget_items.${i}.amount`]}</p>}
                                    </div>
                                    <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-lg leading-none mt-1 shrink-0" disabled={data.budget_items.length <= 1}>&times;</button>
                                </div>
                            ))}
                        </div>
                        <div className="text-right text-sm font-semibold text-gray-900 mt-2">
                            Total: {rp(total)}
                        </div>
                    </div>

                    <button type="submit" disabled={processing} className="w-full bg-brand-400 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                        {processing ? 'Creating...' : 'Create Project'}
                    </button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
