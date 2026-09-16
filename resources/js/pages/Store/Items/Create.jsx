import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../../layouts/AuthenticatedLayout';
import { useLang } from '../../../i18n';

export default function Create({ auth, categories }) {
    const { t } = useLang();
    const { data, setData, post, processing, errors } = useForm({
        category_id: '', name: '', unit: 'pcs', minimum_stock: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/store/items');
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title={t('store.form_add_title')} />
            <div className="max-w-lg mx-auto">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('store.form_add_title')}</h2>
                <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    {errors.name && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{errors.name}</div>}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('store.category')}</label>
                        <select value={data.category_id} onChange={e => setData('category_id', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                            <option value="">{t('store.no_category')}</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('store.name')}</label>
                        <input type="text" value={data.name} onChange={e => setData('name', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('store.unit')}</label>
                        <input type="text" value={data.unit} onChange={e => setData('unit', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400"
                            placeholder={t('store.unit_ph')} required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('store.min_stock_opt')}</label>
                        <input type="number" min="0" value={data.minimum_stock} onChange={e => setData('minimum_stock', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" placeholder={t('store.min_stock_ph')} />
                    </div>

                    <button type="submit" disabled={processing}
                        className="w-full bg-brand-400 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                        {processing ? t('store.saving') : t('store.save_item')}
                    </button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
