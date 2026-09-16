import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../../layouts/AuthenticatedLayout';
import { useLang } from '../../../i18n';

export default function Create({ auth, items }) {
    const { t } = useLang();
    const { data, setData, post, processing, errors } = useForm({
        item_id: '', qty_received: '', unit_price: '', receipt_date: '',
        reference: '', notes: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/store/receivings');
    };

    const selectedItem = items.find(i => i.id == data.item_id);

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title={t('store.record_receiving')} />
            <div className="max-w-lg mx-auto">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('store.record_receiving')}</h2>
                <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('store.item_label')}</label>
                        <select value={data.item_id} onChange={e => setData('item_id', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required>
                            <option value="">{t('store.select_item')}</option>
                            {items.map(i => (
                                <option key={i.id} value={i.id}>{i.name} ({i.stock} {i.unit} {t('store.in_stock')})</option>
                            ))}
                        </select>
                        {selectedItem && (
                            <p className="text-xs text-gray-400 mt-1">{t('store.current_stock')}: {selectedItem.stock} {selectedItem.unit}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('store.qty_received')}</label>
                        <input type="number" min="1" value={data.qty_received} onChange={e => setData('qty_received', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('store.unit_price')}</label>
                        <input type="number" min="0" step="0.01" value={data.unit_price} onChange={e => setData('unit_price', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" placeholder="0" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('store.receipt_date')}</label>
                        <input type="date" value={data.receipt_date} onChange={e => setData('receipt_date', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('store.reference')}</label>
                        <input type="text" value={data.reference} onChange={e => setData('reference', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" placeholder={t('store.reference_ph')} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('store.notes_opt')}</label>
                        <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows={2}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" />
                    </div>

                    <button type="submit" disabled={processing}
                        className="w-full bg-brand-400 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                        {processing ? t('store.saving') : t('store.record_receiving')}
                    </button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
