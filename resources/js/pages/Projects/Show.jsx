import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

const rp = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

export default function Show({ auth, project }) {
    const role = auth.user.roles?.[0] ?? 'employee';
    const canManage = role === 'eng-admin' || role === 'chief-engineer';
    const initialItems = (project.budget_items ?? []).map(i => ({
        ...i,
        actual_amount: i.actual_amount ?? '',
    }));
    const [budgetItems, setBudgetItems] = useState(initialItems);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const expenses = (project.expenses ?? []).filter(e => e.document_ref !== 'Auto from budget');
    const expenseTotal = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const budgetPlanned = budgetItems.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.amount) || 0), 0);
    const budgetActual = budgetItems.reduce((s, i) => s + (parseFloat(i.actual_amount) || 0), 0);
    const totalActual = budgetActual + expenseTotal;
    const budgetPct = budgetPlanned > 0 ? Math.round((totalActual / budgetPlanned) * 100) : 0;

    const updateActual = (idx, val) => {
        setBudgetItems(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], actual_amount: val };
            return next;
        });
    };

    const updateDescription = (idx, val) => {
        setBudgetItems(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], description: val };
            return next;
        });
    };

    const addUnbudgetedItem = () => {
        setBudgetItems(prev => [...prev, { description: '', qty: 0, amount: 0, actual_amount: '' }]);
    };

    const saveBudget = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/v1/projects/${project.id}/budget-items`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content ?? '' },
                body: JSON.stringify({
                    budget_items: budgetItems.map(i => ({
                        description: i.description,
                        qty: i.qty,
                        amount: i.amount,
                        actual_amount: parseFloat(i.actual_amount) || 0,
                    })),
                }),
            });
            if (res.ok) {
                showToast('Budget saved successfully');
                router.reload();
            }
        } catch {}
        setSaving(false);
    };

    const updateMilestoneStatus = async (milestoneId, status) => {
        try {
            const res = await fetch(`/api/v1/milestones/${milestoneId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content ?? '' },
                body: JSON.stringify({ status }),
            });
            if (res.ok) router.reload();
        } catch {}
    };

    const timelineStart = new Date(project.start_date).getTime();
    const timelineEnd = new Date(project.end_date).getTime();
    const timelineDays = (timelineEnd - timelineStart) / 86400000 || 1;

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title={project.name} />
            <div className="max-w-2xl mx-auto space-y-4">
                {toast && (
                    <div className="bg-green-600 text-white text-sm text-center py-2 px-4 rounded-xl shadow-md">
                        {toast}
                    </div>
                )}
                <Link href="/projects" className="text-sm text-brand-600 hover:text-brand-700">&larr; Back to Projects</Link>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-start justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">{project.name}</h2>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${project.status === 'completed' ? 'bg-green-100 text-green-700' : project.status === 'in_progress' ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-600'}`}>
                            {project.status?.replace('_', ' ') ?? 'planned'}
                        </span>
                    </div>
                    {project.description && <p className="text-sm text-gray-600 mb-4">{project.description}</p>}

                    <div className="text-sm text-gray-500 space-y-1">
                        <p>Created by: {project.creator?.name}</p>
                        {project.asset && <p>Asset: <Link href={`/assets/${project.asset.id}`} className="text-brand-600 hover:underline">{project.asset.name} ({project.asset.code})</Link></p>}
                        <p>Timeline: {new Date(project.start_date).toLocaleDateString()} - {new Date(project.end_date).toLocaleDateString()}</p>
                    </div>

                    <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                        <p className="text-sm font-medium text-gray-700 mb-2">Budget</p>
                        {budgetItems.length > 0 && (
                            <table className="w-full text-xs text-gray-700 mb-3">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-1 font-medium text-gray-500">Item</th>
                                        <th className="text-right py-1 font-medium text-gray-500">Qty</th>
                                        <th className="text-right py-1 font-medium text-gray-500">Unit Price</th>
                                        <th className="text-right py-1 font-medium text-gray-500">Planned</th>
                                        <th className="text-right py-1 font-medium text-gray-500">Actual</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {budgetItems.map((item, i) => {
                                        const sub = (parseFloat(item.qty) || 0) * (parseFloat(item.amount) || 0);
                                        const isUnbudgeted = !parseFloat(item.qty) && !parseFloat(item.amount);
                                        return (
                                            <tr key={i} className={`border-b ${isUnbudgeted ? 'bg-yellow-50 border-dashed' : 'border-gray-100'}`}>
                                                <td className="py-1">
                                                    {isUnbudgeted && canManage ? (
                                                        <input
                                                            type="text"
                                                            value={item.description}
                                                            onChange={e => updateDescription(i, e.target.value)}
                                                            className="w-full border border-gray-300 rounded px-1 py-0.5 text-xs"
                                                            placeholder="Unbudgeted item"
                                                        />
                                                    ) : (
                                                        item.description
                                                    )}
                                                    {isUnbudgeted && <span className="text-[10px] text-yellow-600 ml-1">(unbudgeted)</span>}
                                                </td>
                                                <td className="text-right py-1">{isUnbudgeted ? '—' : item.qty}</td>
                                                <td className="text-right py-1">{isUnbudgeted ? '—' : rp(parseFloat(item.amount) || 0)}</td>
                                                <td className="text-right py-1">{isUnbudgeted ? '—' : rp(sub)}</td>
                                                <td className="text-right py-1">
                                                    {canManage ? (
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.actual_amount}
                                                            onChange={e => updateActual(i, e.target.value)}
                                                            className="w-24 text-right border border-gray-300 rounded px-1 py-0.5 text-xs"
                                                            placeholder="0"
                                                        />
                                                    ) : (
                                                        <span>{item.actual_amount ? rp(parseFloat(item.actual_amount)) : <span className="text-gray-300">—</span>}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {expenses.map(e => (
                                        <tr key={e.id} className="border-b border-gray-100 bg-purple-50">
                                            <td className="py-1">
                                                <span className="text-gray-800">{e.description || 'Expense'}</span>
                                                <span className="text-[10px] text-purple-600 ml-1">(expense)</span>
                                            </td>
                                            <td className="text-right py-1 text-gray-400">—</td>
                                            <td className="text-right py-1 text-gray-400">—</td>
                                            <td className="text-right py-1 text-gray-400">—</td>
                                            <td className="text-right py-1 font-medium text-gray-900">{rp(parseFloat(e.amount))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="font-semibold text-gray-900 border-t-2 border-gray-300">
                                        <td colSpan={3} className="text-right py-1">Total</td>
                                        <td className="text-right py-1">{rp(budgetPlanned)}</td>
                                        <td className="text-right py-1">{rp(totalActual)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        )}

                        <div className="flex items-center justify-between text-sm">
                            <span>
                                Planned: <strong>{rp(budgetPlanned)}</strong> &middot; Actual: <strong className={totalActual > budgetPlanned ? 'text-red-600' : 'text-green-600'}>{rp(totalActual)}</strong>
                            </span>
                            <span>{budgetPct}% used</span>
                        </div>
                        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${budgetPct > 100 ? 'bg-red-500' : budgetPct > 80 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
                        </div>

                        {canManage && (
                            <div className="mt-3 flex gap-2">
                                <button
                                    onClick={addUnbudgetedItem}
                                    className="flex-1 border border-dashed border-gray-400 text-gray-600 rounded-xl py-1.5 text-sm font-medium hover:border-brand-400 hover:text-brand-600"
                                >
                                    + Add Unbudgeted Item
                                </button>
                                <button
                                    onClick={saveBudget}
                                    disabled={saving}
                                    className="flex-1 bg-brand-400 text-white rounded-xl py-1.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : 'Save Budget'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">Timeline ({project.milestones?.length ?? 0} checkpoints)</h3>
                        {canManage && (
                            <Link href={`/projects/${project.id}/timeline`} className="text-xs font-medium text-brand-600 hover:text-brand-700 border border-blue-200 hover:border-blue-300 rounded-xl px-3 py-1.5 transition-colors">
                                Edit Timeline
                            </Link>
                        )}
                    </div>
                    {project.milestones?.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-2 pr-3 font-medium text-gray-500 w-48">Checkpoint</th>
                                        <th className="text-right py-2 pr-3 font-medium text-gray-500 w-20">Date</th>
                                        <th className="text-left py-2 font-medium text-gray-500">Progress</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {project.milestones.map((m, i) => {
                                        const endOffset = Math.min(((new Date(m.due_date).getTime() - timelineStart) / 86400000) / timelineDays * 100, 100);
                                        const pos = Math.max(endOffset, 1);
                                        return (
                                            <tr key={m.id} className="border-b border-gray-50">
                                                <td className="py-2 pr-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full shrink-0 ${m.status === 'completed' ? 'bg-green-500' : m.status === 'in_progress' ? 'bg-brand-400' : 'bg-gray-300'}`} />
                                                        <span className="text-gray-900 font-medium truncate">{m.title}</span>
                                                    </div>
                                                </td>
                                                <td className="py-2 pr-3 text-right text-gray-500 whitespace-nowrap">{new Date(m.due_date).toLocaleDateString()}</td>
                                                <td className="py-2">
                                                    <div className="flex items-center gap-2">
                                                        {m.status === 'completed' ? (
                                                            <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded">
                                                                ✅ Done
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() => updateMilestoneStatus(m.id, 'completed')}
                                                                className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded"
                                                            >
                                                                ✓ Mark as Complete
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                                                        {canManage && (
                                                            <label className="cursor-pointer text-xs flex items-center gap-1 text-gray-500 hover:text-brand-700">
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                                                Add Photo
                                                                <input type="file" accept="image/*" className="hidden" onChange={async e => {
                                                                    const file = e.target.files?.[0];
                                                                    if (!file) return;
                                                                    const fd = new FormData();
                                                                    fd.append('photo', file);
                                                                    try {
                                                                        await fetch(`/api/v1/milestones/${m.id}/photo`, {
                                                                            method: 'POST',
                                                                            headers: { 'Accept': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content ?? '' },
                                                                            body: fd,
                                                                        });
                                                                        router.reload();
                                                                    } catch {}
                                                                }} />
                                                            </label>
                                                        )}
                                                        {m.photo_urls?.map((url, pi) => (
                                                            <a key={pi} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                                                Photo {pi + 1}
                                                            </a>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            <div className="mt-3 pt-3 border-t border-gray-100">
                                <div className="relative h-6">
                                    <div className="absolute top-0 left-0 right-0 flex justify-between text-[10px] text-gray-400">
                                        <span>{new Date(project.start_date).toLocaleDateString()}</span>
                                        <span>{new Date(project.end_date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="absolute top-3 left-0 right-0 h-1 bg-gray-200 rounded-full">
                                        {project.milestones.filter(m => ['completed', 'in_progress'].includes(m.status)).length > 0 && (
                                            <div
                                                className="h-full bg-brand-400 rounded-full"
                                                style={{ width: `${Math.min(project.milestones.filter(m => m.status === 'completed').length / project.milestones.length * 100, 100)}%` }}
                                            />
                                        )}
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">
                                    {project.milestones.filter(m => m.status === 'completed').length}/{project.milestones.length} checkpoints completed
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">No milestones yet.</p>
                    )}
                </div>

                {project.workOrders?.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm p-6">
                        <h3 className="font-semibold text-gray-900 mb-3">Linked Work Orders ({project.workOrders.length})</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-2 font-medium text-gray-500">Work Order</th>
                                        <th className="text-right py-2 font-medium text-gray-500">Status</th>
                                        <th className="text-right py-2 font-medium text-gray-500">Actual Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {project.workOrders.map(wo => (
                                        <tr key={wo.id} className="border-b border-gray-50">
                                            <td className="py-2">
                                                <Link href={`/work-orders/${wo.id}`} className="text-brand-600 hover:text-brand-700 font-medium">{wo.title}</Link>
                                            </td>
                                            <td className="py-2 text-right text-gray-500 capitalize">{wo.status?.replace(/_/g, ' ')}</td>
                                            <td className="py-2 text-right">{wo.actual_cost ? rp(Number(wo.actual_cost)) : <span className="text-gray-300">—</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="font-semibold text-gray-900 border-t border-gray-200">
                                        <td colSpan={2} className="text-right py-2">Total Actual from WOs:</td>
                                        <td className="text-right py-2">{rp(totalActual)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
