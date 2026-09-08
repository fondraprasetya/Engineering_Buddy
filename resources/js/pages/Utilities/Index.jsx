import { useState, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

const typeLabels = {
    electricity: 'Electricity',
    gas: 'Gas',
    water: 'Water',
    waste: 'Waste',
    fuel: 'Fuel',
};

const typeIcons = {
    electricity: '⚡',
    gas: '🔥',
    water: '💧',
    waste: '🗑️',
    fuel: '⛽',
};

const ImportActivityIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

export default function Index({ auth, records, types, totals, filters, importLogs }) {
    const role = auth.user.roles?.[0] ?? 'employee';
    const isAdmin = ['eng-admin', 'chief-engineer', 'gm', 'super-admin'].includes(role);
    const fileInputRef = useRef(null);

    const [filterType, setFilterType] = useState(filters?.type ?? '');
    const [filterFrom, setFilterFrom] = useState(filters?.date_from ?? '');
    const [filterTo, setFilterTo] = useState(filters?.date_to ?? '');
    const [importing, setImporting] = useState(false);
    const [showLogs, setShowLogs] = useState(false);

    const applyFilters = () => {
        router.get('/utilities', { type: filterType, date_from: filterFrom, date_to: filterTo }, { preserveState: true });
    };

    const clearFilters = () => {
        setFilterType('');
        setFilterFrom('');
        setFilterTo('');
        router.get('/utilities', {}, { preserveState: true });
    };

    const handleExport = () => {
        const params = new URLSearchParams();
        if (filterType) params.set('type', filterType);
        if (filterFrom) params.set('date_from', filterFrom);
        if (filterTo) params.set('date_to', filterTo);
        window.location.href = `/utilities/export?${params.toString()}`;
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImporting(true);
        const formData = new FormData();
        formData.append('file', file);
        router.post('/utilities/import', formData, {
            forceFormData: true,
            onFinish: () => { setImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; },
        });
    };

    const formatCurrency = (val) => {
        if (val === null || val === undefined) return '—';
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Daily Utilities" />
            <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-xl font-semibold text-gray-900">Daily Utilities</h2>
                    <div className="flex items-center gap-2">
                        {isAdmin && (
                            <>
                                <button onClick={handleExport} className="bg-white border border-gray-300 text-gray-700 rounded-xl px-3 py-2 text-sm font-medium hover:bg-gray-50">Export</button>
                                <label className="bg-white border border-gray-300 text-gray-700 rounded-xl px-3 py-2 text-sm font-medium hover:bg-gray-50 cursor-pointer">
                                    {importing ? 'Importing...' : 'Import'}
                                    <input type="file" ref={fileInputRef} accept=".csv" onChange={handleImport} className="hidden" />
                                </label>
                            </>
                        )}
                        <Link href="/utilities/create" className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">New Record</Link>
                    </div>
                </div>

                {isAdmin && (
                    <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap gap-3 items-end">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Type</label>
                            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm">
                                <option value="">All</option>
                                {types.map(t => <option key={t} value={t}>{typeLabels[t]}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">From</label>
                            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">To</label>
                            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm" />
                        </div>
                        <button onClick={applyFilters} className="bg-gray-100 text-gray-700 rounded-xl px-4 py-1.5 text-sm hover:bg-brand-50">Filter</button>
                        {(filterType || filterFrom || filterTo) && (
                            <button onClick={clearFilters} className="text-red-600 text-sm hover:text-red-800 px-2 py-1.5">Clear</button>
                        )}
                    </div>
                )}

                {isAdmin && importLogs?.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm">
                        <button
                            onClick={() => setShowLogs(s => !s)}
                            className="w-full flex items-center justify-between p-4 text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                            <span className="flex items-center gap-2">
                                <ImportActivityIcon />
                                Import History
                            </span>
                            <svg className={`w-4 h-4 transition-transform ${showLogs ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {showLogs && (
                            <div className="border-t border-gray-100 divide-y divide-gray-50">
                                {importLogs.map(log => (
                                    <div key={log.id} className="px-4 py-3 flex items-start justify-between text-sm">
                                        <div className="min-w-0">
                                            <p className="text-gray-700 truncate">{log.file_name}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {log.user?.name} · {new Date(log.created_at).toLocaleString()}
                                            </p>
                                            {log.status === 'success' && (
                                                <p className="text-xs text-gray-500 mt-0.5">{log.imported} imported, {log.skipped} skipped</p>
                                            )}
                                            {log.status === 'failed' && log.error_message && (
                                                <p className="text-xs text-red-500 mt-0.5 truncate">{log.error_message}</p>
                                            )}
                                        </div>
                                        <span className={`shrink-0 ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${log.status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                            {log.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {types.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {types.map(t => {
                            const total = totals[t];
                            const active = filterType === t;
                            return (
                                <button
                                    key={t}
                                    onClick={() => router.get('/utilities', { ...filters, type: active ? '' : t, page: '' }, { preserveState: true })}
                                    className={`rounded-2xl shadow-sm p-3 text-center cursor-pointer transition-all hover:scale-[1.03] ${active ? 'ring-2 ring-brand-400 bg-blue-50' : 'bg-white'}`}
                                >
                                    <span className="text-2xl">{typeIcons[t]}</span>
                                    <p className="text-xs text-gray-500 mt-1">{typeLabels[t]}</p>
                                    {total ? (
                                        <>
                                            <p className="text-sm font-semibold text-gray-900">{Number(total.total_consumption).toLocaleString()} <span className="text-xs font-normal text-gray-400">{total.unit || ''}</span></p>
                                            {total.total_cost && <p className="text-xs text-gray-500">{formatCurrency(total.total_cost)}</p>}
                                        </>
                                    ) : (
                                        <p className="text-sm text-gray-400">No data</p>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {records.data.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">No utility records found.</div>
                ) : (
                    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.04 } } }} className="space-y-3">
                        {records.data.map((record) => (
                            <motion.div key={record.id} variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }} className="bg-white rounded-2xl shadow-sm p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">{typeIcons[record.type]}</span>
                                        <div>
                                                <p className="text-sm text-gray-500">{typeLabels[record.type]} · {new Date(record.record_date).toLocaleDateString()} · {record.recorder?.name}</p>
                                            <p className="text-sm text-gray-900 mt-1">
                                                {Number(record.consumption).toLocaleString()} {record.unit}
                                            </p>
                                            {record.beginning_stand != null && record.ending_stand != null && (
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    Stand: {Number(record.beginning_stand).toLocaleString()} → {Number(record.ending_stand).toLocaleString()}
                                                </p>
                                            )}
                                            {record.notes && <p className="text-xs text-gray-500 mt-1">{record.notes}</p>}
                                            {record.photo && (
                                                <a href={`/storage/${record.photo}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block">
                                                    <img src={`/storage/${record.photo}`} alt="Meter photo" className="w-20 h-20 object-cover rounded-xl border" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right text-sm flex flex-col items-end gap-1">
                                        <p className="text-gray-700 font-medium">{formatCurrency(record.cost)}</p>
                                        <Link href={`/utilities/${record.id}/edit`} className="text-xs text-brand-600 hover:text-brand-800">Edit</Link>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {records.last_page > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                        {Array.from({ length: records.last_page }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => router.get('/utilities', { ...filters, page }, { preserveState: true })}
                                className={`px-3 py-1 rounded-xl text-sm ${records.current_page === page ? 'bg-brand-400 text-white' : 'bg-white text-gray-700 hover:bg-brand-50'}`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
