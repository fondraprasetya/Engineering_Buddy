import { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { useLang } from '../../i18n';

export default function Show({ auth, workOrder, reviewerRole, isReviewer }) {
    const { lang, t } = useLang();
    const role = auth.user.roles?.[0] ?? 'employee';
    const wo = workOrder;
    const locale = lang === 'id' ? 'id-ID' : 'en-US';

    const today = new Date().toISOString().split('T')[0];
const [assignData, setAssignData] = useState({ technician_id: '', scheduled_date: today, shift: 'morning' });
    const [completionTargetDate, setCompletionTargetDate] = useState('');
    const [technicianRating, setTechnicianRating] = useState(0);
    const [availableTechnicians, setAvailableTechnicians] = useState([]);
    const [loadingTechs, setLoadingTechs] = useState(false);

    const csrf = () => document.querySelector('meta[name=csrf-token]')?.content ?? '';

    useEffect(() => {
        if (!assignData.scheduled_date) return;
        let cancelled = false;
        setLoadingTechs(true);
        setAvailableTechnicians([]);
        setAssignData(p => ({ ...p, technician_id: '' }));
        fetch(`/api/v1/technicians/available?date=${assignData.scheduled_date}&shift=${assignData.shift}`, {
            headers: { 'X-CSRF-TOKEN': csrf(), 'Accept': 'application/json' },
        })
            .then(r => r.json())
            .then(data => { if (!cancelled) { setAvailableTechnicians(data); setLoadingTechs(false); } })
            .catch(() => { if (!cancelled) setLoadingTechs(false); });
        return () => { cancelled = true; };
    }, [assignData.scheduled_date, assignData.shift]);

    const statusColors = {
        draft: 'bg-gray-100 text-gray-700',
        pending_dept_head: 'bg-yellow-100 text-yellow-700',
        pending_chief_engineer: 'bg-orange-100 text-orange-700',
        rejected: 'bg-red-100 text-red-700',
        approved: 'bg-brand-50 text-brand-700',
        assigned: 'bg-purple-100 text-purple-700',
        in_progress: 'bg-cyan-100 text-cyan-700',
        pending_check: 'bg-rose-100 text-rose-700',
        completed: 'bg-green-100 text-green-700',
        pending_close: 'bg-indigo-100 text-indigo-700',
        closed: 'bg-gray-200 text-gray-600',
    };

    const canApprove = isReviewer && (wo.status === 'pending_dept_head' || wo.status === 'pending_chief_engineer');

    const canAssign = (role === 'eng-admin' || role === 'chief-engineer') && wo.status === 'approved';

    const canUpdateStatus = (role === 'technician' || role === 'eng-admin' || role === 'chief-engineer')
        && (wo.status === 'assigned' || wo.status === 'in_progress');

    const canCompleteCheck = isReviewer && wo.status === 'pending_check';

    const canRequestClose = role === 'chief-engineer' && wo.status === 'completed';

    const canApproveClose = isReviewer && wo.status === 'pending_close';

    const apiPost = async (url, body = {}) => {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content ?? '' },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                const msg = Object.values(data.errors ?? { message: data.message ?? t('wo.request_failed') }).flat().join('\n');
                console.log('API error:', url, body, res.status, data);
                alert(msg || t('wo.request_failed'));
                return;
            }
            console.log('API success:', url, body, res.status);
            router.reload();
        } catch (e) {
            console.error('API fetch error:', e);
            alert(t('wo.network_retry'));
        }
    };

    const handleApprove = () => {
        const body = {};
        if (wo.status === 'pending_chief_engineer') {
            if (!completionTargetDate) {
                alert(t('wo.set_target'));
                return;
            }
            body.completion_target_date = completionTargetDate;
        }
        if (confirm(t('wo.approve_confirm'))) {
            apiPost(`/api/v1/work-orders/${wo.id}/approve`, body);
        }
    };

    const handleReject = () => {
        const comment = prompt(t('wo.reject_reason'));
        if (comment) {
            apiPost(`/api/v1/work-orders/${wo.id}/reject`, { comment });
        }
    };

    const handleStatusUpdate = (status) => {
        const body = { status };
        if (status === 'completed') {
            if (!technicianRating) {
                alert(t('wo.rate_alert'));
                return;
            }
            body.technician_rating = technicianRating;
        }
        apiPost(`/api/v1/work-orders/${wo.id}/status`, body);
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title={wo.title} />

            <div className="max-w-2xl mx-auto space-y-4">
                <Link href="/work-orders" className="text-sm text-brand-600 hover:text-brand-700">&larr; {t('wo.back')}</Link>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-start justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">{wo.title}</h2>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[wo.status] ?? 'bg-gray-100 text-gray-700'}`}>
                            {t('st.' + wo.status)}
                        </span>
                    </div>

                    <div className="space-y-3 text-sm">
                        <div>
                            <span className="text-gray-500">{t('wo.requester')}:</span>
                            <span className="ml-2 text-gray-900">{wo.requester?.name}</span>
                        </div>
                        {wo.requester?.department && (
                            <div>
                                <span className="text-gray-500">{t('wo.department')}:</span>
                                <span className="ml-2 text-gray-900">{wo.requester.department.name}</span>
                            </div>
                        )}
                        <div>
                            <span className="text-gray-500">{t('wo.f_priority')}:</span>
                            <span className="ml-2 capitalize text-gray-900">{t('pr.' + wo.priority)}</span>
                        </div>
                        {wo.asset && (
                            <div>
                                <span className="text-gray-500">{t('wo.f_asset')}:</span>
                                <span className="ml-2 text-gray-900">{wo.asset.name} ({wo.asset.code})</span>
                            </div>
                        )}
                        {wo.location && (
                            <div>
                                <span className="text-gray-500">{t('wo.f_location')}:</span>
                                <span className="ml-2 text-gray-900">{wo.location.name}{wo.location.code ? ` (${wo.location.code})` : ''}</span>
                            </div>
                        )}
                        {wo.project && (
                            <div>
                                <span className="text-gray-500">{t('wo.f_project')}:</span>
                                <Link href={`/projects/${wo.project.id}`} className="ml-2 text-brand-600 hover:text-brand-700">{wo.project.name}</Link>
                            </div>
                        )}
                        {wo.actual_cost != null && (
                            <div>
                                <span className="text-gray-500">{t('wo.actual_cost')}:</span>
                                <span className="ml-2 text-gray-900 font-medium">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(wo.actual_cost))}</span>
                            </div>
                        )}
                        <div>
                            <span className="text-gray-500">{t('wo.created')}:</span>
                            <span className="ml-2 text-gray-900">{new Date(wo.created_at).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {wo.technicianAssignments?.map((ta) => (
                            <div key={ta.id} className="border-t border-gray-100 pt-3 mt-3">
                                <p><span className="text-gray-500">{t('wo.technician')}:</span> <span className="text-gray-900">{ta.technician?.name}</span></p>
                                <p><span className="text-gray-500">{t('wo.scheduled')}:</span> <span className="text-gray-900">{new Date(ta.scheduled_date).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })} · {ta.shift}</span></p>
                            </div>
                        ))}
                        {wo.completion_target_date && (
                            <div>
                                <span className="text-gray-500">{t('wo.target_completion')}:</span>
                                <span className="ml-2 text-gray-900 font-medium">{new Date(wo.completion_target_date).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                            </div>
                        )}
                        {wo.description && (
                            <div>
                                <span className="text-gray-500">{t('wo.f_desc')}:</span>
                                <p className="mt-1 text-gray-700 whitespace-pre-wrap">{wo.description}</p>
                            </div>
                        )}
                        {wo.photo && (
                            <div>
                                <span className="text-gray-500">{t('wo.f_photo')}:</span>
                                <img src={`/storage/${wo.photo}`} alt="Work order" className="mt-1 w-32 h-32 object-cover rounded-xl border" />
                            </div>
                        )}
                        {(wo.technician_notes || wo.completion_photo) && (
                            <div className="border-t border-gray-100 pt-3 mt-3">
                                <span className="text-sm font-medium text-gray-900">{t('wo.tech_report')}</span>
                                {wo.technician_notes && (
                                    <div className="mt-2">
                                        <span className="text-xs text-gray-500 block mb-1">{t('wo.progress_note')}:</span>
                                        <p className="text-xs text-gray-400 mb-1">{t('wo.last_updated')}: {new Date(wo.updated_at).toLocaleString(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '')}</p>
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-3">{wo.technician_notes}</p>
                                    </div>
                                )}
                                {wo.completion_photo && (
                                    <div className="mt-2">
                                        <span className="text-xs text-gray-500 block mb-1">{t('wo.completion_photo')}:</span>
                                        <img src={`/storage/${wo.completion_photo}`} alt="Completion" className="w-40 h-40 object-cover rounded-xl border bg-white" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {canApprove && (
                        <div className="mt-6 space-y-3">
                            {wo.status === 'pending_chief_engineer' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('wo.target_date')} <span className="text-red-500">*</span></label>
                                    <input type="date" value={completionTargetDate} onChange={e => setCompletionTargetDate(e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" />
                                </div>
                            )}
                            <div className="flex gap-3">
                                <button onClick={handleApprove} className="flex-1 bg-green-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-green-700">
                                    {t('wo.approve')}
                                </button>
                                <button onClick={handleReject} className="flex-1 bg-red-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-red-700">
                                    {t('wo.reject')}
                                </button>
                            </div>
                        </div>
                    )}

                    {canUpdateStatus && wo.status === 'assigned' && (
                        <div className="mt-6">
                            <button onClick={() => handleStatusUpdate('in_progress')} className="w-full bg-cyan-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-cyan-700">
                                {t('wo.start_work')}
                            </button>
                        </div>
                    )}

                    {canUpdateStatus && wo.status === 'in_progress' && (
                        <div className="mt-6">
                            <button onClick={() => handleStatusUpdate('pending_check')} className="w-full bg-rose-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-rose-700">
                                {t('wo.mark_complete')}
                            </button>
                        </div>
                    )}

                    {canCompleteCheck && (
                        <>
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('wo.rate_tech')} <span className="text-red-500">*</span></label>
                                <div className="flex gap-1 mb-4">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setTechnicianRating(star)}
                                            className={`text-2xl transition-colors ${star <= technicianRating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400`}
                                        >
                                            &#9733;
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => handleStatusUpdate('completed')} className="flex-1 bg-green-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-green-700">
                                    {t('wo.approve_completion')}
                                </button>
                                <button onClick={() => handleStatusUpdate('in_progress')} className="flex-1 bg-yellow-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-yellow-700">
                                    {t('wo.send_back')}
                                </button>
                            </div>
                        </>
                    )}
                    {wo.technician_rating && (
                        <div className="mt-4 bg-white rounded-2xl shadow-sm p-6">
                            <h4 className="font-semibold text-gray-900 text-sm mb-2">{t('wo.tech_rating')}</h4>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <span key={star} className={`text-2xl ${star <= wo.technician_rating ? 'text-yellow-400' : 'text-gray-300'}`}>&#9733;</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {canRequestClose && (
                        <div className="mt-6">
                            <button onClick={() => handleStatusUpdate('pending_close')} className="w-full bg-indigo-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-indigo-700">
                                {t('wo.request_close')}
                            </button>
                        </div>
                    )}

                    {canApproveClose && (
                        <div className="mt-6 flex gap-3">
                            <button onClick={() => handleStatusUpdate('closed')} className="flex-1 bg-green-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-green-700">
                                {t('wo.approve_close')}
                            </button>
                            <button onClick={() => handleStatusUpdate('completed')} className="flex-1 bg-red-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-red-700">
                                {t('wo.reject')}
                            </button>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h3 className="font-semibold text-gray-900 mb-3">{t('wo.approval_timeline')}</h3>
                    {wo.approvals?.length > 0 ? (
                        <div className="space-y-3">
                            {wo.approvals.map((approval) => (
                                <div key={approval.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                                    <div className={`w-2 h-2 rounded-full mt-1.5 ${approval.action === 'approved' ? 'bg-green-500' : 'bg-red-500'}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">
                                            {approval.action === 'approved' ? t('wo.approved_by') : t('wo.rejected_by')} by {approval.approver?.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {t('wo.level')} {approval.level} · {new Date(approval.created_at).toLocaleString(locale)}
                                        </p>
                                        {approval.comment && (
                                            <p className="text-sm text-gray-600 mt-1">{approval.comment}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">{t('wo.no_approvals')}</p>
                    )}
                </div>

                {wo.checklist_template && (
                    <div className="bg-white rounded-2xl shadow-sm p-6">
                        <h3 className="font-semibold text-gray-900 mb-2">{t('wo.checklist')}</h3>
                        <p className="text-sm text-gray-500 mb-3">{t('wo.checklist')}: {wo.checklist_template.name}</p>
                        <a
                            href={`/work-orders/${wo.id}/checklist-pdf`}
                            target="_blank"
                            className="inline-flex items-center gap-2 bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600"
                        >
                            {t('wo.checklist_pdf')}
                        </a>
                    </div>
                )}

                {canAssign && (
                    <div className="bg-white rounded-2xl shadow-sm p-6">
                        <h3 className="font-semibold text-gray-900 mb-3">{t('wo.assign_tech')}</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.date')}</label>
                                <input type="date" min={today} value={assignData.scheduled_date} onChange={e => setAssignData(p => ({ ...p, scheduled_date: e.target.value < today ? today : e.target.value }))} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('wo.shift')}</label>
                                <select value={assignData.shift} onChange={e => setAssignData(p => ({ ...p, shift: e.target.value }))} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                                    <option value="morning">{t('roster.morning')} (07:00-16:00)</option>
                                    <option value="afternoon">{t('roster.afternoon')} (13:00-22:00)</option>
                                    <option value="night">{t('roster.night')} (22:00-07:00)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('wo.technician')}</label>
                                {!assignData.scheduled_date ? (
                                    <p className="text-xs text-gray-400">{t('wo.select_date_first')}</p>
                                ) : loadingTechs ? (
                                    <p className="text-xs text-gray-400">{t('wo.checking')}</p>
                                ) : availableTechnicians.length === 0 ? (
                                    <p className="text-xs text-red-500">{t('wo.no_techs')}</p>
                                ) : (
                                    <>
                                        <select value={assignData.technician_id} onChange={e => setAssignData(p => ({ ...p, technician_id: e.target.value }))} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                                            <option value="">{t('wo.select_tech')}</option>
                                            {availableTechnicians.map(tech => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
                                        </select>
                                        <p className="text-xs text-gray-400 mt-1">{availableTechnicians.length} {t('wo.techs_count')}{availableTechnicians.length > 1 && lang === 'en' ? 's' : ''} {t('wo.techs_available')}</p>
                                    </>
                                )}
                            </div>
                            <button
                                onClick={() => apiPost(`/api/v1/work-orders/${wo.id}/assign`, assignData)}
                                disabled={!assignData.technician_id}
                                className={`w-full rounded-xl py-2 text-sm font-medium ${assignData.technician_id ? 'bg-brand-400 text-white hover:bg-brand-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                            >
                                {t('wo.assign')}
                            </button>
                        </div>
                    </div>
                )}

                {wo.technicianAssignments?.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm p-6">
                        <h3 className="font-semibold text-gray-900 mb-3">{t('wo.assignment')}</h3>
                        {wo.technicianAssignments.map((ta) => (
                            <div key={ta.id} className="text-sm">
                                <p><span className="text-gray-500">{t('wo.technician')}:</span> {ta.technician?.name}</p>
                                <p><span className="text-gray-500">{t('common.date')}:</span> {ta.scheduled_date}</p>
                                <p><span className="text-gray-500">{t('wo.shift')}:</span> {ta.shift}</p>
                                <p><span className="text-gray-500">{t('common.status')}:</span> {ta.status}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
