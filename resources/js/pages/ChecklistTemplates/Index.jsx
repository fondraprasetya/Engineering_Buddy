import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, Copy } from 'lucide-react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

export default function Index({ auth, templates }) {
    const handleDelete = (t) => {
        if (confirm(`Delete "${t.name}"? This cannot be undone.`)) {
            router.delete(`/checklist-templates/${t.id}`);
        }
    };

    const handleDuplicate = (t) => {
        if (confirm(`Copy "${t.name}" to a new template?`)) {
            router.post(`/checklist-templates/${t.id}/duplicate`);
        }
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Checklist Templates" />
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Checklist Templates</h2>
                    <Link href="/checklist-templates/create" className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">New Template</Link>
                </div>

                {templates.data.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">No templates found.</div>
                ) : (
                    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.04 } } }} className="space-y-3">
                        {templates.data.map((t) => (
                            <motion.div key={t.id} variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}>
                                <div className="bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between gap-4">
                                        <Link href={`/checklist-templates/${t.id}`} className="flex-1 min-w-0">
                                            <h3 className="font-medium text-gray-900">{t.name}</h3>
                                            <p className="text-sm text-gray-500 mt-0.5">{t.fields?.length ?? 0} fields{t.asset_category ? ` · ${t.asset_category}` : ''}</p>
                                        </Link>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Link href={`/checklist-templates/${t.id}/edit`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 bg-brand-50 rounded-xl px-3 py-1.5 hover:bg-brand-100 hover:text-brand-800">
                                                <Pencil size={14} />
                                                Edit
                                            </Link>
                                            <button onClick={() => handleDuplicate(t)} className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl px-3 py-1.5 hover:bg-gray-200 hover:text-gray-800">
                                                <Copy size={14} />
                                                Copy
                                            </button>
                                            <button onClick={() => handleDelete(t)} className="inline-flex items-center gap-1 text-sm font-medium text-red-600 bg-red-50 rounded-xl px-3 py-1.5 hover:bg-red-100 hover:text-red-800">
                                                <Trash2 size={14} />
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
