import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { useLang } from '../../i18n';

const parentType = { building: null, area: 'building', room: 'area' };

export default function Create({ auth, buildings, areas }) {
    const { t } = useLang();
    const typeLabels = { building: t('loc.type_building'), area: t('loc.type_area'), room: t('loc.type_room') };
    const { data, setData, post, processing, errors } = useForm({
        name: '', type: 'building', parent_id: '', description: '', floor_number: '', is_event_venue: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post('/locations');
    };

    const pt = parentType[data.type];
    const parentOptions = pt === 'building' ? buildings : pt === 'area' ? areas : null;

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title={t('loc.create_title')} />
            <div className="max-w-lg mx-auto">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('loc.create_title')}</h2>
                <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    {Object.values(errors).length > 0 && (
                        <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{Object.values(errors)[0]}</div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('loc.type')}</label>
                        <select value={data.type} onChange={e => { setData('type', e.target.value); setData('parent_id', ''); }} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                            {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                    </div>

                    {pt && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{typeLabels[pt]}</label>
                            <select value={data.parent_id} onChange={e => setData('parent_id', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required>
                                <option value="">{t('loc.select_parent')} {typeLabels[pt].toLowerCase()}</option>
                                {parentOptions?.map(p => <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ''}</option>)}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('loc.name')}</label>
                        <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('loc.desc_opt')}</label>
                        <textarea value={data.description} onChange={e => setData('description', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" rows={3} />
                    </div>

                    {data.type === 'room' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('loc.floor_no')} <span className="text-red-500">*</span></label>
                            <input type="text" value={data.floor_number} onChange={e => setData('floor_number', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required placeholder={t('loc.floor_ph')} />
                        </div>
                    )}

                    <label className="flex items-center gap-2 text-sm text-gray-700 bg-brand-50/50 rounded-xl px-3 py-2.5 cursor-pointer">
                        <input type="checkbox" checked={!!data.is_event_venue} onChange={e => setData('is_event_venue', e.target.checked)} className="w-4 h-4 rounded text-brand-600 focus:ring-brand-400" />
                        <span>{t('loc.use_venue')} <span className="text-gray-400">{t('loc.venue_hint')}</span></span>
                    </label>

                    <button type="submit" disabled={processing} className="w-full bg-brand-400 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                        {processing ? t('loc.creating') : t('loc.create_btn')}
                    </button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
