import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { useLang } from '../../i18n';

const categories = ['Furniture', 'Electronic', 'Mechanical', 'Equipment', 'Vehicle', 'HVAC', 'Building'];

export default function Create({ auth, locationOptions }) {
    const { t } = useLang();
    const { data, setData, post, processing, errors } = useForm({
        name: '', category: '', location_id: '', status: 'active', photo: null,
        acquisition_cost: '', acquisition_date: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/assets', {
            forceFormData: true,
        });
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title={t('asset.create_title')} />
            <div className="max-w-lg mx-auto">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('asset.create_title')}</h2>
                <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    {Object.values(errors).length > 0 && (
                        <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{Object.values(errors)[0]}</div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.name')}</label>
                        <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('asset.category')}</label>
                        <select value={data.category} onChange={e => setData('category', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required>
                            <option value="">{t('asset.select_cat')}</option>
                            {categories.map(c => <option key={c} value={c}>{t('asset.cat_' + c)}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('asset.location')}</label>
                        <select value={data.location_id} onChange={e => setData('location_id', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                            <option value="">{t('asset.select_loc')}</option>
                            {locationOptions?.map(l => (
                                <option key={l.id} value={l.id}>{l.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('asset.acq_cost_rp')}</label>
                        <input type="number" step="0.01" min="0" value={data.acquisition_cost} onChange={e => setData('acquisition_cost', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('asset.acq_date')}</label>
                        <input type="date" value={data.acquisition_date} onChange={e => setData('acquisition_date', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('asset.photo')}</label>
                        <input type="file" accept="image/*" onChange={e => setData('photo', e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-brand-700 hover:file:bg-brand-50" />
                    </div>
                    <button type="submit" disabled={processing} className="w-full bg-brand-400 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                        {processing ? t('asset.creating') : t('asset.create_btn')}
                    </button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
