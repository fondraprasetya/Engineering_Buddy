import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

export default function Index({ auth, accounts }) {
    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Post Accounts" />
            <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-xl font-semibold text-gray-900">Post Accounts</h2>
                    <Link href="/post-accounts/create" className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">New Account</Link>
                </div>

                {accounts.data.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">No post accounts defined.</div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
                        {accounts.data.map(a => (
                            <div key={a.id} className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">{a.code}</p>
                                    <p className="text-sm text-gray-600">{a.name}</p>
                                    {a.description && <p className="text-xs text-gray-400 mt-0.5">{a.description}</p>}
                                    <p className="text-xs text-gray-400 mt-0.5">by {a.creator?.name}</p>
                                </div>
                                <Link href={`/post-accounts/${a.id}/edit`} className="text-xs text-brand-600 hover:text-brand-800">Edit</Link>
                            </div>
                        ))}
                    </div>
                )}

                {accounts.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        {Array.from({ length: accounts.last_page }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => router.get('/post-accounts', { page }, { preserveState: true })}
                                className={`px-3 py-1 rounded-xl text-sm ${accounts.current_page === page ? 'bg-brand-400 text-white' : 'bg-white text-gray-700 hover:bg-brand-50'}`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
