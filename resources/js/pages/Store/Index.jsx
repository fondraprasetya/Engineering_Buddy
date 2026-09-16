import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { useLang } from '../../i18n';

const statusColors = {
    pending: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
    approved: { bg: 'bg-blue-50', text: 'text-brand-700' },
    rejected: { bg: 'bg-red-50', text: 'text-red-700' },
    fulfilled: { bg: 'bg-green-50', text: 'text-green-700' },
    cancelled: { bg: 'bg-gray-50', text: 'text-gray-600' },
};

function MutationModal({ item, mutations, beginningBalance, endingBalance, onClose, onFilter, dateFrom, dateTo }) {
    const { t } = useLang();
    if (!item) return null;
    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={onClose}>
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                    className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col"
                    onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
                        <div>
                            <h3 className="font-semibold text-gray-900">{item.name}</h3>
                            <p className="text-xs text-gray-500">{item.unit}</p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
                    </div>
                    <div className="flex items-center gap-2 p-3 border-b border-gray-100 shrink-0">
                        <input type="date" value={dateFrom} onChange={e => onFilter(e.target.value, dateTo)}
                            className="w-full rounded-xl border border-gray-300 px-2 py-1.5 text-xs focus:ring-2 focus:ring-brand-400" placeholder="From" />
                        <span className="text-xs text-gray-400">—</span>
                        <input type="date" value={dateTo} onChange={e => onFilter(dateFrom, e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-2 py-1.5 text-xs focus:ring-2 focus:ring-brand-400" placeholder="To" />
                    </div>
                    <div className="flex items-center justify-around px-4 py-2 bg-gray-50 border-b border-gray-100 shrink-0">
                        <div className="text-center">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wide">{t('store.beginning')}</p>
                            <p className="text-sm font-semibold text-gray-900">{beginningBalance} {item.unit}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wide">{t('store.ending')}</p>
                            <p className="text-sm font-semibold text-gray-900">{endingBalance} {item.unit}</p>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {mutations.length === 0 ? (
                            <p className="text-center text-gray-400 py-8">{t('store.no_mutations')}</p>
                        ) : (
                            mutations.map((m, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                                    <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${m.type === 'in' ? 'bg-green-500' : 'bg-red-500'}`}>
                                        {m.type === 'in' ? 'IN' : 'OUT'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900">{m.type === 'in' ? '+' : '-'}{m.qty} {item.unit}</span>
                                            <span className="text-xs text-gray-400">{new Date(m.date).toLocaleDateString()}</span>
                                        </div>
                                        {m.reference && <p className="text-xs text-gray-500 mt-0.5">{m.reference}</p>}
                                        {m.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{m.notes}</p>}
                                        <p className="text-[11px] text-gray-400 mt-0.5">{t('store.by')} {m.by ?? t('store.unknown')}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

export default function Index({ auth, tab: initialTab, categories, items, receivings, requests, adjustments, isChiefEngineer, pendingCount, lowStockCount, isTechnician }) {
    const { t } = useLang();
    const [tab, setTab] = useState(initialTab ?? 'items');
    const [typeFilter, setTypeFilter] = useState('all');
    const [approveQty, setApproveQty] = useState({});
    const [mutationItem, setMutationItem] = useState(null);
    const [mutations, setMutations] = useState([]);
    const [beginningBalance, setBeginningBalance] = useState(0);
    const [endingBalance, setEndingBalance] = useState(0);
    const [loadingMutations, setLoadingMutations] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [adjustItem, setAdjustItem] = useState(null);
    const [adjustQty, setAdjustQty] = useState('');
    const [adjustReason, setAdjustReason] = useState('');

    const fetchMutations = async (item, from, to) => {
        setLoadingMutations(true);
        try {
            const params = new URLSearchParams();
            if (from) params.set('date_from', from);
            if (to) params.set('date_to', to);
            const res = await fetch(`/store/items/${item.id}/mutations?${params}`);
            const data = await res.json();
            setMutations(data.mutations);
            setBeginningBalance(data.beginningBalance);
            setEndingBalance(data.endingBalance);
        } catch {
            setMutations([]);
        }
        setLoadingMutations(false);
    };

    const openMutations = async (item) => {
        setMutationItem(item);
        setDateFrom('');
        setDateTo('');
        await fetchMutations(item, '', '');
    };

    const handleDateFilter = (from, to) => {
        setDateFrom(from);
        setDateTo(to);
        if (mutationItem) fetchMutations(mutationItem, from, to);
    };

    const filteredItems = typeFilter === 'all' ? items : items.filter(i => i.type === typeFilter);

    const canManage = !isTechnician;

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title={t('store.title')} />
            <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-semibold text-gray-900">{t('store.title')}</h2>
                        {canManage && (pendingCount > 0 || lowStockCount > 0) && (
                            <div className="flex gap-1">
                                {pendingCount > 0 && <span className="text-xs bg-yellow-100 text-yellow-700 rounded-full px-2 py-0.5 font-medium">{pendingCount} {t('store.pending')}</span>}
                                {lowStockCount > 0 && <span className="text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5 font-medium">{lowStockCount} {t('store.low_stock')}</span>}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {tab === 'items' && canManage && (
                            <Link href="/store/items/create" className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">{t('store.add_item')}</Link>
                        )}
                        {tab === 'receivings' && canManage && (
                            <Link href="/store/receivings/create" className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">{t('store.record_receiving')}</Link>
                        )}
                        {tab === 'requests' && (
                            <Link href="/store/requests/create" className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">{t('store.new_request')}</Link>
                        )}
                        {canManage && (
                            <Link href="/store/categories" className="border border-gray-300 text-gray-600 rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-50">{t('store.manage_cats')}</Link>
                        )}
                    </div>
                </div>

                {!isTechnician && (
                    <div className="flex gap-1 border-b border-gray-200">
                        {['items', 'receivings', 'requests', ...(canManage ? ['adjustments'] : [])].map(tk => (
                            <button key={tk} onClick={() => setTab(tk)}
                                className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${tab === tk ? 'border-brand-400 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                {t('store.tab_' + tk)}
                                {tk === 'requests' && pendingCount > 0 && (
                                    <span className="ml-1.5 text-xs bg-yellow-100 text-yellow-700 rounded-full px-1.5 py-0.5">{pendingCount}</span>
                                )}
                                {tk === 'adjustments' && adjustments.filter(a => a.status === 'pending').length > 0 && (
                                    <span className="ml-1.5 text-xs bg-orange-100 text-orange-700 rounded-full px-1.5 py-0.5">{adjustments.filter(a => a.status === 'pending').length}</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {tab === 'items' && (
                    <div>
                        <div className="flex gap-2 mb-3 flex-wrap">
                            {['all', 'supply', 'tool'].map(tk => (
                                <button key={tk} onClick={() => setTypeFilter(tk)}
                                    className={`px-3 py-1 text-xs font-medium rounded-full ${typeFilter === tk ? 'bg-brand-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-brand-50'}`}>
                                    {tk === 'all' ? t('store.all') : tk === 'supply' ? t('store.supplies') : t('store.tools')}
                                </button>
                            ))}
                        </div>
                        {filteredItems.length === 0 ? (
                            <div className="bg-white rounded-2xl shadow-sm p-8">
                                <div className="text-center text-gray-400 mb-4">{t('store.no_items')}</div>
                                {canManage && (
                                    <div className="flex justify-center gap-3">
                                        <Link href="/store/items/create" className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">{t('store.add_item_plus')}</Link>
                                        <Link href="/store/categories" className="border border-gray-300 text-gray-600 rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-50">{t('store.manage_cats')}</Link>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50">
                                            <th className="text-left px-4 py-2 font-medium text-gray-500">{t('store.name')}</th>
                                            <th className="text-left px-4 py-2 font-medium text-gray-500">{t('store.category')}</th>
                                            <th className="text-right px-4 py-2 font-medium text-gray-500">{t('store.stock')}</th>
                                            <th className="text-left px-4 py-2 font-medium text-gray-500">{t('store.unit')}</th>
                                            <th className="text-left px-4 py-2 font-medium text-gray-500">{t('store.status')}</th>
                                            {canManage && <th className="text-right px-4 py-2 font-medium text-gray-500"></th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredItems.map(item => {
                                            const isLow = item.minimum_stock !== null && item.minimum_stock !== undefined && item.stock <= item.minimum_stock;
                                            return (
                                                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                    <td className="px-4 py-2 font-medium text-gray-900">{item.name}</td>
                                                    <td className="px-4 py-2 text-gray-500">{item.category_name ?? '—'}</td>
                                                    <td className={`px-4 py-2 text-right font-medium ${isLow ? 'text-red-600' : 'text-gray-900'}`}>{item.stock}</td>
                                                    <td className="px-4 py-2 text-gray-500">{item.unit}</td>
                                                    <td className="px-4 py-2">
                                                        {isLow
                                                            ? <span className="text-[10px] bg-red-100 text-red-700 rounded-full px-1.5 py-0.5 font-medium">{t('store.low_stock_badge')}</span>
                                                            : <span className="text-[10px] text-gray-400">OK</span>
                                                        }
                                                    </td>
                                                    {canManage && (
                                                        <td className="px-4 py-2 text-right flex items-center justify-end gap-2">
                                                            <button onClick={() => openMutations(item)} className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded px-2 py-0.5">{t('store.mutation')}</button>
                                                            <button onClick={() => { setAdjustItem(item); setAdjustQty(''); setAdjustReason(''); }} className="text-xs text-orange-600 hover:text-orange-800 border border-orange-300 rounded px-2 py-0.5">{t('store.adjust')}</button>
                                                            <Link href={`/store/items/${item.id}/edit`} className="text-xs text-brand-600 hover:text-brand-800">{t('store.edit')}</Link>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'receivings' && (
                    <div>
                        {receivings.data.length === 0 ? (
                            <div className="bg-white rounded-2xl shadow-sm p-8">
                                <div className="text-center text-gray-400 mb-4">{t('store.no_receivings')}</div>
                                {canManage && (
                                    <div className="flex justify-center">
                                        <Link href="/store/receivings/create" className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">{t('store.record_receiving_plus')}</Link>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
                                {receivings.data.map(r => (
                                    <div key={r.id} className="p-4 flex items-center justify-between">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-medium text-gray-900"><span className="text-xs text-gray-400 font-normal mr-1.5">ID: #{r.id}</span>{r.item?.name}</p>
                                                <span className="text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">+{r.qty_received} {r.item?.unit}</span>
                                                {r.unit_price && <span className="text-xs text-gray-500">@ {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(r.unit_price)}</span>}
                                            </div>
                                            {r.reference && <p className="text-xs text-gray-500 mt-0.5">{t('store.ref')}: {r.reference}</p>}
                                            {r.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{r.notes}</p>}
                                            <p className="text-[11px] text-gray-400 mt-0.5">{new Date(r.receipt_date).toLocaleDateString()} · {t('store.by')} {r.creator?.name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {receivings.last_page > 1 && (
                            <div className="flex justify-center gap-2 mt-3">
                                {Array.from({ length: receivings.last_page }, (_, i) => i + 1).map(page => (
                                    <button key={page} onClick={() => router.get('/store', { tab: 'receivings', page }, { preserveState: true })}
                                        className={`px-3 py-1 rounded-xl text-sm ${receivings.current_page === page ? 'bg-brand-400 text-white' : 'bg-white text-gray-700 hover:bg-brand-50 border border-gray-200'}`}>
                                        {page}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {tab === 'requests' && (
                    <div>
                        {requests.data.length === 0 ? (
                            <div className="bg-white rounded-2xl shadow-sm p-8">
                                <div className="text-center text-gray-400 mb-4">{t('store.no_requests')}</div>
                                <div className="flex justify-center">
                                    <Link href="/store/requests/create" className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">{t('store.new_request_plus')}</Link>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
                                {requests.data.map(r => (
                                    <div key={r.id} className="p-4 flex items-center justify-between">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-medium text-gray-900"><span className="text-xs text-gray-400 font-normal mr-1.5">ID: #{r.id}</span>{r.item?.name}</p>
                                                <span className="text-xs text-gray-500">{r.qty_requested} × {r.item?.unit}</span>
                                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColors[r.status]?.bg ?? 'bg-gray-50'} ${statusColors[r.status]?.text ?? 'text-gray-600'}`}>
                                                    {t('store.st_' + r.status)}
                                                </span>
                                            </div>
                                            {r.work_order && <p className="text-xs text-brand-600 mt-0.5">WO: {r.work_order.title}</p>}
                                            {r.notes && <p className="text-xs text-gray-500 mt-0.5 truncate">{r.notes}</p>}
                                            <p className="text-[11px] text-gray-400 mt-0.5">
                                                {new Date(r.request_date).toLocaleDateString()} · {t('store.by')} {r.requester?.name}
                                                {r.approver && ` · ${t('store.approved_by')} ${r.approver.name}`}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 ml-3 shrink-0">
                                            {canManage && r.status === 'pending' && (
                                                <>
                                                    <div className="flex items-center gap-1">
                                                        <input type="number" min="1" max={r.qty_requested} placeholder="Qty"
                                                            className="w-16 text-xs border border-gray-300 rounded px-1 py-0.5 text-center"
                                                            onChange={e => setApproveQty(prev => ({ ...prev, [r.id]: e.target.value }))} />
                                                        <button onClick={() => router.post(`/store/requests/${r.id}/approve`, { qty_approved: parseInt(approveQty[r.id]) || r.qty_requested })}
                                                            className="text-xs text-green-600 font-medium hover:text-green-800">{t('store.approve')}</button>
                                                        <button onClick={() => router.post(`/store/requests/${r.id}/reject`)}
                                                            className="text-xs text-red-500 hover:text-red-700">{t('store.reject')}</button>
                                                    </div>
                                                </>
                                            )}
                                            {canManage && r.status === 'approved' && (
                                                <button onClick={() => router.post(`/store/requests/${r.id}/fulfill`)}
                                                    className="text-xs bg-brand-400 text-white rounded px-2 py-1 font-medium hover:bg-brand-600">{t('store.fulfill')}</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {requests.last_page > 1 && (
                            <div className="flex justify-center gap-2 mt-3">
                                {Array.from({ length: requests.last_page }, (_, i) => i + 1).map(page => (
                                    <button key={page} onClick={() => router.get('/store', { tab: 'requests', page }, { preserveState: true })}
                                        className={`px-3 py-1 rounded-xl text-sm ${requests.current_page === page ? 'bg-brand-400 text-white' : 'bg-white text-gray-700 hover:bg-brand-50 border border-gray-200'}`}>
                                        {page}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {tab === 'adjustments' && (
                    <div>
                        {adjustments.length === 0 ? (
                            <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">{t('store.no_adjustments')}</div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
                                {adjustments.map(a => (
                                    <div key={a.id} className="p-4 flex items-center justify-between">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-medium text-gray-900"><span className="text-xs text-gray-400 font-normal mr-1.5">ID: #{a.id}</span>{a.item?.name}</p>
                                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${a.qty > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {a.qty > 0 ? '+' : ''}{a.qty}
                                                </span>
                                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                                    a.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                    a.status === 'approved' ? 'bg-brand-50 text-brand-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>{t('store.st_' + a.status)}</span>
                                            </div>
                                            {a.reason && <p className="text-xs text-gray-500 mt-0.5">{a.reason}</p>}
                                            <p className="text-[11px] text-gray-400 mt-0.5">
                                                {new Date(a.created_at).toLocaleDateString()} · {t('store.by')} {a.requester?.name}
                                                {a.approver && ` · ${a.status === 'approved' ? t('store.approved_by') : t('store.st_rejected') + ' ' + t('store.by')} ${a.approver.name}`}
                                            </p>
                                        </div>
                                        {isChiefEngineer && a.status === 'pending' && (
                                            <div className="flex items-center gap-2 ml-3 shrink-0">
                                                <button onClick={() => router.post(`/store/adjustments/${a.id}/approve`)}
                                                    className="text-xs text-green-600 font-medium hover:text-green-800">{t('store.approve')}</button>
                                                <button onClick={() => router.post(`/store/adjustments/${a.id}/reject`)}
                                                    className="text-xs text-red-500 hover:text-red-700">{t('store.reject')}</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {adjustItem && (
                    <AnimatePresence>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                            onClick={() => setAdjustItem(null)}>
                            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                                className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-4"
                                onClick={e => e.stopPropagation()}>
                                <h3 className="font-semibold text-gray-900 mb-1">{t('store.stock_adj')}</h3>
                                <p className="text-sm text-gray-500 mb-4">{adjustItem.name} ({t('store.stock_label')}: {adjustItem.stock} {adjustItem.unit})</p>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">{t('store.qty_label')}</label>
                                        <input type="number" value={adjustQty} onChange={e => setAdjustQty(e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" placeholder={t('store.qty_ph')} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">{t('store.reason')}</label>
                                        <textarea value={adjustReason} onChange={e => setAdjustReason(e.target.value)} rows={2}
                                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" placeholder={t('store.reason_ph')} />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setAdjustItem(null)} className="flex-1 border border-gray-300 text-gray-600 rounded-xl py-2 text-sm font-medium hover:bg-gray-50">{t('store.cancel')}</button>
                                        <button onClick={() => {
                                            router.post('/store/adjustments', {
                                                item_id: adjustItem.id,
                                                qty: parseInt(adjustQty),
                                                reason: adjustReason,
                                            });
                                            setAdjustItem(null);
                                        }} disabled={!adjustQty || parseInt(adjustQty) === 0 || isNaN(parseInt(adjustQty))}
                                            className="flex-1 bg-orange-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-orange-700 disabled:opacity-50">{t('store.submit')}</button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </AnimatePresence>
                )}

                {mutationItem && (
                    <MutationModal
                        item={mutationItem}
                        mutations={loadingMutations ? [] : mutations}
                        beginningBalance={beginningBalance}
                        endingBalance={endingBalance}
                        dateFrom={dateFrom}
                        dateTo={dateTo}
                        onFilter={handleDateFilter}
                        onClose={() => { setMutationItem(null); setMutations([]); setDateFrom(''); setDateTo(''); }}
                    />
                )}

                {isChiefEngineer && adjustments.some(a => a.status === 'pending') && (
                    <div className="fixed bottom-20 right-4 z-40">
                        <button onClick={() => setTab('adjustments')}
                            className="bg-orange-500 text-white rounded-full px-4 py-2 text-sm font-medium shadow-lg hover:bg-orange-600 flex items-center gap-2">
                            <span>{t('store.pending_adj')}</span>
                            <span className="bg-white text-orange-600 rounded-full px-1.5 py-0.5 text-xs font-bold">{adjustments.filter(a => a.status === 'pending').length}</span>
                        </button>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
