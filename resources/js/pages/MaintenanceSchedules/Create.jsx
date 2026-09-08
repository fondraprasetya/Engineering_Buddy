import { useMemo } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

function endDate(freqType, freqValue, baseDate, occurrences) {
    if (!baseDate || occurrences < 1) return null;
    const d = new Date(baseDate);
    const idx = occurrences - 1;
    switch (freqType) {
        case 'daily': d.setDate(d.getDate() + idx); break;
        case 'weekly': d.setDate(d.getDate() + idx * 7); break;
        case 'monthly': d.setMonth(d.getMonth() + idx); break;
        case 'quarterly': d.setMonth(d.getMonth() + idx * 3); break;
        case 'bi-annual': d.setMonth(d.getMonth() + idx * 6); break;
        case 'annual': d.setFullYear(d.getFullYear() + idx); break;
        case 'fixed_days': d.setDate(d.getDate() + idx * (freqValue || 1)); break;
        default: return null;
    }
    return d;
}

function fmtDate(d) {
    if (!d) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const freqLabels = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', 'bi-annual': 'Bi-Annual', annual: 'Annual', fixed_days: 'Fixed Days', usage: 'Usage/Meter' };

export default function Create({ auth, assets, templates, technicians }) {
    const { data, setData, post, processing, errors } = useForm({
        title: '', asset_id: '', checklist_template_id: '', frequency_type: 'monthly',
        frequency_value: '', next_due_date: '', default_technician_id: '', occurrences: 1,
    });

    const namedFreqs = ['daily','weekly','monthly','quarterly','bi-annual','annual'];
    const freqValues = { daily:1, weekly:7, monthly:1, quarterly:3, 'bi-annual':6, annual:1 };

    const showValue = data.frequency_type === 'fixed_days' || data.frequency_type === 'usage';
    const isUsage = data.frequency_type === 'usage';

    const preview = useMemo(() => {
        if (isUsage || data.occurrences < 2 || !data.next_due_date) return null;
        const last = endDate(data.frequency_type, data.frequency_value, data.next_due_date, data.occurrences);
        if (!last) return null;
        return `${freqLabels[data.frequency_type] ?? data.frequency_type} · Starting ${fmtDate(new Date(data.next_due_date))} · ${data.occurrences} occurrences → ends ${fmtDate(last)}`;
    }, [data.frequency_type, data.frequency_value, data.next_due_date, data.occurrences, isUsage]);

    const submit = (e) => {
        e.preventDefault();
        post('/maintenance-schedules');
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Create Schedule" />
            <div className="max-w-lg mx-auto">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Maintenance Schedule</h2>
                <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    {Object.values(errors).length > 0 && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{Object.values(errors)[0]}</div>}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title
                            <span className="text-gray-400 font-normal ml-1">(optional)</span>
                        </label>
                        <input type="text" value={data.title} onChange={e => setData('title', e.target.value)} placeholder="e.g. Weekly PM Inspection" className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Asset</label>
                        <select value={data.asset_id} onChange={e => setData('asset_id', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required>
                            <option value="">Select asset</option>
                            {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Checklist Template (optional)</label>
                        <select value={data.checklist_template_id} onChange={e => setData('checklist_template_id', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                            <option value="">No template</option>
                            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                            <select value={data.frequency_type} onChange={e => { const val = e.target.value; setData('frequency_type', val); if (namedFreqs.includes(val)) setData('frequency_value', freqValues[val]); }} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="bi-annual">Bi-Annual</option>
                                <option value="annual">Annual</option>
                                <option value="fixed_days">Fixed Days</option>
                                <option value="usage">Usage/Meter</option>
                            </select>
                        </div>
                        {showValue && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Days</label>
                                <input type="number" min="1" value={data.frequency_value} onChange={e => setData('frequency_value', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Next Due Date</label>
                        <input type="date" value={data.next_due_date} onChange={e => setData('next_due_date', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Number of Occurrences
                            <span className="text-gray-400 font-normal ml-1">(how many schedules to generate)</span>
                        </label>
                        <input type="number" min="1" max="52" value={data.occurrences} onChange={e => setData('occurrences', Math.min(52, Math.max(1, parseInt(e.target.value) || 1)))} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" />
                        {preview && (
                            <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1">
                                <span>&#8627;</span> {preview}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Default Technician (optional)</label>
                        <select value={data.default_technician_id} onChange={e => setData('default_technician_id', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                            <option value="">No technician</option>
                            {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    <button type="submit" disabled={processing} className="w-full bg-brand-400 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                        {processing ? 'Creating...' : 'Create Schedule'}
                    </button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
