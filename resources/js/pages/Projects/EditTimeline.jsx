import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

export default function EditTimeline({ auth, project }) {
    const [milestones, setMilestones] = useState(
        (project.milestones ?? []).map(m => ({ id: m.id, title: m.title, due_date: m.due_date?.slice(0, 10) ?? '', status: m.status ?? 'pending' }))
    );
    const [processing, setProcessing] = useState(false);

    const update = (idx, field, value) => {
        setMilestones(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: value };
            return next;
        });
    };

    const add = () => {
        setMilestones(prev => [...prev, { id: null, title: '', due_date: '', status: 'pending' }]);
    };

    const remove = (idx) => {
        setMilestones(prev => prev.filter((_, i) => i !== idx));
    };

    const submit = (e) => {
        e.preventDefault();
        setProcessing(true);
        router.put(`/projects/${project.id}/timeline`, { milestones }, {
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title={`Edit Timeline — ${project.name}`} />
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <Link href={`/projects/${project.id}`} className="text-sm text-brand-600 hover:text-brand-700">&larr; Back to Project</Link>
                        <h2 className="text-xl font-semibold text-gray-900 mt-1">Edit Timeline: {project.name}</h2>
                    </div>
                </div>

                <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    {milestones.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">No checkpoints yet. Add one below.</p>
                    )}

                    {milestones.map((ms, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                            <div className="flex-1 grid grid-cols-2 gap-3">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Checkpoint</label>
                                    <input
                                        type="text"
                                        value={ms.title}
                                        onChange={e => update(i, 'title', e.target.value)}
                                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                                    <input
                                        type="date"
                                        value={ms.due_date}
                                        onChange={e => update(i, 'due_date', e.target.value)}
                                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                                    <select
                                        value={ms.status}
                                        onChange={e => update(i, 'status', e.target.value)}
                                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="completed">Done</option>
                                    </select>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => remove(i)}
                                className="mt-5 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                title="Remove checkpoint"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={add}
                        className="w-full border border-dashed border-gray-400 text-gray-600 rounded-xl py-2 text-sm font-medium hover:border-brand-400 hover:text-brand-600 transition-colors"
                    >
                        + Add Checkpoint
                    </button>

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full bg-brand-400 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
                    >
                        {processing ? 'Saving...' : 'Save Timeline'}
                    </button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
