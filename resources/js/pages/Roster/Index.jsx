import { useState, useRef, useCallback } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { useLang } from '../../i18n';

const DOW_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
import { TriangleAlert } from 'lucide-react';

const noBlockShifts = ['off', 'leave', 'extra_off'];

const shiftColors = {
    morning: 'bg-yellow-200 text-yellow-800',
    afternoon: 'bg-orange-200 text-orange-800',
    night: 'bg-indigo-200 text-indigo-800',
    off: 'bg-gray-200 text-gray-500',
    leave: 'bg-pink-200 text-pink-800',
    extra_off: 'bg-teal-200 text-teal-800',
};

const shiftLabels = {
    morning: 'M',
    afternoon: 'A',
    night: 'N',
    off: 'O',
    leave: 'L',
    extra_off: 'X',
};

const defaultClockIn = { morning: '07:00', afternoon: '13:00', night: '22:00' };

const addHours = (time, hours) => {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + hours * 60;
    const nh = Math.floor(total / 60) % 24;
    const nm = total % 60;
    return String(nh).padStart(2, '0') + ':' + String(nm).padStart(2, '0');
};

export default function Index({ auth, users, entries, days, month, prevMonth, nextMonth, dayNames }) {
    const { lang, t } = useLang();
    const role = auth.user.roles?.[0] ?? 'employee';
    const canApprove = role === 'chief-engineer';
    const [roleFilter, setRoleFilter] = useState('all');
    const [modal, setModal] = useState(null);
    const [apiError, setApiError] = useState('');
    const [dragTargets, setDragTargets] = useState(new Set());
    const dragTargetsRef = useRef(new Set());
    const dragRef = useRef(null);
    const draggedRef = useRef(false);

    const filtered = roleFilter === 'all'
        ? users
        : users.filter(u => u.roles?.some?.(r => r.name === roleFilter) ?? u.roles?.[0] === roleFilter);

    const getEntry = (userId, date) => entries[`${userId}-${date}`];
    const cellKey = (userId, date) => `${userId}|${date}`;

    const defaultBlocks = (shift) => {
        const clockIn = defaultClockIn[shift] ?? '';
        return [{ in: clockIn, out: addHours(clockIn, 9) }];
    };

    const openModal = (userId, date) => {
        const entry = getEntry(userId, date);
        setApiError('');
        setModal({
            userId,
            date,
            endDate: date,
            entryId: entry?.id ?? null,
            shift: entry?.shift ?? 'morning',
            blocks: entry?.time_blocks?.length ? entry.time_blocks.map(b => ({ ...b })) : defaultBlocks(entry?.shift ?? 'morning'),
            approved: entry?.approved_at != null,
        });
    };

    const csrf = () => document.querySelector('meta[name=csrf-token]')?.content ?? '';

    const save = async () => {
        if (!modal) return;
        setApiError('');

        try {
            const res = await fetch('/api/v1/roster', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify({
                    user_id: modal.userId,
                    date: modal.date,
                    end_date: modal.endDate && modal.endDate > modal.date ? modal.endDate : undefined,
                    shift: modal.shift,
                    time_blocks: noBlockShifts.includes(modal.shift) ? [] : modal.blocks,
                }),
            });
            if (res.ok) { setModal(null); router.reload(); return; }
            const data = await res.json();
            setApiError(data.message || t('roster.failed_save'));
        } catch { setApiError(t('roster.network_error')); }
    };

    const remove = async () => {
        if (!modal) return;
        const entry = getEntry(modal.userId, modal.date);
        if (!entry?.id) return;
        setApiError('');

        if (entry.shift === 'afternoon' || entry.shift === 'night') {
            const dateKeys = Object.keys(entries).filter(k => k.endsWith(`-${modal.date}`));
            const remaining = dateKeys.filter(k => k !== `${modal.userId}-${modal.date}`).map(k => entries[k].shift);
            if ((entry.shift === 'afternoon' && !remaining.includes('afternoon')) ||
                (entry.shift === 'night' && !remaining.includes('night'))) {
                setApiError(t('roster.cannot_remove_last') + ' ' + entry.shift + ' shift for this date.');
                return;
            }
        }

        try {
            const res = await fetch(`/api/v1/roster/${entry.id}`, { method: 'DELETE', headers: { 'X-CSRF-TOKEN': csrf() } });
            if (res.ok) { setModal(null); router.reload(); return; }
            const data = await res.json();
            setApiError(data.message || t('roster.failed_remove'));
        } catch { setApiError(t('roster.network_error')); }
    };

    const approveEntry = async (entryId) => {
        const res = await fetch('/api/v1/roster/approve', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
            body: JSON.stringify({ entry_id: entryId }),
        });
        if (res.ok) { setModal(null); router.reload(); }
        else { const d = await res.json(); setApiError(d.message || t('roster.failed_approve')); }
    };

    const unapproveEntry = async (entryId) => {
        const res = await fetch('/api/v1/roster/unapprove', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
            body: JSON.stringify({ entry_id: entryId }),
        });
        if (res.ok) { setModal(null); router.reload(); }
        else { const d = await res.json(); setApiError(d.message || t('roster.failed_unapprove')); }
    };

    const approveMonth = async () => {
        const res = await fetch('/api/v1/roster/approve-month', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
            body: JSON.stringify({ month }),
        });
        if (res.ok) router.reload();
    };

    const unapproveMonth = async () => {
        const res = await fetch('/api/v1/roster/unapprove-month', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
            body: JSON.stringify({ month }),
        });
        if (res.ok) router.reload();
    };

    const updateShift = (shift) => {
        setModal(m => ({ ...m, shift, blocks: defaultBlocks(shift) }));
    };

    const updateBlock = (idx, field, val) => {
        setModal(m => {
            const blocks = [...m.blocks];
            const updated = { ...blocks[idx], [field]: val };
            // Auto-follow: changing clock-in defaults clock-out to +9h (still editable)
            if (field === 'in' && val) {
                updated.out = addHours(val, 9);
            }
            blocks[idx] = updated;
            return { ...m, blocks };
        });
    };

    const addBlock = () => {
        setModal(m => ({ ...m, blocks: [...m.blocks, { in: '', out: '' }] }));
    };

    const removeBlock = (idx) => {
        setModal(m => ({ ...m, blocks: m.blocks.filter((_, i) => i !== idx) }));
    };

    const formatCell = (entry) => {
        if (!entry) return null;
        const label = shiftLabels[entry.shift] ?? '?';
        const blocks = entry.time_blocks;
        if (!blocks?.length) return <div className="text-[10px] font-bold">{label}</div>;
        return (
            <div>
                <div className="text-[10px] font-bold leading-tight">{label}</div>
                <div className="text-[8px] leading-tight opacity-75">{blocks[0].in}</div>
                {blocks.length > 1 && <div className="text-[7px] leading-tight text-brand-400">+{blocks.length - 1}</div>}
            </div>
        );
    };

    const handleMouseDown = useCallback((userId, date, entry) => {
        if (!entry || entry.approved_at) return;
        draggedRef.current = false;
        dragRef.current = { userId, date, shift: entry.shift, time_blocks: entry.time_blocks };
        const initial = new Set([cellKey(userId, date)]);
        dragTargetsRef.current = initial;
        setDragTargets(initial);
    }, []);

    const handleMouseMove = useCallback((userId, date, isPast) => {
        if (!dragRef.current || isPast) return;
        draggedRef.current = true;
        const key = cellKey(userId, date);
        if (!dragTargetsRef.current.has(key)) {
            const next = new Set([...dragTargetsRef.current, key]);
            dragTargetsRef.current = next;
            setDragTargets(next);
        }
    }, []);

    const handleMouseUp = useCallback(() => {
        draggedRef.current = false;
        const src = dragRef.current;
        if (!src) return;
        dragRef.current = null;

        const targets = [...dragTargetsRef.current];
        dragTargetsRef.current = new Set();
        setDragTargets(new Set());

        if (targets.length <= 1) return;

        const payloads = targets
            .filter(k => k !== cellKey(src.userId, src.date))
            .map(k => {
                const [, date] = k.split('|');
                return {
                    user_id: src.userId,
                    date,
                    shift: src.shift,
                    time_blocks: noBlockShifts.includes(src.shift) ? [] : src.time_blocks,
                };
            });

        if (payloads.length === 0) return;

        payloads.forEach(body => {
            fetch('/api/v1/roster', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify(body),
            });
        });
        router.reload();
    }, []);

    const isDraggingCell = (userId, date) => dragTargets.has(cellKey(userId, date));

    const entryApprovedCount = Object.values(entries).filter(e => e.approved_at).length;
    const totalEntryCount = Object.values(entries).length;

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title={t('roster.title')} />
            <div className="space-y-4" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">{t('roster.title')}</h2>
                    {canApprove && totalEntryCount > 0 && (
                        <div className="flex gap-2">
                            {entryApprovedCount < totalEntryCount && (
                                <button onClick={approveMonth} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-full font-medium hover:bg-green-700">{t('roster.approve_month')}</button>
                            )}
                            {entryApprovedCount > 0 && (
                                <button onClick={unapproveMonth} className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-full font-medium hover:bg-gray-50">{t('roster.unapprove_month')}</button>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm p-3">
                    <Link href={`/roster?month=${prevMonth}`} className="text-sm text-brand-600 hover:text-brand-700">&larr; {t('roster.prev')}</Link>
                    <span className="text-sm font-semibold text-gray-900">{new Date(month + '-01').toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' })}</span>
                    <Link href={`/roster?month=${nextMonth}`} className="text-sm text-brand-600 hover:text-brand-700">{t('roster.next')} &rarr;</Link>
                </div>

                <div className="flex gap-2">
                    {['all', 'technician', 'eng-admin', 'chief-engineer'].map(r => (
                        <button
                            key={r}
                            onClick={() => setRoleFilter(r)}
                            className={`text-xs px-3 py-1.5 rounded-full font-medium ${roleFilter === r ? 'bg-brand-400 text-white' : 'bg-white text-gray-600 border border-gray-300'}`}
                        >
                            {r === 'all' ? t('roster.all') : r === 'eng-admin' ? t('roster.role_eng_admin') : r === 'chief-engineer' ? t('roster.role_chief') : t('roster.role_technician')}
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-2xl shadow-sm overflow-x-auto select-none">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="sticky left-0 bg-gray-50 z-10 text-left py-2 px-2 font-medium text-gray-500 min-w-[120px]">{t('roster.name')}</th>
                                {days.map((d, i) => (
                                    <th key={i} className={`text-center py-1 px-1 font-medium min-w-[40px] ${d.dow === 0 ? 'text-red-400' : 'text-gray-500'}`}>
                                        <div>{lang === 'id' ? DOW_ID[d.dow] : dayNames[d.dow]}</div>
                                        <div className="text-[10px]">{d.day}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={days.length + 1} className="text-center py-8 text-gray-400">{t('roster.no_users')}</td></tr>
                            ) : filtered.map(u => (
                                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                                    <td className="sticky left-0 bg-white hover:bg-gray-50 z-10 py-1.5 px-2 font-medium text-gray-800 text-[11px] whitespace-nowrap">{u.name}</td>
                                    {days.map((d, i) => {
                                        const entry = getEntry(u.id, d.date);
                                        const isPast = d.date < new Date().toISOString().slice(0, 10);
                                        const dragging = isDraggingCell(u.id, d.date);
                                        const approved = entry?.approved_at != null;
                                        return (
                                            <td
                                                key={i}
                                                className={`text-center py-1 px-0.5 ${d.dow === 0 ? 'bg-red-50' : ''} ${isPast ? 'opacity-60' : ''} ${dragging ? 'ring-2 ring-blue-400 bg-brand-50' : ''} ${approved ? 'bg-green-50' : ''}`}
                                                onMouseEnter={() => handleMouseMove(u.id, d.date, isPast)}
                                            >
                                                {!isPast && (
                                                    <div
                                                        className={`cursor-pointer ${entry ? '' : 'hover:bg-brand-50 rounded'} ${approved && !canApprove ? 'cursor-not-allowed' : ''}`}
                                                        onMouseDown={(e) => { e.preventDefault(); handleMouseDown(u.id, d.date, entry); }}
                                                        onClick={() => { if (!draggedRef.current) openModal(u.id, d.date); }}
                                                    >
                                                        {entry ? (
                                                            <div className={`inline-block px-1 py-0.5 rounded relative ${shiftColors[entry.shift] ?? 'bg-gray-100'}`}>
                                                                {formatCell(entry)}
                                                                {approved && (
                                                                    <span className="absolute -top-1 -right-1 text-[8px] text-green-600" title="Approved">&#10003;</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className={`text-sm leading-6 ${approved ? 'text-gray-300' : 'text-gray-300 hover:text-brand-600'}`}>+</span>
                                                        )}
                                                    </div>
                                                )}
                                                {isPast && entry && (
                                                    <div className={`inline-block px-1 py-0.5 rounded relative ${shiftColors[entry.shift] ?? 'bg-gray-100'}`}>
                                                        {formatCell(entry)}
                                                        {approved && (
                                                            <span className="absolute -top-1 -right-1 text-[8px] text-green-600" title="Approved">&#10003;</span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            {[
                                { label: 'M', shifts: ['morning'], dot: 'bg-yellow-200', alertWhenZero: true },
                                { label: 'A', shifts: ['afternoon'], dot: 'bg-orange-200', alertWhenZero: true },
                                { label: 'N', shifts: ['night'], dot: 'bg-indigo-200', alertWhenZero: true },
                                { label: 'Off', shifts: ['off', 'leave', 'extra_off'], dot: 'bg-gray-300', alertWhenZero: false },
                            ].map(row => (
                                <tr key={row.label} className="border-t border-gray-200 bg-gray-50/60">
                                    <td className="sticky left-0 bg-gray-50 z-10 py-1 px-2 text-[10px] font-semibold text-gray-600 whitespace-nowrap">
                                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${row.dot} mr-1 align-middle`}></span>{row.label}
                                    </td>
                                    {days.map((d, i) => {
                                        const n = filtered.reduce((c, u) => {
                                            const s = getEntry(u.id, d.date)?.shift;
                                            return c + (s && row.shifts.includes(s) ? 1 : 0);
                                        }, 0);
                                        return (
                                            <td key={i} className="text-center py-1 px-0.5 text-[10px] font-semibold text-gray-600">
                                                {n > 0 ? n : row.alertWhenZero ? (
                                                    <span title={`${t('roster.no_coverage')}: ${row.label === 'M' ? t('roster.morning') : row.label === 'A' ? t('roster.afternoon') : t('roster.night')}`} className="inline-flex align-middle">
                                                        <TriangleAlert size={13} className="text-amber-500" />
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300">–</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tfoot>
                    </table>
                </div>

                {modal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setModal(null)}>
                        <div className="bg-white rounded-2xl shadow-xl p-5 w-80 space-y-3" onClick={e => e.stopPropagation()}>
                            <h3 className="text-sm font-semibold text-gray-900">
                                {modal.approved ? t('roster.view_shift') : modal.entryId ? t('roster.edit_shift') : t('roster.assign_shift')}
                                <span className="text-gray-500 font-normal"> — {modal.date}</span>
                            </h3>

                            {modal.approved && !canApprove && (
                                <p className="text-xs text-green-700 bg-green-50 rounded-xl px-3 py-2">{t('roster.approved_locked')}</p>
                            )}

                            {modal.approved && canApprove && (
                                <p className="text-xs text-green-700 bg-green-50 rounded-xl px-3 py-2">{t('roster.approved_editable')}</p>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('roster.shift')}</label>
                                <select value={modal.shift} onChange={e => updateShift(e.target.value)} className="w-full border border-gray-300 rounded-xl px-2 py-1.5 text-sm" disabled={modal.approved && !canApprove}>
                                    <option value="morning">{t('roster.morning')}</option>
                                    <option value="afternoon">{t('roster.afternoon')}</option>
                                    <option value="night">{t('roster.night')}</option>
                                    <option value="off">{t('roster.off')}</option>
                                    <option value="leave">{t('roster.leave')}</option>
                                    <option value="extra_off">{t('roster.extra_off')}</option>
                                </select>
                            </div>

                            {!noBlockShifts.includes(modal.shift) && (
                                <div className="space-y-2">
                                    <label className="block text-xs font-medium text-gray-600">{t('roster.time_blocks')}</label>
                                    {modal.blocks.map((block, i) => (
                                        <div key={i} className="flex items-center gap-1">
                                            <input type="time" value={block.in} onChange={e => updateBlock(i, 'in', e.target.value)} className="flex-1 border border-gray-300 rounded-xl px-2 py-1.5 text-sm" disabled={modal.approved && !canApprove} />
                                            <span className="text-gray-400 text-xs">&rarr;</span>
                                            <input type="time" value={block.out} onChange={e => updateBlock(i, 'out', e.target.value)} className="flex-1 border border-gray-300 rounded-xl px-2 py-1.5 text-sm" disabled={modal.approved && !canApprove} />
                                            {modal.blocks.length > 1 && (
                                                <button onClick={() => removeBlock(i)} className="text-red-400 hover:text-red-600 text-sm px-1" disabled={modal.approved && !canApprove}>&times;</button>
                                            )}
                                        </div>
                                    ))}
                                    <button onClick={addBlock} className="text-xs text-brand-600 hover:text-brand-700 font-medium" disabled={modal.approved && !canApprove}>{t('roster.add_block')}</button>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('roster.apply_through')}</label>
                                <input type="date" value={modal.endDate ?? modal.date} min={modal.date} onChange={e => setModal(m => ({ ...m, endDate: e.target.value || m.date }))} className="w-full border border-gray-300 rounded-xl px-2 py-1.5 text-sm" disabled={modal.approved && !canApprove} />
                                {modal.endDate && modal.endDate > modal.date && (
                                    <p className="text-[11px] text-brand-600 mt-1">{t('roster.applies')} {modal.date} → {modal.endDate} {t('roster.range_same')}</p>
                                )}
                            </div>

                            {apiError && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{apiError}</p>}

                            <div className="flex gap-2 pt-1">
                                {canApprove && modal.entryId && (
                                    <button
                                        onClick={() => modal.approved ? unapproveEntry(modal.entryId) : approveEntry(modal.entryId)}
                                        className={`flex-1 rounded-xl py-1.5 text-sm font-medium ${modal.approved ? 'border border-orange-300 text-orange-600 hover:bg-orange-50' : 'bg-green-600 text-white hover:bg-green-700'}`}
                                    >
                                        {modal.approved ? t('roster.unapprove') : t('roster.approve')}
                                    </button>
                                )}
                                {(!modal.approved || canApprove) && (
                                    <>
                                        {modal.entryId && (
                                            <button onClick={remove} className="flex-1 border border-red-300 text-red-600 rounded-xl py-1.5 text-sm font-medium hover:bg-red-50">{t('roster.remove')}</button>
                                        )}
                                        <button onClick={save} className="flex-1 bg-brand-400 text-white rounded-xl py-1.5 text-sm font-medium hover:bg-brand-600">{t('roster.save')}</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm p-4 text-xs text-gray-500">
                    <p className="font-medium text-gray-700 mb-1">{t('roster.legend')}</p>
                    <div className="flex gap-4">
                        <span><span className="inline-block w-4 h-4 rounded bg-yellow-200 align-middle mr-1"></span> {t('roster.morning')} (9h)</span>
                        <span><span className="inline-block w-4 h-4 rounded bg-orange-200 align-middle mr-1"></span> {t('roster.afternoon')} (9h)</span>
                        <span><span className="inline-block w-4 h-4 rounded bg-indigo-200 align-middle mr-1"></span> {t('roster.night')} (9h)</span>
                        <span><span className="inline-block w-4 h-4 rounded bg-gray-200 align-middle mr-1"></span> {t('roster.off')}</span>
                        <span><span className="inline-block w-4 h-4 rounded bg-pink-200 align-middle mr-1"></span> {t('roster.leave')}</span>
                        <span><span className="inline-block w-4 h-4 rounded bg-teal-200 align-middle mr-1"></span> {t('roster.extra_off')}</span>
                        <span><span className="inline-block w-3 h-3 rounded border-2 border-green-500 align-middle mr-1"></span> {t('roster.approved')}</span>
                    </div>
                    <p className="mt-2">{t('roster.click_hint')} <strong>Drag</strong> {lang === 'id' ? 'dari sel yang terisi ke sel lain untuk menyalin jadwal. Tanggal lampau diredupkan.' : 'from an assigned cell across others to copy the schedule. Past dates are dimmed.'}</p>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
