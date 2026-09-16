import { useState, useMemo, useEffect, useRef } from 'react';
import { useLang } from '../i18n';

export default function SearchPicker({ type, items, value, onChange }) {
    const { t } = useLang();
    const labels = {
        work_order: { label: t('pk.wo'), placeholder: t('pk.search_wo'), none: t('pk.no_wo'), noMatch: t('pk.no_match_wo'), format: (item) => `WO: ${item.title}` },
        project: { label: t('pk.project'), placeholder: t('pk.search_project'), none: t('pk.no_project'), noMatch: t('pk.no_match_project'), format: (item) => `${t('pk.project')}: ${item.name}` },
        schedule: { label: t('pk.schedule'), placeholder: t('pk.search_schedule'), none: t('pk.no_schedule'), noMatch: t('pk.no_match_schedule'), format: (item) => `${t('pk.schedule')}: ${item.asset?.name ?? '—'} (${item.next_due_date})` },
    };
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const inputRef = useRef(null);

    const cfg = labels[type] ?? { label: type, placeholder: 'Search...', format: (i) => i.name ?? i.title };
    const selected = items.find(i => i.id === value);

    const filtered = useMemo(() => {
        if (!search) return items;
        const q = search.toLowerCase();
        return items.filter(i =>
            (i.title ?? i.name ?? '').toLowerCase().includes(q)
        );
    }, [items, search]);

    useEffect(() => {
        if (open && inputRef.current) {
            inputRef.current.focus();
        }
    }, [open]);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-left focus:ring-2 focus:ring-brand-400 hover:border-gray-400 transition-colors flex items-center justify-between"
            >
                {selected ? (
                    <span className="text-gray-900 truncate">{cfg.format(selected)}</span>
                ) : (
                    <span className="text-gray-400">{cfg.none}</span>
                )}
                <svg className="w-4 h-4 text-gray-400 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => { setOpen(false); setSearch(''); }} />
                    <div className="absolute z-40 mt-1 w-full bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
                        <div className="p-2 border-b border-gray-100">
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={cfg.placeholder}
                                className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-400 outline-none"
                            />
                        </div>
                        <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                            <button
                                type="button"
                                onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${!value ? 'bg-blue-50 text-brand-700 font-medium' : 'text-gray-500'}`}
                            >
                                {cfg.none}
                            </button>
                            {filtered.map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => { onChange(item.id); setOpen(false); setSearch(''); }}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors truncate ${value === item.id ? 'bg-blue-50' : ''}`}
                                >
                                    {cfg.format(item)}
                                </button>
                            ))}
                            {filtered.length === 0 && (
                                <p className="px-3 py-4 text-sm text-gray-400 text-center">{cfg.noMatch}</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
