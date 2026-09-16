import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { useLang } from '../../i18n';

const statusBg = {
    pending: 'bg-yellow-50 text-yellow-700',
    approved: 'bg-blue-50 text-brand-700',
    rejected: 'bg-red-50 text-red-700',
};

export default function Adjustments({ auth, adjustments }) {
    const { t } = useLang();
    return (
        <AuthenticatedLayout auth={auth}>
            <Head title={t('store.adj_page_title')} />
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">{t('store.adj_page_title')}</h2>
                        <p className="text-sm text-gray-500 mt-0.5">{t('store.adj_subtitle')}</p>
                    </div>
                    <Link href="/store" className="border border-gray-300 text-gray-600 rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-50">{t('store.back_store')}</Link>
                </div>

                {adjustments.data.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">{t('store.no_adjustments')}</div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
                        {adjustments.data.map(a => (
                            <div key={a.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-medium text-gray-900"><span className="text-xs text-gray-400 font-normal mr-1.5">ID: #{a.id}</span>{a.item?.name}</p>
                                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${a.qty > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {a.qty > 0 ? '+' : ''}{a.qty} {a.item?.unit}
                                        </span>
                                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusBg[a.status]}`}>
                                            {t('store.st_' + a.status)}
                                        </span>
                                    </div>
                                    {a.reason && <p className="text-xs text-gray-500 mt-0.5">{a.reason}</p>}
                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                        {new Date(a.created_at).toLocaleDateString()} · {t('store.by')} {a.requester?.name ?? t('store.unknown')}
                                        {a.approver && ` · ${a.status === 'approved' ? t('store.approved_by') : t('store.st_rejected') + ' ' + t('store.by')} ${a.approver.name}`}
                                        {a.approved_at && ` · ${new Date(a.approved_at).toLocaleDateString()}`}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {adjustments.last_page > 1 && (
                    <div className="flex justify-center gap-2 mt-3">
                        {Array.from({ length: adjustments.last_page }, (_, i) => i + 1).map(page => (
                            <Link key={page} href={`/store/adjustments?page=${page}`}
                                className={`px-3 py-1 rounded-xl text-sm ${adjustments.current_page === page ? 'bg-brand-400 text-white' : 'bg-white text-gray-700 hover:bg-brand-50 border border-gray-200'}`}>
                                {page}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
