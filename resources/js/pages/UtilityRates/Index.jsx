import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

const typeLabels = {
    electricity: 'Electricity',
    gas: 'Gas',
    water: 'Water',
    waste: 'Waste',
    fuel: 'Fuel',
};

const typeIcons = {
    electricity: '⚡',
    gas: '🔥',
    water: '💧',
    waste: '🗑️',
    fuel: '⛽',
};

const typeOrder = ['electricity', 'gas', 'water', 'waste', 'fuel'];

export default function Index({ auth, rates }) {
    const formatCurrency = (val) => {
        if (val === null || val === undefined) return '—';
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
    };

    const handleDelete = (rate) => {
        if (!confirm(`Delete this rate?`)) return;
        router.delete(`/utility-rates/${rate.id}`);
    };

    const grouped = typeOrder.map(type => ({
        type,
        label: typeLabels[type],
        icon: typeIcons[type],
        items: rates.filter(r => r.type === type),
    })).filter(g => g.items.length > 0);

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Utility Rates" />
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Utility Rates</h2>
                    <Link href="/utility-rates/create" className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">New Rate</Link>
                </div>

                {rates.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">No utility rates configured. Add rates to auto-calculate cost when recording usage.</div>
                ) : (
                    <div className="space-y-6">
                        {grouped.map((group) => (
                            <div key={group.type}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">{group.icon}</span>
                                    <h3 className="text-sm font-semibold text-gray-700">{group.label}</h3>
                                </div>
                                <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.04 } } }} className="space-y-2">
                                    {group.items.map((rate) => (
                                        <motion.div key={rate.id} variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }} className={`bg-white rounded-2xl shadow-sm p-3 pl-9 ${!rate.is_active ? 'opacity-50' : ''}`}>
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium text-gray-900">{formatCurrency(rate.cost_per_unit)} / {rate.unit}</p>
                                                        {!rate.is_active && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>}
                                                    </div>
                                                    {rate.start_date && <p className="text-xs text-gray-400 mt-0.5">{new Date(rate.start_date).toLocaleDateString()} – {rate.end_date ? new Date(rate.end_date).toLocaleDateString() : 'Forever'}</p>}
                                                    {rate.notes && <p className="text-xs text-gray-500 mt-0.5">{rate.notes}</p>}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Link href={`/utility-rates/${rate.id}/edit`} className="text-xs text-brand-600 hover:text-brand-700">Edit</Link>
                                                    <button onClick={() => handleDelete(rate)} className="text-xs text-red-600 hover:text-red-700">Delete</button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
