import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { useLang } from '../../i18n';

export default function Show({ auth, asset }) {
    const { lang, t } = useLang();
    const locale = lang === 'id' ? 'id-ID' : 'en-US';
    const statusColors = {
        draft: 'bg-gray-100 text-gray-700', pending_dept_head: 'bg-yellow-100 text-yellow-700',
        pending_chief_engineer: 'bg-orange-100 text-orange-700', rejected: 'bg-red-100 text-red-700',
        approved: 'bg-brand-50 text-brand-700', assigned: 'bg-purple-100 text-purple-700',
        in_progress: 'bg-cyan-100 text-cyan-700', pending_close: 'bg-indigo-100 text-indigo-700', completed: 'bg-green-100 text-green-700', closed: 'bg-gray-200 text-gray-600',
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title={asset.name} />
            <div className="max-w-2xl mx-auto space-y-4">
                <Link href="/assets" className="text-sm text-brand-600 hover:text-brand-700">&larr; {t('asset.back')}</Link>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-start justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">{asset.name}</h2>
                        <div className="flex gap-2">
                            <Link href={`/assets/${asset.id}/history`} className="text-sm text-brand-600 hover:text-brand-700">{t('asset.history')}</Link>
                            <a href={`/assets/${asset.id}/label`} target="_blank" rel="noreferrer" className="text-sm text-brand-600 hover:text-brand-700">{t('asset.print_label')}</a>
                            <Link href={`/assets/${asset.id}/edit`} className="text-sm text-brand-600 hover:text-brand-700">{t('asset.edit')}</Link>
                        </div>
                    </div>
                    <div className="flex gap-4 mb-4">
                        {asset.photo && (
                            <img src={`/storage/${asset.photo}`} alt={asset.name} className="w-48 h-48 object-cover rounded-xl" />
                        )}
                        <div className="shrink-0 border border-gray-200 rounded-xl p-2">
                            <img src={`/assets/${asset.id}/qrcode`} alt={`QR Code for ${asset.name}`} className="w-28 h-28" />
                            <p className="text-[9px] text-gray-400 text-center mt-1">{t('asset.scan')}</p>
                        </div>
                    </div>
                    <div className="space-y-2 text-sm">
                        <p><span className="text-gray-500">{t('asset.code')}:</span> {asset.code}</p>
                        <p><span className="text-gray-500">{t('asset.category')}:</span> {asset.category}</p>
                        <p><span className="text-gray-500">{t('asset.location')}:</span> {asset.location?.name ?? 'N/A'}</p>
                        <p><span className="text-gray-500">{t('asset.status')}:</span> <span className={`text-xs font-medium px-2 py-1 rounded-full ${asset.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{asset.status === 'active' ? t('asset.st_active') : asset.status === 'under_maintenance' ? t('asset.st_under') : t('asset.st_inactive')}</span></p>
                        {asset.acquisition_cost && (
                            <p><span className="text-gray-500">{t('asset.acq_cost')}:</span> Rp {Number(asset.acquisition_cost).toLocaleString('id-ID')}</p>
                        )}
                        {asset.acquisition_date && (
                            <p><span className="text-gray-500">{t('asset.acq_date')}:</span> {new Date(asset.acquisition_date).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h3 className="font-semibold text-gray-900 mb-3">{t('asset.wo_title')} ({asset.workOrders?.length ?? 0})</h3>
                    {asset.workOrders?.length > 0 ? (
                        <div className="space-y-2">
                            {asset.workOrders.map(wo => (
                                <Link key={wo.id} href={`/work-orders/${wo.id}`} className="block p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-900">{wo.title}</span>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[wo.status]}`}>
                                            {t('st.' + wo.status)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{wo.requester?.name} · {new Date(wo.created_at).toLocaleDateString(locale)}</p>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">{t('asset.no_wo')}</p>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
