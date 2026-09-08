import { useState, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ImportActivityIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

export default function Index({ auth, rows, noAccountMonths, noAccountTotal, totals, grandTotal, year, years, importLogs }) {
    const [filterYear, setFilterYear] = useState(year?.toString() ?? new Date().getFullYear().toString());
    const [importing, setImporting] = useState(false);
    const [showLogs, setShowLogs] = useState(false);
    const fileInputRef = useRef(null);

    const fmt = (val) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);

    const handleExport = () => {
        window.location.href = '/budgets/export';
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImporting(true);
        const formData = new FormData();
        formData.append('file', file);
        router.post('/budgets/import', formData, {
            forceFormData: true,
            onFinish: () => { setImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; },
        });
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Monthly Budgets" />
            <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-xl font-semibold text-gray-900">Monthly Budgets</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={handleExport} className="bg-white border border-gray-300 text-gray-700 rounded-xl px-3 py-2 text-sm font-medium hover:bg-gray-50">Export</button>
                        <label className="bg-white border border-gray-300 text-gray-700 rounded-xl px-3 py-2 text-sm font-medium hover:bg-gray-50 cursor-pointer">
                            {importing ? 'Importing...' : 'Import'}
                            <input type="file" ref={fileInputRef} accept=".csv" onChange={handleImport} className="hidden" />
                        </label>
                        <select value={filterYear} onChange={e => { setFilterYear(e.target.value); router.get('/budgets', { year: e.target.value }, { preserveState: true }); }} className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm">
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <Link href="/budgets/create" className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">New Budget</Link>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="text-left px-3 py-2 font-semibold text-gray-700">Post Account</th>
                                {monthLabels.map(m => <th key={m} className="text-right px-2 py-2 font-semibold text-gray-700">{m}</th>)}
                                <th className="text-right px-3 py-2 font-semibold text-gray-700">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {rows.map(r => (
                                <tr key={r.code} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 text-gray-900 font-medium whitespace-nowrap">
                                        {r.code}
                                        {r.name ? (
                                            <span className="text-gray-500 font-normal ml-1">{r.name}</span>
                                        ) : (
                                            <span className="text-gray-400 font-normal ml-1 text-[10px]">(unknown)</span>
                                        )}
                                    </td>
                                    {r.months.map((amt, i) => (
                                        <td key={i} className="text-right px-2 py-2 text-gray-700 tabular-nums">{amt > 0 ? fmt(amt) : ''}</td>
                                    ))}
                                    <td className="text-right px-3 py-2 font-semibold text-gray-900 tabular-nums">{fmt(r.total)}</td>
                                </tr>
                            ))}
                            {noAccountTotal > 0 && (
                                <tr className="hover:bg-gray-50 text-gray-500">
                                    <td className="px-3 py-2 italic">(no account)</td>
                                    {noAccountMonths.map((amt, i) => (
                                        <td key={i} className="text-right px-2 py-2 tabular-nums">{amt > 0 ? fmt(amt) : ''}</td>
                                    ))}
                                    <td className="text-right px-3 py-2 font-semibold tabular-nums">{fmt(noAccountTotal)}</td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold text-gray-900">
                                <td className="px-3 py-2 text-sm">Total</td>
                                {totals.map((t, i) => (
                                    <td key={i} className="text-right px-2 py-2 text-sm tabular-nums">{fmt(t)}</td>
                                ))}
                                <td className="text-right px-3 py-2 text-sm tabular-nums">{fmt(grandTotal)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="flex justify-end">
                    <Link href="/budgets/create" className="text-brand-600 text-sm hover:text-brand-800 font-medium">+ Add Budget</Link>
                </div>

                {importLogs?.length > 0 && (
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
            </div>
        </AuthenticatedLayout>
    );
}
