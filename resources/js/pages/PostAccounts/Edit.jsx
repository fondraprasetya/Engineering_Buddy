import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

export default function Edit({ auth, account }) {
    const { data, setData, put, processing, errors } = useForm({
        code: account.code,
        name: account.name,
        description: account.description ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        put(`/post-accounts/${account.id}`);
    };

    const handleDelete = () => {
        if (confirm('Delete this post account?')) {
            router.delete(`/post-accounts/${account.id}`);
        }
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Edit Post Account" />
            <div className="max-w-lg mx-auto">
                <div className="flex items-center gap-3 mb-4">
                    <Link href="/post-accounts" className="text-gray-500 hover:text-gray-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </Link>
                    <h2 className="text-xl font-semibold text-gray-900">Edit Post Account</h2>
                </div>
                <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    {Object.keys(errors).length > 0 && (
                        <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">
                            {Object.values(errors).map((err, i) => <p key={i}>{err}</p>)}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Code <span className="text-red-500">*</span></label>
                        <input type="text" maxLength={50} value={data.code} onChange={e => setData('code', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" placeholder="e.g. 5.1.01" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                        <input type="text" maxLength={200} value={data.name} onChange={e => setData('name', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" placeholder="e.g. Electricity & Water" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                        <textarea value={data.description} onChange={e => setData('description', e.target.value)} rows={2} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" placeholder="Optional description" />
                    </div>

                    <div className="flex gap-2">
                        <button type="submit" disabled={processing} className="flex-1 bg-brand-400 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                            {processing ? 'Saving...' : 'Update Account'}
                        </button>
                        <button type="button" onClick={handleDelete} className="bg-red-50 text-red-600 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-red-100">Delete</button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
