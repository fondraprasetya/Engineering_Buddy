import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, Copy } from 'lucide-react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { useLang } from '../../i18n';

export default function Index({ auth, templates }) {
    const { t } = useLang();
    const handleDelete = (tpl) => {
        if (confirm(t('cl.delete_confirm'))) {
            router.delete(`/checklist-templates/${tpl.id}`);
        }
    };

    const handleDuplicate = (tpl) => {
        if (confirm(t('cl.copy_confirm'))) {
            router.post(`/checklist-templates/${tpl.id}/duplicate`);
        }
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title={t('cl.title')} />
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">{t('cl.title')}</h2>
                    <Link href="/checklist-templates/create" className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">{t('cl.new')}</Link>
                </div>

                {templates.data.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">{t('cl.empty')}</div>
                ) : (
                    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.04 } } }} className="space-y-3">
                        {templates.data.map((tpl) => (
                            <motion.div key={tpl.id} variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}>
                                <div className="bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between gap-4">
                                        <Link href={`/checklist-templates/${tpl.id}`} className="flex-1 min-w-0">
                                            <h3 className="font-medium text-gray-900">{tpl.name}</h3>
                                            <p className="text-sm text-gray-500 mt-0.5">{tpl.fields?.length ?? 0} {t('cl.fields_w')}{tpl.asset_category ? ` · ${tpl.asset_category}` : ''}</p>
                                        </Link>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Link href={`/checklist-templates/${tpl.id}/edit`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 bg-brand-50 rounded-xl px-3 py-1.5 hover:bg-brand-100 hover:text-brand-800">
                                                <Pencil size={14} />
                                                {t('cl.edit')}
                                            </Link>
                                            <button onClick={() => handleDuplicate(tpl)} className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl px-3 py-1.5 hover:bg-gray-200 hover:text-gray-800">
                                                <Copy size={14} />
                                                {t('cl.copy')}
                                            </button>
                                            <button onClick={() => handleDelete(tpl)} className="inline-flex items-center gap-1 text-sm font-medium text-red-600 bg-red-50 rounded-xl px-3 py-1.5 hover:bg-red-100 hover:text-red-800">
                                                <Trash2 size={14} />
                                                {t('cl.delete')}
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
