import { useState, useEffect, useRef, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

export default function Show({ auth, workOrder, reviewerRole }) {
    const wo = workOrder;
    const template = wo.checklist_template;
    const fields = template?.fields ?? [];
    const [responses, setResponses] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(null);
    const [technicianNotes, setTechnicianNotes] = useState('');
    const [savingProgress, setSavingProgress] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const photoInputRef = useRef(null);
    const existingPhotos = wo.photos ?? [];

    const handleAddPhoto = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingPhoto(true);
        try {
            const csrfToken = document.querySelector('meta[name=csrf-token]')?.content ?? '';
            const formData = new FormData();
            formData.append('photo', file);
            formData.append('type', 'completion');
            await fetch(`/api/v1/work-orders/${wo.id}/upload-photo`, {
                method: 'POST', headers: { 'X-CSRF-TOKEN': csrfToken }, body: formData,
            });
            router.reload();
        } finally {
            setUploadingPhoto(false);
            if (photoInputRef.current) photoInputRef.current.value = '';
        }
    };

    const handleDeletePhoto = async (photoId) => {
        const csrfToken = document.querySelector('meta[name=csrf-token]')?.content ?? '';
        await fetch(`/api/v1/work-order-photos/${photoId}`, {
            method: 'DELETE', headers: { 'X-CSRF-TOKEN': csrfToken },
        });
        router.reload();
    };

    useEffect(() => {
        if (wo.checklist_responses) {
            const initial = {};
            wo.checklist_responses.forEach(r => { initial[r.field_id] = r.value; });
            setResponses(prev => ({ ...prev, ...initial }));
        }
    }, []);

    const groupedByPage = useMemo(() => {
        const pages = {};
        (fields.length ? fields : []).forEach(f => {
            const page = f.page ?? 1;
            (pages[page] ??= []).push(f);
        });
        return Object.entries(pages).sort((a, b) => a[0] - b[0]);
    }, [fields]);

    const canvasWrapRef = useRef(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const el = canvasWrapRef.current;
        if (!el) return;
        const compute = () => setScale(Math.min(1, el.clientWidth / 500));
        compute();
        const ro = new ResizeObserver(compute);
        ro.observe(el);
        return () => ro.disconnect();
    }, [groupedByPage.length]);

    const pageHeight = useMemo(() => {
        let max = 707;
        fields.forEach(f => { max = Math.max(max, (f.y ?? 0) + 70); });
        return max;
    }, [fields]);

    const canStart = wo.status === 'assigned';
    const canComplete = wo.status === 'in_progress';

    const handleStart = async () => {
        try {
            await fetch(`/api/v1/work-orders/${wo.id}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content },
                body: JSON.stringify({ status: 'in_progress' }),
            });
            router.reload();
        } catch {}
    };

    const handleComplete = async () => {
        if (!technicianNotes.trim()) {
            return;
        }
        if (existingPhotos.length === 0) {
            return;
        }
        if (fields.some(f => f.required && !responses[f.id])) {
            return;
        }
        setSubmitting(true);
        try {
            const csrfToken = document.querySelector('meta[name=csrf-token]')?.content ?? '';

            if (fields.length > 0) {
                const res = await fetch(`/api/v1/work-orders/${wo.id}/checklist-responses`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                    body: JSON.stringify({
                        responses: Object.entries(responses).map(([field_id, value]) => ({ field_id, value })),
                    }),
                });
                if (!res.ok) return;
            }

            const res = await fetch(`/api/v1/work-orders/${wo.id}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                body: JSON.stringify({ status: 'pending_check', technician_notes: technicianNotes }),
            });
            if (res.ok) { router.reload(); } else { const err = await res.json().catch(() => ({})); alert(err.message || 'Failed to mark complete'); }
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveProgress = async () => {
        setSavingProgress(true);
        try {
            const csrfToken = document.querySelector('meta[name=csrf-token]')?.content ?? '';
            const formData = new FormData();
            if (technicianNotes.trim()) formData.append('technician_notes', technicianNotes);

            const res = await fetch(`/api/v1/work-orders/${wo.id}/save-progress`, {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': csrfToken },
                body: formData,
            });
            if (res.ok) {
                router.reload();
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.message || 'Failed to save progress');
            }
        } finally {
            setSavingProgress(false);
        }
    };

    const setResponse = (fieldId, value) => {
        setResponses(prev => ({ ...prev, [fieldId]: value }));
    };

    const parsePhotos = (value) => {
        if (!value) return [];
        if (value.startsWith('[')) {
            try {
                const arr = JSON.parse(value);
                if (!Array.isArray(arr)) return [];
                return arr.map(item =>
                    typeof item === 'string'
                        ? { url: item, name: item.split('/').pop() }
                        : { url: item.url, name: item.name || item.url.split('/').pop() }
                );
            } catch {
                return [];
            }
        }
        return [{ url: value, name: value.split('/').pop() }];
    };

    const handlePhotoUpload = async (fieldId, files) => {
        const filesArr = Array.from(files);
        if (filesArr.length === 0) return;
        setUploading(fieldId);
        try {
            const uploaded = [];
            for (const file of filesArr) {
                const formData = new FormData();
                formData.append('photo', file);
                const res = await fetch(`/api/v1/work-orders/${wo.id}/checklist-photo`, {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content ?? '' },
                    body: formData,
                });
                const data = await res.json();
                if (data.url) uploaded.push({ url: data.url, name: file.name });
            }
            if (uploaded.length > 0) {
                const existing = parsePhotos(responses[fieldId]);
                setResponse(fieldId, JSON.stringify([...existing, ...uploaded]));
            }
        } finally {
            setUploading(null);
        }
    };

    const removePhoto = (fieldId, index) => {
        const photos = parsePhotos(responses[fieldId]);
        photos.splice(index, 1);
        setResponse(fieldId, photos.length ? JSON.stringify(photos) : '');
    };

    const renderField = (field) => {
        const value = responses[field.id] ?? '';

        if (field.field_type === 'checkbox') {
            return (
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={value === '1' || value === 'true'}
                        onChange={e => setResponse(field.id, e.target.checked ? '1' : '0')}
                        className="w-5 h-5 rounded border-gray-300 text-brand-600 focus:ring-brand-400"
                    />
                    <span className="text-sm text-gray-600">{field.required ? '(required)' : '(optional)'}</span>
                </label>
            );
        }

        if (field.field_type === 'photo') {
            const photos = parsePhotos(value);
            return (
                <div>
                    <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={e => handlePhotoUpload(field.id, e.target.files)}
                        className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-brand-700 hover:file:bg-brand-50"
                    />
                    {uploading === field.id && <p className="text-xs text-gray-400 mt-1">Uploading...</p>}
                    {photos.length > 0 && (
                        <ul className="mt-1 space-y-1">
                            {photos.map((photo, idx) => (
                                <li key={`${photo.url}-${idx}`} className="flex items-center justify-between text-xs text-gray-600">
                                    <span className="truncate">{photo.name}</span>
                                    <button type="button" onClick={() => removePhoto(field.id, idx)} className="text-red-600 ml-2 shrink-0">Remove</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            );
        }

        if (field.field_type === 'number') {
            return (
                <input
                    type="number"
                    value={value}
                    onChange={e => setResponse(field.id, e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400"
                />
            );
        }

        if (field.field_type === 'date') {
            return (
                <input
                    type="date"
                    value={value}
                    onChange={e => setResponse(field.id, e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400"
                />
            );
        }

        return (
            <input
                type="text"
                value={value}
                onChange={e => setResponse(field.id, e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400"
                placeholder={`Enter ${field.label.toLowerCase()}...`}
            />
        );
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title={wo.title} />
            <div className="max-w-2xl mx-auto space-y-4">
                <Link href="/my-tasks" className="text-sm text-brand-600 hover:text-brand-700">&larr; Back to My Tasks</Link>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-start justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">{wo.title}</h2>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            wo.status === 'assigned' ? 'bg-purple-100 text-purple-700' :
                            wo.status === 'in_progress' ? 'bg-cyan-100 text-cyan-700' :
                            'bg-rose-100 text-rose-700'
                        }`}>
                            {wo.status === 'in_progress' ? 'In Progress' : wo.status === 'pending_check' ? 'Pending Check' : 'Assigned'}
                        </span>
                    </div>
                    <div className="text-sm space-y-2">
                        <div>
                            <span className="text-gray-500">Requester:</span>
                            <span className="ml-2 text-gray-900">{wo.requester?.name}</span>
                        </div>
                        {wo.requester?.department && (
                            <div>
                                <span className="text-gray-500">Department:</span>
                                <span className="ml-2 text-gray-900">{wo.requester.department.name}</span>
                            </div>
                        )}
                        <div>
                            <span className="text-gray-500">Priority:</span>
                            <span className="ml-2 capitalize text-gray-900">{wo.priority}</span>
                        </div>
                        {wo.asset && (
                            <div>
                                <span className="text-gray-500">Asset:</span>
                                <span className="ml-2 text-gray-900">{wo.asset.name} ({wo.asset.code})</span>
                            </div>
                        )}
                        {wo.location && (
                            <div>
                                <span className="text-gray-500">Location:</span>
                                <span className="ml-2 text-gray-900">{wo.location.name}{wo.location.code ? ` (${wo.location.code})` : ''}</span>
                            </div>
                        )}
                        <div>
                            <span className="text-gray-500">Created:</span>
                            <span className="ml-2 text-gray-900">{new Date(wo.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {wo.completion_target_date && (
                            <div>
                                <span className="text-gray-500">Target Completion:</span>
                                <span className="ml-2 text-gray-900 font-medium">{new Date(wo.completion_target_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                            </div>
                        )}
                        {wo.description && (
                            <div>
                                <span className="text-gray-500">Description:</span>
                                <p className="mt-1 text-gray-700 whitespace-pre-wrap">{wo.description}</p>
                            </div>
                        )}
                        {wo.photo && (
                            <div>
                                <span className="text-gray-500">Photo:</span>
                                <img src={`/storage/${wo.photo}`} alt="Work order" className="mt-1 w-32 h-32 object-cover rounded-xl border" />
                            </div>
                        )}
                        {wo.technician_notes && (
                            <div>
                                <span className="text-gray-500">Progress Note:</span>
                                <p className="text-xs text-gray-400 mt-1">Last updated: {new Date(wo.updated_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '')}</p>
                                <p className="mt-1 text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-3 text-sm">{wo.technician_notes}</p>
                            </div>
                        )}
                        {existingPhotos.length > 0 && (
                            <div>
                                <span className="text-gray-500">Completion Photos:</span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {existingPhotos.map(p => (
                                        <img key={p.id} src={`/storage/${p.photo_path}`} alt="Completion" className="w-20 h-20 object-cover rounded-xl border" />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {canStart && (
                        <button onClick={handleStart} className="mt-6 w-full bg-cyan-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-cyan-700">
                            Start Work
                        </button>
                    )}
                </div>

                {canComplete && fields.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900">Checklist</h3>
                            <a
                                href={`/work-orders/${wo.id}/checklist-pdf`}
                                target="_blank"
                                className="text-xs text-brand-600 hover:text-brand-700"
                            >
                                Download PDF
                            </a>
                        </div>

                        <div ref={canvasWrapRef} className="w-full">
                            {groupedByPage.map(([page, pageFields]) => (
                                <div key={page} className="mb-6 last:mb-0">
                                    <p className="text-xs text-gray-400 mb-2">Page {page}</p>
                                    <div className="relative" style={{ width: 500 * scale, height: pageHeight * scale }}>
                                        <div className="absolute top-0 left-0 origin-top-left" style={{ width: 500, height: pageHeight, transform: `scale(${scale})` }}>
                                            {pageFields.map((field) => (
                                                <div
                                                    key={field.id}
                                                    className="absolute bg-white rounded-xl border-2 border-gray-200 p-2"
                                                    style={{ left: field.x ?? 0, top: field.y ?? 0, width: field.width ?? 220 }}
                                                >
                                                    {field.field_type === 'label' ? (
                                                        <p className="font-bold text-gray-900" style={{ fontSize: Math.max(11, Math.min(16, Math.round((field.width ?? 220) / 20))) }}>
                                                            {field.label}
                                                        </p>
                                                    ) : (
                                                        <>
                                                            <p className="text-xs font-medium text-gray-800 mb-1 truncate" style={{ fontSize: Math.max(10, Math.min(14, Math.round((field.width ?? 220) / 20))) }}>
                                                                {field.label}
                                                                {field.required && <span className="text-red-500 ml-0.5">*</span>}
                                                            </p>
                                                            {renderField(field)}
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {fields.some(f => f.required && !responses[f.id]) && (
                            <p className="text-xs text-red-500 mt-3">Please fill all required fields.</p>
                        )}

                        <div className="mt-6 space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Progress Note <span className="text-red-500">*</span></label>
                                <textarea value={technicianNotes} onChange={e => setTechnicianNotes(e.target.value)} rows={3} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" placeholder="Describe the work done..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Completion Photos <span className="text-red-500">*</span></label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {existingPhotos.map((p) => (
                                        <div key={p.id} className="relative">
                                            <img src={`/storage/${p.photo_path}`} alt="Completion" className="w-20 h-20 object-cover rounded-xl border" />
                                            <button type="button" onClick={() => handleDeletePhoto(p.id)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600">&times;</button>
                                        </div>
                                    ))}
                                </div>
                                <input type="file" ref={photoInputRef} accept="image/*" onChange={handleAddPhoto} className="hidden" />
                                <button type="button" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto} className="bg-gray-100 text-gray-700 rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-50 disabled:opacity-50">
                                    {uploadingPhoto ? 'Uploading...' : '+ Add Photo'}
                                </button>
                            </div>
                            {!technicianNotes.trim() && <p className="text-xs text-red-500">Please add a progress note.</p>}
                            {existingPhotos.length === 0 && <p className="text-xs text-red-500">Please attach at least one completion photo.</p>}
                        </div>

                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={handleSaveProgress}
                                disabled={savingProgress || !technicianNotes.trim()}
                                className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-brand-50 disabled:opacity-50"
                            >
                                {savingProgress ? 'Saving...' : 'Save Progress'}
                            </button>
                            <button
                                onClick={handleComplete}
                                disabled={submitting || !technicianNotes.trim() || existingPhotos.length === 0 || fields.some(f => f.required && !responses[f.id])}
                                className="flex-1 bg-green-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                            >
                                {submitting ? 'Submitting...' : 'Mark Complete'}
                            </button>
                        </div>
                    </div>
                )}

                {wo.status === 'pending_check' && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
                        <p className="text-sm text-gray-600">Work submitted for review. Waiting for your {reviewerRole === 'chief-engineer' ? 'chief engineer' : 'department head'} to approve completion.</p>
                    </div>
                )}

                {canComplete && fields.length === 0 && (
                    <div className="bg-white rounded-2xl shadow-sm p-6">
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Progress Note <span className="text-red-500">*</span></label>
                                <textarea value={technicianNotes} onChange={e => setTechnicianNotes(e.target.value)} rows={3} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" placeholder="Describe the work done..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Completion Photos <span className="text-red-500">*</span></label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {existingPhotos.map((p) => (
                                        <div key={p.id} className="relative">
                                            <img src={`/storage/${p.photo_path}`} alt="Completion" className="w-20 h-20 object-cover rounded-xl border" />
                                            <button type="button" onClick={() => handleDeletePhoto(p.id)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600">&times;</button>
                                        </div>
                                    ))}
                                </div>
                                <input type="file" ref={photoInputRef} accept="image/*" onChange={handleAddPhoto} className="hidden" />
                                <button type="button" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto} className="bg-gray-100 text-gray-700 rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-50 disabled:opacity-50">
                                    {uploadingPhoto ? 'Uploading...' : '+ Add Photo'}
                                </button>
                            </div>
                            {!technicianNotes.trim() && <p className="text-xs text-red-500">Please add a progress note.</p>}
                            {existingPhotos.length === 0 && <p className="text-xs text-red-500">Please attach at least one completion photo.</p>}
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={handleSaveProgress}
                                disabled={savingProgress || !technicianNotes.trim()}
                                className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-brand-50 disabled:opacity-50"
                            >
                                {savingProgress ? 'Saving...' : 'Save Progress'}
                            </button>
                            <button
                                onClick={handleComplete}
                                disabled={submitting || !technicianNotes.trim() || existingPhotos.length === 0}
                                className="flex-1 bg-green-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                            >
                                {submitting ? 'Submitting...' : 'Mark Complete'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}