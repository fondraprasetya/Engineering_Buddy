import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

const typeOptions = [
    { value: 'electricity', label: 'Electricity', unit: 'kWh' },
    { value: 'gas', label: 'Gas', unit: 'm³' },
    { value: 'water', label: 'Water', unit: 'm³' },
    { value: 'waste', label: 'Waste', unit: 'kg' },
    { value: 'fuel', label: 'Fuel', unit: 'liter' },
];

export default function Create({ auth, rates, previousStands = {} }) {
    const { data, setData, post, processing, errors } = useForm({
        record_date: new Date().toISOString().split('T')[0],
        type: 'electricity',
        beginning_stand: previousStands['electricity'] ?? '',
        ending_stand: '',
        waste_qty: '',
        unit: 'kWh',
        cost: '',
        notes: '',
        photo: null,
    });

    const consumption = data.type === 'waste'
        ? parseFloat(data.waste_qty) || 0
        : data.beginning_stand && data.ending_stand
            ? Math.max(0, parseFloat(data.ending_stand) - parseFloat(data.beginning_stand))
            : 0;

    const fetchPreviousStand = (type, date) => {
        if (!type || !date || type === 'waste') return;
        fetch(`/utilities/previous-stand?type=${encodeURIComponent(type)}&date=${encodeURIComponent(date)}`)
            .then(r => r.json())
            .then(res => {
                setData('beginning_stand', res.ending_stand ?? '');
            });
    };

    const handleTypeChange = (value) => {
        const opt = typeOptions.find(o => o.value === value);
        const rate = rates?.[value];
        setData({ ...data, type: value, unit: opt?.unit ?? '', cost: '', ending_stand: '', waste_qty: '' });
        fetchPreviousStand(value, data.record_date);
    };

    const handleDateChange = (value) => {
        setData('record_date', value);
        if (!data.type === 'waste') fetchPreviousStand(data.type, value);
    };

    const autoCalcCost = (next) => {
        const rate = rates?.[next.type];
        if (!rate) return '';
        const cons = data.type === 'waste'
            ? parseFloat(next.waste_qty) || 0
            : (parseFloat(next.ending_stand) || 0) - (parseFloat(next.beginning_stand) || 0);
        return rate && cons > 0 ? rate * Math.max(0, cons) : '';
    };

    const handleEndingStandChange = (value) => {
        const next = { ...data, ending_stand: value };
        setData({ ...next, cost: autoCalcCost(next) });
    };

    const handleWasteQtyChange = (value) => {
        const next = { ...data, waste_qty: value };
        setData({ ...next, cost: autoCalcCost(next) });
    };

    const submit = (e) => {
        e.preventDefault();
        post('/utilities', { forceFormData: true });
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Record Utility" />
            <div className="max-w-lg mx-auto">
                <div className="flex items-center gap-3 mb-4">
                    <Link href="/utilities" className="text-gray-500 hover:text-gray-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </Link>
                    <h2 className="text-xl font-semibold text-gray-900">Record Utility Usage</h2>
                </div>
                <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    {Object.keys(errors).length > 0 && (
                        <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">
                            {Object.values(errors).map((err, i) => <p key={i}>{err}</p>)}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input type="date" value={data.record_date} onChange={e => handleDateChange(e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select value={data.type} onChange={e => handleTypeChange(e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                            {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label} ({o.unit})</option>)}
                        </select>
                    </div>

                    {data.type === 'waste' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity ({data.unit})</label>
                            <input type="number" step="0.01" min="0" value={data.waste_qty} onChange={e => handleWasteQtyChange(e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" placeholder="0.00" required />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Beginning Stand</label>
                                <input type="number" step="0.01" min="0" value={data.beginning_stand} readOnly className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600" placeholder="Auto from previous day" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ending Stand</label>
                                <input type="number" step="0.01" min="0" value={data.ending_stand} onChange={e => handleEndingStandChange(e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" placeholder="0.00" required />
                            </div>
                        </div>
                    )}

                    <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
                        <span className="text-gray-600">{data.type === 'waste' ? 'Waste' : 'Consumption'} ({data.unit})</span>
                        <span className="font-semibold text-gray-900">{consumption.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    {rates?.[data.type] && (
                        <div className="bg-blue-50 text-brand-700 rounded-xl px-4 py-2 text-xs flex items-center justify-between">
                            <span>Rate: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(rates[data.type])} / {data.unit}</span>
                            <span>→ {data.cost ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(data.cost) : '—'}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cost (IDR, overrides auto-calc)</label>
                        <input type="number" step="100" min="0" value={data.cost} onChange={e => setData('cost', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" placeholder="Auto-calculated from rate" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                        <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows={3} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" placeholder="Meter reading, observations, etc." />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Photo <span className="text-red-500">*</span></label>
                        <input type="file" accept="image/*" onChange={e => setData('photo', e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-brand-700 hover:file:bg-brand-50" required />
                        {data.photo && (
                            <div className="mt-2">
                                <img src={URL.createObjectURL(data.photo)} alt="Preview" className="w-32 h-32 object-cover rounded-xl border" />
                            </div>
                        )}
                    </div>

                    <button type="submit" disabled={processing} className="w-full bg-brand-400 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                        {processing ? 'Saving...' : 'Save Record'}
                    </button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
