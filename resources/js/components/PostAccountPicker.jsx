import { useState, useMemo, useEffect, useRef } from 'react';

export default function PostAccountPicker({ accounts, value, onChange }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const inputRef = useRef(null);

    const selected = accounts.find(a => a.code === value);

    const filtered = useMemo(() => {
        if (!search) return accounts;
        const q = search.toLowerCase();
        return accounts.filter(a =>
            a.code.toLowerCase().includes(q) ||
            a.name.toLowerCase().includes(q)
        );
    }, [accounts, search]);

    useEffect(() => {
        if (open && inputRef.current) {
            inputRef.current.focus();
        }
    }, [open]);

    return (
        <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Post Account</label>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-left focus:ring-2 focus:ring-brand-400 hover:border-gray-400 transition-colors flex items-center justify-between"
            >
                {selected ? (
                    <span className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{selected.code}</span>
                        <span className="text-gray-500">—</span>
                        <span className="text-gray-600">{selected.name}</span>
                    </span>
                ) : (
                    <span className="text-gray-400">No account</span>
                )}
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                placeholder="Search account..."
                                className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-400 outline-none"
                            />
                        </div>
                        <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                            <button
                                type="button"
                                onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${value === '' || value === null ? 'bg-blue-50 text-brand-700 font-medium' : 'text-gray-500'}`}
                            >
                                No account
                            </button>
                            {filtered.map(a => (
                                <button
                                    key={a.code}
                                    type="button"
                                    onClick={() => { onChange(a.code); setOpen(false); setSearch(''); }}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${value === a.code ? 'bg-blue-50' : ''}`}
                                >
                                    <span className="font-medium text-gray-900">{a.code}</span>
                                    <span className="text-gray-400 mx-1">—</span>
                                    <span className="text-gray-600">{a.name}</span>
                                </button>
                            ))}
                            {filtered.length === 0 && (
                                <p className="px-3 py-4 text-sm text-gray-400 text-center">No matching accounts.</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
