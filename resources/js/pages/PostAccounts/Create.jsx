import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

export default function Create({ auth }) {
    const { data, setData, post, processing, errors } = useForm({
        code: '',
        name: '',
        description: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/post-accounts');
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="New Post Account" />
            <div className="max-w-lg mx-auto">
                <div className="flex items-center gap-3 mb-4">
                    <Link href="/post-accounts" className="text-gray-500 hover:text-gray-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </Link>
                    <h2 className="text-xl font-semibold text-gray-900">New Post Account</h2>
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

                    <button type="submit" disabled={processing} className="w-full bg-brand-400 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                        {processing ? 'Saving...' : 'Save Account'}
                    </button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
