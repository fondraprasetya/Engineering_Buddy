import { Head, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

export default function Index({ auth, assets }) {
    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Assets" />
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Assets</h2>
                    <Link href="/assets/create" className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">New Asset</Link>
                </div>

                {assets.data.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">No assets found.</div>
                ) : (
                    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.04 } } }} className="space-y-3">
                        {assets.data.map((asset) => (
                            <motion.div key={asset.id} variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}>
                                <Link href={`/assets/${asset.id}`} className="block bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-medium text-gray-900">{asset.name}</h3>
                                            <p className="text-sm text-gray-500 mt-0.5">{asset.code} · {asset.category}{asset.location ? ` · ${asset.location.name}` : ''}{asset.acquisition_cost ? ` · Rp ${Number(asset.acquisition_cost).toLocaleString('id-ID')}` : ''}</p>
                                        </div>
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${asset.status === 'active' ? 'bg-green-100 text-green-700' : asset.status === 'under_maintenance' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {asset.status?.replace('_', ' ') ?? 'active'}
                                        </span>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
