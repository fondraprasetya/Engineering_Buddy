import { useState, useEffect, useCallback, useRef } from 'react';
import { Head } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

export default function Index({ auth, venues = [] }) {
    const today = new Date();
    const [view, setView] = useState('month');
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [focusDate, setFocusDate] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [inputType, setInputType] = useState('event');
    const [deleting, setDeleting] = useState(false);
    const [prevMtd, setPrevMtd] = useState(null);
    const [statEventId, setStatEventId] = useState(null);
    const fetchingPrev = useRef(false);

    const mtdMapping = [
        { daily: 'room_occupied', mtd: 'mtd_room_occupied' },
        { daily: 'room_available', mtd: 'mtd_room_available' },
        { daily: 'guest_count', mtd: 'mtd_guest_count' },
        { daily: 'restaurant_customer_count', mtd: 'mtd_restaurant_customer_count' },
        { daily: 'meeting_customer_count', mtd: 'mtd_mice_customer' },
    ];

    const [form, setForm] = useState({
        title: '',
        description: '',
        start_datetime: '',
        end_datetime: '',
        all_day: false,
        color: '#3B82F6',
        venue: '',
        type: '',
        room_occupied: '',
        guest_count: '',
        restaurant_customer_count: '',
        meeting_customer_count: '',
        room_available: '',
        mtd_room_occupied: '',
        mtd_room_available: '',
        mtd_guest_count: '',
        mtd_restaurant_customer_count: '',
        mtd_mice_customer: '',
        pax: '',
        file: null,
    });

    const fetchPrevMtd = useCallback(async (dateStr) => {
        if (!dateStr || fetchingPrev.current) return;
        fetchingPrev.current = true;
        const d = new Date(dateStr + 'T12:00:00');
        d.setDate(d.getDate() - 1);
        const prev = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        try {
            const s = new Date(prev + 'T00:00:00');
            const e = new Date(prev + 'T23:59:59');
            const res = await fetch(`/calendar/events?start=${s.toISOString()}&end=${e.toISOString()}`);
            const data = await res.json();
            const evt = data.find(x => x.mtd_room_occupied != null) || null;
            setPrevMtd(evt ? {
                mtd_room_occupied: parseInt(evt.mtd_room_occupied) || 0,
                mtd_room_available: parseInt(evt.mtd_room_available) || 0,
                mtd_guest_count: parseInt(evt.mtd_guest_count) || 0,
                mtd_restaurant_customer_count: parseInt(evt.mtd_restaurant_customer_count) || 0,
                mtd_mice_customer: parseInt(evt.mtd_mice_customer) || 0,
            } : { mtd_room_occupied: 0, mtd_room_available: 0, mtd_guest_count: 0, mtd_restaurant_customer_count: 0, mtd_mice_customer: 0 });
        } catch {
            setPrevMtd({ mtd_room_occupied: 0, mtd_room_available: 0, mtd_guest_count: 0, mtd_restaurant_customer_count: 0, mtd_mice_customer: 0 });
        } finally {
            fetchingPrev.current = false;
        }
    }, []);

    useEffect(() => {
        if (inputType === 'statistic' && selectedDate) {
            setPrevMtd(null);
            fetchPrevMtd(selectedDate);

            const existing = events.find(e => {
                const s = new Date(e.start_datetime);
                const ymd = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;
                return ymd === selectedDate && e.mtd_room_occupied != null;
            });

            if (existing) {
                setStatEventId(existing.id);
                setForm(f => ({
                    ...f,
                    room_occupied: existing.room_occupied ?? '',
                    guest_count: existing.guest_count ?? '',
                    restaurant_customer_count: existing.restaurant_customer_count ?? '',
                    meeting_customer_count: existing.meeting_customer_count ?? '',
                    room_available: existing.room_available ?? '',
                    mtd_room_occupied: existing.mtd_room_occupied ?? '',
                    mtd_room_available: existing.mtd_room_available ?? '',
                    mtd_guest_count: existing.mtd_guest_count ?? '',
                    mtd_restaurant_customer_count: existing.mtd_restaurant_customer_count ?? '',
                    mtd_mice_customer: existing.mtd_mice_customer ?? '',
                }));
            } else {
                setStatEventId(null);
            }
        } else if (inputType !== 'statistic') {
            setStatEventId(null);
        }
    }, [selectedDate, inputType, events, fetchPrevMtd]);

    const computeDaily = (mtdField, dailyField) => {
        const current = parseInt(form[mtdField]) || 0;
        const prev = prevMtd ? (parseInt(prevMtd[mtdField]) || 0) : 0;
        return current - prev;
    };

    const handleMtdChange = (field, value) => {
        setForm(f => {
            const updated = { ...f, [field]: value };
            if (prevMtd) {
                for (const { daily, mtd } of mtdMapping) {
                    const cur = parseInt(updated[mtd]) || 0;
                    const prev = parseInt(prevMtd[mtd]) || 0;
                    updated[daily] = cur - prev;
                }
            }
            return updated;
        });
    };

    const role = auth.user.roles?.[0] ?? 'employee';
    const isAdmin = role === 'eng-admin' || role === 'super-admin';

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        let start, end;
        if (view === 'day') {
            start = new Date(focusDate.getFullYear(), focusDate.getMonth(), focusDate.getDate());
            end = new Date(focusDate.getFullYear(), focusDate.getMonth(), focusDate.getDate(), 23, 59, 59);
        } else if (view === 'week') {
            const dow = focusDate.getDay();
            start = new Date(focusDate.getFullYear(), focusDate.getMonth(), focusDate.getDate() - dow);
            end = new Date(focusDate.getFullYear(), focusDate.getMonth(), focusDate.getDate() + (6 - dow), 23, 59, 59);
        } else {
            start = new Date(year, month, 1);
            end = new Date(year, month + 1, 0, 23, 59, 59);
        }
        try {
            const res = await fetch(`/calendar/events?start=${start.toISOString()}&end=${end.toISOString()}`);
            const data = await res.json();
            setEvents(data);
        } catch (e) {
            console.error('Failed to fetch events', e);
        } finally {
            setLoading(false);
        }
    }, [view, focusDate, year, month]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const eventsForDate = (day, offset = 0) => {
        const date = new Date(year, month + offset, day);
        return events.filter(e => {
            const s = new Date(e.start_datetime);
            return s.getFullYear() === date.getFullYear() && s.getMonth() === date.getMonth() && s.getDate() === date.getDate();
        });
    };

    const eventsForDay = (d) => events.filter(e => {
        const s = new Date(e.start_datetime);
        return s.getFullYear() === d.getFullYear() && s.getMonth() === d.getMonth() && s.getDate() === d.getDate();
    });

    const goPrev = () => {
        if (view === 'day') {
            setFocusDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
        } else if (view === 'week') {
            setFocusDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7));
        } else {
            if (month === 0) { setYear(y => y - 1); setMonth(11); } else { setMonth(m => m - 1); }
        }
    };

    const goNext = () => {
        if (view === 'day') {
            setFocusDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
        } else if (view === 'week') {
            setFocusDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7));
        } else {
            if (month === 11) { setYear(y => y + 1); setMonth(0); } else { setMonth(m => m + 1); }
        }
    };

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const pad = [...Array(firstDay).keys()].map(i => daysInPrevMonth - firstDay + 1 + i);
    const grid = [...Array(daysInMonth).keys()].map(i => i + 1);
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const remaining = totalCells - firstDay - daysInMonth;

    const openCreateModal = (day, offset = 0, tab = 'event') => {
        const d = typeof day === 'object' ? day : new Date(year, month + offset, day);
        const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        setPrevMtd(null);
        setSelectedDate(ymd);
        setEditingEvent(null);
        setInputType(tab);
        setForm({
            title: '',
            description: '',
            start_datetime: `${ymd}T08:00`,
            end_datetime: `${ymd}T09:00`,
            all_day: false,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            venue: '',
            type: '',
            room_occupied: '',
            guest_count: '',
            restaurant_customer_count: '',
            meeting_customer_count: '',
            room_available: '',
            mtd_room_occupied: '',
            mtd_room_available: '',
            mtd_guest_count: '',
            mtd_restaurant_customer_count: '',
            mtd_mice_customer: '',
            pax: '',
            file: null,
        });
        setStatEventId(null);
        setShowModal(true);
    };

    const openEditModal = (e, tab) => {
        setPrevMtd(null);
        setSelectedDate(null);
        setEditingEvent(e);
        setInputType(tab ?? (e.mtd_room_occupied != null ? 'statistic' : 'event'));
        setForm({
            title: e.title,
            description: e.description || '',
            start_datetime: e.start_datetime.slice(0, 16),
            end_datetime: e.end_datetime.slice(0, 16),
            all_day: e.all_day,
            color: e.color || '#3B82F6',
            venue: e.venue || '',
            type: e.type || '',
            room_occupied: e.room_occupied ?? '',
            guest_count: e.guest_count ?? '',
            restaurant_customer_count: e.restaurant_customer_count ?? '',
            meeting_customer_count: e.meeting_customer_count ?? '',
            room_available: e.room_available ?? '',
            mtd_room_occupied: e.mtd_room_occupied ?? '',
            mtd_room_available: e.mtd_room_available ?? '',
            mtd_guest_count: e.mtd_guest_count ?? '',
            mtd_restaurant_customer_count: e.mtd_restaurant_customer_count ?? '',
            mtd_mice_customer: e.mtd_mice_customer ?? '',
            pax: e.pax ?? '',
            file: null,
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingEvent(null);
        setSelectedDate(null);
        setInputType('event');
        setPrevMtd(null);
        setStatEventId(null);
        setDeleting(false);
    };

    const [formError, setFormError] = useState(null);

    const cleanPayload = (raw) => {
        const p = { ...raw };
        for (const k of Object.keys(p)) {
            if (p[k] === '' || p[k] === undefined) {
                p[k] = null;
            }
        }
        return p;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        const editId = editingEvent?.id ?? statEventId;
        const url = editId ? `/calendar/events/${editId}` : '/calendar/events';
        const method = editId ? 'PUT' : 'POST';

        const isStat = inputType === 'statistic';
        const statDate = selectedDate || editingEvent?.start_datetime?.slice(0, 10);
        const hasFile = form.file instanceof File;

        let body;
        const headers = { 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content, 'Accept': 'application/json' };

        if (isStat) {
            const payload = cleanPayload({
                title: form.title || 'Daily Statistics',
                all_day: 1,
                start_datetime: `${statDate}T00:00`,
                end_datetime: `${statDate}T23:59`,
                description: '',
                venue: '',
                type: '',
                color: form.color || '#10B981',
                room_occupied: form.room_occupied,
                guest_count: form.guest_count,
                restaurant_customer_count: form.restaurant_customer_count,
                meeting_customer_count: form.meeting_customer_count,
                room_available: form.room_available,
                mtd_room_occupied: form.mtd_room_occupied,
                mtd_room_available: form.mtd_room_available,
                mtd_guest_count: form.mtd_guest_count,
                mtd_restaurant_customer_count: form.mtd_restaurant_customer_count,
                mtd_mice_customer: form.mtd_mice_customer,
            });

            if (hasFile) {
                const fd = new FormData();
                fd.append('file', form.file);
                fd.append('_method', method === 'PUT' ? 'PUT' : 'POST');
                for (const [k, v] of Object.entries(payload)) {
                    if (v === null || v === undefined) continue;
                    fd.append(k, v);
                }
                body = fd;
            } else {
                body = JSON.stringify(payload);
                headers['Content-Type'] = 'application/json';
            }
        } else {
            const raw = { ...form, file: undefined, all_day: form.all_day ? 1 : 0 };
            delete raw.file;
            // Strip MTD/daily fields to prevent leaking from statistic tab
            const statFields = ['room_occupied','guest_count','restaurant_customer_count','meeting_customer_count','room_available','mtd_room_occupied','mtd_room_available','mtd_guest_count','mtd_restaurant_customer_count','mtd_mice_customer'];
            for (const f of statFields) delete raw[f];
            const payload = cleanPayload(raw);

            if (hasFile) {
                const fd = new FormData();
                fd.append('file', form.file);
                fd.append('_method', method === 'PUT' ? 'PUT' : 'POST');
                for (const [k, v] of Object.entries(payload)) {
                    if (v === null || v === undefined) continue;
                    fd.append(k, v);
                }
                body = fd;
            } else {
                body = JSON.stringify(payload);
                headers['Content-Type'] = 'application/json';
            }
        }

        const res = await fetch(url, {
            method: hasFile ? 'POST' : method,
            headers,
            body,
        });

        if (res.ok) {
            closeModal();
            fetchEvents();
        } else {
            const data = await res.json().catch(() => ({}));
            const msg = data?.message || data?.errors ? Object.values(data.errors).flat().join(', ') : 'Failed to save event';
            setFormError(msg);
        }
    };

    const handleDelete = async () => {
        if (!editingEvent) return;
        setDeleting(true);
        await fetch(`/calendar/events/${editingEvent.id}`, {
            method: 'DELETE',
            headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content },
        });
        closeModal();
        fetchEvents();
    };

    const renderCell = (day, offset = 0, isCurrent = true) => {
        const evts = eventsForDate(day, offset);
        const dateObj = new Date(year, month + offset, day);
        const isToday = dateObj.toDateString() === today.toDateString();
        const isPast = offset < 0 || (offset === 0 && day < today.getDate() && month === today.getMonth() && year === today.getFullYear());

        return (
            <div
                key={`${offset}-${day}`}
                onClick={() => openCreateModal(day, offset)}
                className={`min-h-[90px] p-1 border border-gray-100 cursor-pointer transition-colors ${
                    isCurrent ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 text-gray-400 hover:bg-brand-50'
                } ${isToday ? 'ring-2 ring-brand-400 ring-inset' : ''}`}
            >
                <span className={`text-xs font-medium ${isToday ? 'text-brand-600' : ''} ${isPast && isCurrent ? 'text-gray-300' : ''}`}>
                    {day}
                </span>
                <div className="mt-1 space-y-0.5">
                    {evts.slice(0, 3).map(evt => (
                        <button
                            key={evt.id}
                            onClick={(e) => { e.stopPropagation(); openEditModal(evt); }}
                            className="block w-full text-left truncate rounded px-1 py-0.5 text-xs font-medium text-white hover:opacity-80"
                            style={{ backgroundColor: evt.color || '#3B82F6' }}
                        >
                            {evt.all_day ? '' : new Date(evt.start_datetime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' '}
                            {evt.title}
                        </button>
                    ))}
                    {evts.length > 3 && (
                        <span className="text-xs text-gray-400 pl-1">+{evts.length - 3} more</span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Calendar" />

            <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-0.5">
                        {['day','week','month'].map(v => (
                            <button key={v} onClick={() => {
                                if (v !== 'month' && view === 'month') setFocusDate(new Date(year, month, 1));
                                if (v === 'month' && view !== 'month') { setYear(focusDate.getFullYear()); setMonth(focusDate.getMonth()); }
                                setView(v);
                            }}
                                className={`px-3 py-1 text-xs font-medium rounded-md capitalize ${view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                {v}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={goPrev} className="p-2 rounded-xl hover:bg-brand-50 text-gray-600">
                            <ChevronLeft size={20} />
                        </button>
                        {view === 'day' && (
                            <span className="text-base font-medium min-w-[200px] text-center">
                                {focusDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                        )}
                        {view === 'week' && (
                            <span className="text-base font-medium min-w-[200px] text-center">
                                Week of {new Date(focusDate.getFullYear(), focusDate.getMonth(), focusDate.getDate() - focusDate.getDay()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                        )}
                        {view === 'month' && (
                            <span className="text-base font-medium min-w-[180px] text-center">
                                {MONTHS[month]} {year}
                            </span>
                        )}
                        <button onClick={goNext} className="p-2 rounded-xl hover:bg-brand-50 text-gray-600">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">Loading...</div>
                ) : view === 'day' ? (
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <div className="flex gap-2 p-2 border-b border-gray-100">
                            <button onClick={() => openCreateModal(focusDate, 0, 'event')}
                                className="px-3 py-1 text-xs font-medium text-white bg-brand-400 rounded-xl hover:bg-brand-600">
                                + Create Event
                            </button>
                            <button onClick={() => openCreateModal(focusDate, 0, 'statistic')}
                                className="px-3 py-1 text-xs font-medium text-green-700 bg-green-50 rounded-xl hover:bg-green-100">
                                Record Statistic
                            </button>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {eventsForDay(focusDate).length === 0 ? (
                                <div className="p-8 text-center text-gray-400 text-sm">No events for this day</div>
                            ) : eventsForDay(focusDate).map(evt => (
                                <div key={evt.id}
                                    onClick={() => openEditModal(evt)}
                                    className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                                    <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: evt.color || '#3B82F6' }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 truncate">{evt.title}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {evt.all_day ? 'All day' : (
                                                new Date(evt.start_datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) +
                                                ' – ' +
                                                new Date(evt.end_datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                            )}
                                        </div>
                                        {evt.description && <div className="text-xs text-gray-400 mt-0.5 truncate">{evt.description}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : view === 'week' ? (
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <div className="grid grid-cols-7 border-b border-gray-200">
                            {DAYS.map((d, i) => {
                                const dayDate = new Date(focusDate.getFullYear(), focusDate.getMonth(), focusDate.getDate() - focusDate.getDay() + i);
                                const isToday = dayDate.toDateString() === today.toDateString();
                                return (
                                    <div key={d} className={`text-center py-2 border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-blue-50' : ''}`}>
                                        <div className="text-xs font-medium text-gray-500 uppercase">{d}</div>
                                        <div className={`text-sm font-semibold ${isToday ? 'text-brand-600' : 'text-gray-800'}`}>{dayDate.getDate()}</div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="grid grid-cols-7">
                            {DAYS.map((d, i) => {
                                const dayDate = new Date(focusDate.getFullYear(), focusDate.getMonth(), focusDate.getDate() - focusDate.getDay() + i);
                                const evts = eventsForDay(dayDate);
                                return (
                                    <div key={d} onClick={() => openCreateModal(dayDate)} className="min-h-[120px] p-1 border-r border-gray-100 last:border-r-0 cursor-pointer hover:bg-blue-50 transition-colors">
                                        {evts.slice(0, 4).map(evt => (
                                            <button key={evt.id}
                                                onClick={(e) => { e.stopPropagation(); openEditModal(evt); }}
                                                className="block w-full text-left truncate rounded px-1 py-0.5 text-xs font-medium text-white hover:opacity-80 mb-0.5"
                                                style={{ backgroundColor: evt.color || '#3B82F6' }}>
                                                {evt.all_day ? '' : new Date(evt.start_datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' '}
                                                {evt.title}
                                            </button>
                                        ))}
                                        {evts.length > 4 && <span className="text-xs text-gray-400">+{evts.length - 4} more</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <div className="grid grid-cols-7 border-b border-gray-200">
                            {DAYS.map(d => (
                                <div key={d} className="text-center text-xs font-medium text-gray-500 py-2 uppercase tracking-wider">{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7">
                            {pad.map(d => renderCell(d, -1, false))}
                            {grid.map(d => renderCell(d, 0, true))}
                            {remaining > 0 && [...Array(remaining).keys()].map(i => renderCell(i + 1, 1, false))}
                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showModal && (
                    <>
                        <div className="fixed inset-0 bg-black/30 z-40" onClick={closeModal} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-x-4 top-10 bottom-10 sm:inset-x-auto sm:left-1/2 sm:top-20 sm:bottom-auto sm:-translate-x-1/2 sm:w-full sm:max-w-md z-50 bg-white rounded-2xl shadow-xl overflow-y-auto"
                        >
                            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200">
                                <h3 className="text-sm font-semibold text-gray-900">{editingEvent ? 'Edit Event' : (inputType === 'statistic' ? (statEventId ? 'Edit Statistic' : 'Record Statistic') : 'New Event')}</h3>
                                <button onClick={closeModal} className="p-0.5 rounded-xl hover:bg-brand-50 text-gray-500"><X size={16} /></button>
                            </div>

                            {!editingEvent && (
                                <div className="flex border-b border-gray-200">
                                    <button type="button" onClick={() => setInputType('event')}
                                        className={`flex-1 py-2 text-xs font-medium text-center ${inputType === 'event' ? 'text-brand-600 border-b-2 border-brand-400' : 'text-gray-500 hover:text-gray-700'}`}>
                                        Create Event
                                    </button>
                                    <button type="button" onClick={() => setInputType('statistic')}
                                        className={`flex-1 py-2 text-xs font-medium text-center ${inputType === 'statistic' ? 'text-brand-600 border-b-2 border-brand-400' : 'text-gray-500 hover:text-gray-700'}`}>
                                        Record Statistic
                                    </button>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="p-3 space-y-1.5">
                                {formError && (
                                    <div className="bg-red-50 text-red-600 text-xs rounded-xl p-2">{formError}</div>
                                )}
                                {inputType === 'statistic' ? (
                                    <>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-0.5">Date</label>
                                            <input type="date" disabled value={selectedDate ?? ''}
                                                className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-sm bg-gray-100 text-gray-500 cursor-not-allowed" />
                                        </div>
                                        <hr className="border-gray-200" />
                                        <h4 className="text-xs font-semibold text-gray-800">MTD</h4>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-0.5">MTD Room Occupied</label>
                                                <input type="number" min="0" value={form.mtd_room_occupied} onChange={e => handleMtdChange('mtd_room_occupied', e.target.value)}
                                                    className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-400" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-0.5">MTD Room Available</label>
                                                <input type="number" min="0" value={form.mtd_room_available} onChange={e => handleMtdChange('mtd_room_available', e.target.value)}
                                                    className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-400" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-0.5">MTD Number of Guest</label>
                                                <input type="number" min="0" value={form.mtd_guest_count} onChange={e => handleMtdChange('mtd_guest_count', e.target.value)}
                                                    className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-400" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-0.5">MTD Restaurant Customer</label>
                                                <input type="number" min="0" value={form.mtd_restaurant_customer_count} onChange={e => handleMtdChange('mtd_restaurant_customer_count', e.target.value)}
                                                    className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-400" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-0.5">MTD MICE Customer</label>
                                                <input type="number" min="0" value={form.mtd_mice_customer} onChange={e => handleMtdChange('mtd_mice_customer', e.target.value)}
                                                    className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-400" />
                                            </div>
                                        </div>

                                        <hr className="border-gray-200" />

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-0.5">Room Occupied</label>
                                                <input type="number" disabled value={computeDaily('mtd_room_occupied', 'room_occupied')}
                                                    className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-sm bg-gray-100 text-gray-500 cursor-not-allowed" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-0.5">Room Available</label>
                                                <input type="number" disabled value={computeDaily('mtd_room_available', 'room_available')}
                                                    className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-sm bg-gray-100 text-gray-500 cursor-not-allowed" />
                                            </div>
                                            <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-0.5">Number of Guest</label>
                                            <input type="number" disabled value={computeDaily('mtd_guest_count', 'guest_count')}
                                                    className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-sm bg-gray-100 text-gray-500 cursor-not-allowed" />
                                            </div>
                                            <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-0.5">Restaurant Customer</label>
                                            <input type="number" disabled value={computeDaily('mtd_restaurant_customer_count', 'restaurant_customer_count')}
                                                    className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-sm bg-gray-100 text-gray-500 cursor-not-allowed" />
                                            </div>
                                            <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-0.5">Meeting Customer</label>
                                            <input type="number" disabled value={computeDaily('mtd_mice_customer', 'meeting_customer_count')}
                                                    className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-sm bg-gray-100 text-gray-500 cursor-not-allowed" />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-0.5">Title</label>
                                            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                                className="w-full rounded-xl border border-gray-300 px-2 py-1 text-sm focus:ring-2 focus:ring-brand-400" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-0.5">Description</label>
                                            <textarea rows={1} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                                className="w-full rounded-xl border border-gray-300 px-2 py-1 text-sm focus:ring-2 focus:ring-brand-400 resize-none" />
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <input type="checkbox" id="all_day" checked={form.all_day} onChange={e => setForm(f => ({ ...f, all_day: e.target.checked }))}
                                                className="rounded border-gray-300 text-brand-600 focus:ring-brand-400" />
                                            <label htmlFor="all_day" className="text-xs text-gray-700">All day</label>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-0.5">Start</label>
                                                <input type={form.all_day ? 'date' : 'datetime-local'} required
                                                    value={form.all_day ? form.start_datetime.slice(0, 10) : form.start_datetime}
                                                    onChange={e => setForm(f => ({ ...f, start_datetime: e.target.value }))}
                                                    className="w-full rounded-xl border border-gray-300 px-2 py-1 text-sm focus:ring-2 focus:ring-brand-400" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-0.5">End</label>
                                                <input type={form.all_day ? 'date' : 'datetime-local'} required
                                                    value={form.all_day ? form.end_datetime.slice(0, 10) : form.end_datetime}
                                                    onChange={e => setForm(f => ({ ...f, end_datetime: e.target.value }))}
                                                    className="w-full rounded-xl border border-gray-300 px-2 py-1 text-sm focus:ring-2 focus:ring-brand-400" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-0.5">Venue</label>
                                            <select value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                                                className="w-full rounded-xl border border-gray-300 px-2 py-1 text-sm focus:ring-2 focus:ring-brand-400">
                                                <option value="">— Select Room —</option>
                                                {venues.map(v => (
                                                    <option key={v.id} value={v.name}>{v.name}{v.code ? ` (${v.code})` : ''}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-0.5">PDF File</label>
                                            {editingEvent?.file_url && (
                                                <a href={editingEvent.file_url} target="_blank" rel="noopener noreferrer"
                                                    className="block text-xs text-brand-600 underline mb-1">{editingEvent.file_path?.split('/').pop()}</a>
                                            )}
                                            <input type="file" accept=".pdf" onChange={e => setForm(f => ({ ...f, file: e.target.files[0] }))}
                                                className="w-full text-sm text-gray-500 file:mr-2 file:py-0.5 file:px-2 file:rounded-xl file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-brand-700 hover:file:bg-brand-50" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-0.5">Type of Meeting</label>
                                                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                                                    className="w-full rounded-xl border border-gray-300 px-2 py-1 text-sm focus:ring-2 focus:ring-brand-400">
                                                    <option value="">—</option>
                                                    <option value="half_day">Half Day</option>
                                                    <option value="full_day">Full Day</option>
                                                    <option value="full_board">Full Board</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-0.5">Number of Pax</label>
                                                <input type="number" min="0" value={form.pax} onChange={e => setForm(f => ({ ...f, pax: e.target.value }))}
                                                    className="w-full rounded-xl border border-gray-300 px-2 py-1 text-sm focus:ring-2 focus:ring-brand-400" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-0.5">Color</label>
                                            <div className="flex items-center gap-1.5">
                                                {COLORS.map(c => (
                                                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                                                        className={`w-5 h-5 rounded-full border-2 ${form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'} transition-transform`}
                                                        style={{ backgroundColor: c }} />
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                                <div className="flex gap-2 pt-1">
                                    {editingEvent && (editingEvent.user_id === auth.user.id || isAdmin) && (
                                        <button type="button" onClick={handleDelete} disabled={deleting}
                                            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 disabled:opacity-50">
                                            {deleting ? 'Deleting...' : 'Delete'}
                                        </button>
                                    )}
                                    <button type="submit"
                                        className="ml-auto px-3 py-1.5 text-xs font-medium text-white bg-brand-400 rounded-xl hover:bg-brand-600">
                                        {editingEvent ? 'Update' : (inputType === 'statistic' ? 'Record' : 'Create')}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </AuthenticatedLayout>
    );
}
