import { useState, useRef, useCallback } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

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
                    shift: modal.shift,
                    time_blocks: noBlockShifts.includes(modal.shift) ? [] : modal.blocks,
                }),
            });
            if (res.ok) { setModal(null); router.reload(); return; }
            const data = await res.json();
            setApiError(data.message || 'Failed to save.');
        } catch { setApiError('Network error.'); }
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
                setApiError('Cannot remove the last ' + entry.shift + ' shift for this date.');
                return;
            }
        }

        try {
            const res = await fetch(`/api/v1/roster/${entry.id}`, { method: 'DELETE', headers: { 'X-CSRF-TOKEN': csrf() } });
            if (res.ok) { setModal(null); router.reload(); return; }
            const data = await res.json();
            setApiError(data.message || 'Failed to remove.');
        } catch { setApiError('Network error.'); }
    };

    const approveEntry = async (entryId) => {
        const res = await fetch('/api/v1/roster/approve', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
            body: JSON.stringify({ entry_id: entryId }),
        });
        if (res.ok) { setModal(null); router.reload(); }
        else { const d = await res.json(); setApiError(d.message || 'Failed to approve.'); }
    };

    const unapproveEntry = async (entryId) => {
        const res = await fetch('/api/v1/roster/unapprove', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
            body: JSON.stringify({ entry_id: entryId }),
        });
        if (res.ok) { setModal(null); router.reload(); }
        else { const d = await res.json(); setApiError(d.message || 'Failed to unapprove.'); }
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
            blocks[idx] = { ...blocks[idx], [field]: val };
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
            <Head title="Roster" />
            <div className="space-y-4" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Monthly Roster</h2>
                    {canApprove && totalEntryCount > 0 && (
                        <div className="flex gap-2">
                            {entryApprovedCount < totalEntryCount && (
                                <button onClick={approveMonth} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-full font-medium hover:bg-green-700">Approve Month</button>
                            )}
                            {entryApprovedCount > 0 && (
                                <button onClick={unapproveMonth} className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-full font-medium hover:bg-gray-50">Unapprove Month</button>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm p-3">
                    <Link href={`/roster?month=${prevMonth}`} className="text-sm text-brand-600 hover:text-brand-700">&larr; Prev</Link>
                    <span className="text-sm font-semibold text-gray-900">{new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                    <Link href={`/roster?month=${nextMonth}`} className="text-sm text-brand-600 hover:text-brand-700">Next &rarr;</Link>
                </div>

                <div className="flex gap-2">
                    {['all', 'technician', 'eng-admin', 'chief-engineer'].map(r => (
                        <button
                            key={r}
                            onClick={() => setRoleFilter(r)}
                            className={`text-xs px-3 py-1.5 rounded-full font-medium ${roleFilter === r ? 'bg-brand-400 text-white' : 'bg-white text-gray-600 border border-gray-300'}`}
                        >
                            {r === 'all' ? 'All' : r === 'eng-admin' ? 'Eng Admin' : r === 'chief-engineer' ? 'Chief Eng' : 'Technician'}
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-2xl shadow-sm overflow-x-auto select-none">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="sticky left-0 bg-gray-50 z-10 text-left py-2 px-2 font-medium text-gray-500 min-w-[120px]">Name</th>
                                {days.map((d, i) => (
                                    <th key={i} className={`text-center py-1 px-1 font-medium min-w-[40px] ${d.dow === 0 ? 'text-red-400' : 'text-gray-500'}`}>
                                        <div>{dayNames[d.dow]}</div>
                                        <div className="text-[10px]">{d.day}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={days.length + 1} className="text-center py-8 text-gray-400">No users found for this role.</td></tr>
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
                    </table>
                </div>

                {modal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setModal(null)}>
                        <div className="bg-white rounded-2xl shadow-xl p-5 w-80 space-y-3" onClick={e => e.stopPropagation()}>
                            <h3 className="text-sm font-semibold text-gray-900">
                                {modal.approved ? 'View Shift' : modal.entryId ? 'Edit Shift' : 'Assign Shift'}
                                <span className="text-gray-500 font-normal"> — {modal.date}</span>
                            </h3>

                            {modal.approved && !canApprove && (
                                <p className="text-xs text-green-700 bg-green-50 rounded-xl px-3 py-2">This entry has been approved by the Chief Engineer and cannot be edited.</p>
                            )}

                            {modal.approved && canApprove && (
                                <p className="text-xs text-green-700 bg-green-50 rounded-xl px-3 py-2">This entry is approved. You can edit or unapprove it.</p>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Shift</label>
                                <select value={modal.shift} onChange={e => updateShift(e.target.value)} className="w-full border border-gray-300 rounded-xl px-2 py-1.5 text-sm" disabled={modal.approved && !canApprove}>
                                    <option value="morning">Morning</option>
                                    <option value="afternoon">Afternoon</option>
                                    <option value="night">Night</option>
                                    <option value="off">Off</option>
                                    <option value="leave">Leave</option>
                                    <option value="extra_off">Extra Off</option>
                                </select>
                            </div>

                            {!noBlockShifts.includes(modal.shift) && (
                                <div className="space-y-2">
                                    <label className="block text-xs font-medium text-gray-600">Time Blocks</label>
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
                                    <button onClick={addBlock} className="text-xs text-brand-600 hover:text-brand-700 font-medium" disabled={modal.approved && !canApprove}>+ Add Block</button>
                                </div>
                            )}

                            {apiError && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{apiError}</p>}

                            <div className="flex gap-2 pt-1">
                                {canApprove && modal.entryId && (
                                    <button
                                        onClick={() => modal.approved ? unapproveEntry(modal.entryId) : approveEntry(modal.entryId)}
                                        className={`flex-1 rounded-xl py-1.5 text-sm font-medium ${modal.approved ? 'border border-orange-300 text-orange-600 hover:bg-orange-50' : 'bg-green-600 text-white hover:bg-green-700'}`}
                                    >
                                        {modal.approved ? 'Unapprove' : 'Approve'}
                                    </button>
                                )}
                                {(!modal.approved || canApprove) && (
                                    <>
                                        {modal.entryId && (
                                            <button onClick={remove} className="flex-1 border border-red-300 text-red-600 rounded-xl py-1.5 text-sm font-medium hover:bg-red-50">Remove</button>
                                        )}
                                        <button onClick={save} className="flex-1 bg-brand-400 text-white rounded-xl py-1.5 text-sm font-medium hover:bg-brand-600">Save</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm p-4 text-xs text-gray-500">
                    <p className="font-medium text-gray-700 mb-1">Legend</p>
                    <div className="flex gap-4">
                        <span><span className="inline-block w-4 h-4 rounded bg-yellow-200 align-middle mr-1"></span> Morning (9h)</span>
                        <span><span className="inline-block w-4 h-4 rounded bg-orange-200 align-middle mr-1"></span> Afternoon (9h)</span>
                        <span><span className="inline-block w-4 h-4 rounded bg-indigo-200 align-middle mr-1"></span> Night (9h)</span>
                        <span><span className="inline-block w-4 h-4 rounded bg-gray-200 align-middle mr-1"></span> Off</span>
                        <span><span className="inline-block w-4 h-4 rounded bg-pink-200 align-middle mr-1"></span> Leave</span>
                        <span><span className="inline-block w-4 h-4 rounded bg-teal-200 align-middle mr-1"></span> Extra Off</span>
                        <span><span className="inline-block w-3 h-3 rounded border-2 border-green-500 align-middle mr-1"></span> Approved</span>
                    </div>
                    <p className="mt-2">Click a cell to edit. <strong>Drag</strong> from an assigned cell across others to copy the schedule. Past dates are dimmed.</p>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
