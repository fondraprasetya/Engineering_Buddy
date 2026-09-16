import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { useLang } from '../../i18n';

export default function Create({ auth, workOrders }) {
    const { t } = useLang();
    const { data, setData, post, processing, errors } = useForm({
        log_date: new Date().toISOString().split('T')[0],
        activities: '',
        hours_worked: '',
        issues_found: '',
        work_order_id: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/daily-logs');
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title={t('log.form_title')} />
            <div className="max-w-lg mx-auto">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('log.form_title')}</h2>
                <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    {errors.log_date && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{errors.log_date}</div>}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('log.date')}</label>
                        <input type="date" value={data.log_date} onChange={e => setData('log_date', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('log.activities')}</label>
                        <textarea value={data.activities} onChange={e => setData('activities', e.target.value)} rows={4} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" placeholder={t('log.activities_ph')} required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('log.hours')}</label>
                        <input type="number" step="0.5" min="0.5" max="24" value={data.hours_worked} onChange={e => setData('hours_worked', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('log.issues_opt')}</label>
                        <textarea value={data.issues_found} onChange={e => setData('issues_found', e.target.value)} rows={2} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" placeholder={t('log.issues_ph')} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('log.linked_wo')}</label>
                        <select value={data.work_order_id} onChange={e => setData('work_order_id', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                            <option value="">{t('log.none')}</option>
                            {workOrders?.map(wo => <option key={wo.id} value={wo.id}>{wo.title}</option>)}
                        </select>
                    </div>

                    <button type="submit" disabled={processing} className="w-full bg-brand-400 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                        {processing ? t('log.saving') : t('log.save')}
                    </button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
