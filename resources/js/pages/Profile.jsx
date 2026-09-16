import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '../layouts/AuthenticatedLayout';
import { useLang } from '../i18n';

export default function Profile({ auth, telegramStatus: initialTelegramStatus }) {
    const { t } = useLang();
    const [telegramStatus, setTelegramStatus] = useState(initialTelegramStatus);
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [saving, setSaving] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const submitPassword = (e) => {
        e.preventDefault();
        post('/profile/password', {
            onSuccess: () => reset(),
        });
    };

    const [profileName, setProfileName] = useState(auth.user.name);

    const saveProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        router.post('/profile/update', { name: profileName }, {
            onFinish: () => setSaving(false),
        });
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPhotoPreview(URL.createObjectURL(file));
        const formData = new FormData();
        formData.append('photo', file);
        router.post('/profile/photo', formData, {
            onSuccess: () => setPhotoPreview(null),
        });
    };

    const generateCode = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/telegram/link', { method: 'POST' });
            const data = await res.json();
            setCode(data.code);
        } finally {
            setLoading(false);
        }
    };

    const [pushState, setPushState] = useState('unknown'); // unknown|on|off|unsupported|denied
    const [pushBusy, setPushBusy] = useState(false);

    const csrf = () => document.querySelector('meta[name=csrf-token]')?.content ?? '';
    const vapidKey = () => document.querySelector('meta[name=vapid-public-key]')?.content ?? '';

    const checkPush = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            setPushState('unsupported');
            return;
        }
        if (Notification.permission === 'denied') {
            setPushState('denied');
            return;
        }
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            setPushState(sub ? 'on' : 'off');
        } catch {
            setPushState('unsupported');
        }
    };

    const enablePush = async () => {
        setPushBusy(true);
        try {
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') {
                setPushState('denied');
                return;
            }
            const reg = await navigator.serviceWorker.ready;
            const key = vapidKey();
            if (!key) throw new Error('no key');
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: Uint8Array.from(atob(key.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
            });
            const json = sub.toJSON();
            const res = await fetch('/api/v1/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
            });
            setPushState(res.ok ? 'on' : 'unsupported');
        } catch {
            setPushState('unsupported');
        } finally {
            setPushBusy(false);
        }
    };

    const disablePush = async () => {
        setPushBusy(true);
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
                await fetch('/api/v1/push/unsubscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                    body: JSON.stringify({ endpoint: sub.endpoint }),
                });
                await sub.unsubscribe();
            }
            setPushState('off');
        } finally {
            setPushBusy(false);
        }
    };

    if (pushState === 'unknown' && typeof window !== 'undefined') {
        checkPush();
    }

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title={t('prof.title')} />
            <div className="max-w-lg mx-auto space-y-4">
                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('prof.title')}</h2>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="relative">
                            {photoPreview ? (
                                <img src={photoPreview} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-blue-200" />
                            ) : auth.user.photo ? (
                                <img src={`/storage/${auth.user.photo}`} alt={auth.user.name} className="w-20 h-20 rounded-full object-cover border-2 border-blue-200" />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center text-2xl font-bold text-brand-600 border-2 border-blue-200">
                                    {auth.user.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand-400 text-white rounded-full flex items-center justify-center text-xs cursor-pointer hover:bg-brand-600 shadow-sm">
                                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                                +
                            </label>
                        </div>
                        <div className="flex-1 min-w-0">
                            <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} className="font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1 w-full text-sm focus:ring-2 focus:ring-brand-400 focus:border-brand-400" />
                            <p className="text-sm text-gray-500 mt-1">{auth.user.email}</p>
                        </div>
                    </div>
                    <div className="text-sm space-y-2">
                        <p><span className="text-gray-500">{t('prof.department')}:</span> {auth.user.department?.name ?? 'N/A'}</p>
                        <p><span className="text-gray-500">{t('prof.roles')}:</span> {(auth.user.roles ?? []).join(', ')}</p>
                    </div>
                    <button onClick={saveProfile} disabled={saving || profileName === auth.user.name} className="mt-4 w-full bg-brand-400 text-white rounded-xl py-2 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                        {saving ? t('prof.saving') : t('prof.save')}
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h3 className="font-semibold text-gray-900 mb-3">{t('prof.change_pw')}</h3>
                    <form onSubmit={submitPassword} className="space-y-3">
                        {Object.values(errors).length > 0 && (
                            <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{Object.values(errors)[0]}</div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('prof.current_pw')}</label>
                            <input type="password" value={data.current_password} onChange={e => setData('current_password', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('prof.new_pw')}</label>
                            <input type="password" value={data.password} onChange={e => setData('password', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required minLength={8} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('prof.confirm_pw')}</label>
                            <input type="password" value={data.password_confirmation} onChange={e => setData('password_confirmation', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required minLength={8} />
                        </div>

                        <button type="submit" disabled={processing} className="w-full bg-brand-400 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                            {processing ? t('prof.updating') : t('prof.update_pw')}
                        </button>
                    </form>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h3 className="font-semibold text-gray-900 mb-3">{t('prof.telegram')}</h3>
                    {telegramStatus?.linked ? (
                        <div>
                            <p className="text-sm text-green-600 mb-3">✅ {t('prof.linked')} {telegramStatus.chat_id})</p>
                            <button
                                onClick={async () => {
                                    if (!confirm(t('prof.unlink_confirm'))) return;
                                    await fetch('/api/v1/telegram/unlink', { method: 'POST' });
                                    window.location.reload();
                                }}
                                className="bg-red-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-red-700"
                            >
                                {t('prof.unlink')}
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p className="text-sm text-gray-600 mb-3">{t('prof.connect_info')}</p>
                            {code ? (
                                <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2">{t('prof.send_code')}</p>
                                    <div className="bg-gray-100 rounded-xl p-4 text-center">
                                        <code className="text-2xl font-bold text-brand-600">{code}</code>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">{t('prof.expires')}</p>
                                </div>
                            ) : (
                                <button onClick={generateCode} disabled={loading} className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                                    {loading ? t('prof.generating') : t('prof.generate')}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h3 className="font-semibold text-gray-900 mb-3">{t('prof.phone_notif')}</h3>
                    {pushState === 'on' && (
                        <div>
                            <p className="text-sm text-green-600 mb-3">{t('prof.push_on')}</p>
                            <button onClick={disablePush} disabled={pushBusy} className="bg-red-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                                {pushBusy ? t('prof.working') : t('prof.turn_off')}
                            </button>
                        </div>
                    )}
                    {pushState === 'off' && (
                        <div>
                            <p className="text-sm text-gray-600 mb-3">{t('prof.push_info')}</p>
                            <button onClick={enablePush} disabled={pushBusy} className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                                {pushBusy ? t('prof.enabling') : t('prof.enable')}
                            </button>
                        </div>
                    )}
                    {pushState === 'denied' && (
                        <p className="text-sm text-gray-500">{t('prof.denied')}</p>
                    )}
                    {pushState === 'unsupported' && (
                        <p className="text-sm text-gray-500">{t('prof.unsupported')}</p>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
