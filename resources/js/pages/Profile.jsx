import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '../layouts/AuthenticatedLayout';

export default function Profile({ auth, telegramStatus: initialTelegramStatus }) {
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

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Profile" />
            <div className="max-w-lg mx-auto space-y-4">
                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile</h2>
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
                        <p><span className="text-gray-500">Department:</span> {auth.user.department?.name ?? 'N/A'}</p>
                        <p><span className="text-gray-500">Roles:</span> {(auth.user.roles ?? []).join(', ')}</p>
                    </div>
                    <button onClick={saveProfile} disabled={saving || profileName === auth.user.name} className="mt-4 w-full bg-brand-400 text-white rounded-xl py-2 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Change Password</h3>
                    <form onSubmit={submitPassword} className="space-y-3">
                        {Object.values(errors).length > 0 && (
                            <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{Object.values(errors)[0]}</div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                            <input type="password" value={data.current_password} onChange={e => setData('current_password', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <input type="password" value={data.password} onChange={e => setData('password', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required minLength={8} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                            <input type="password" value={data.password_confirmation} onChange={e => setData('password_confirmation', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required minLength={8} />
                        </div>

                        <button type="submit" disabled={processing} className="w-full bg-brand-400 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                            {processing ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Telegram Integration</h3>
                    {telegramStatus?.linked ? (
                        <div>
                            <p className="text-sm text-green-600 mb-3">✅ Linked to Telegram (chat ID: {telegramStatus.chat_id})</p>
                            <button
                                onClick={async () => {
                                    if (!confirm('Unlink your Telegram account?')) return;
                                    await fetch('/api/v1/telegram/unlink', { method: 'POST' });
                                    window.location.reload();
                                }}
                                className="bg-red-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-red-700"
                            >
                                Unlink
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p className="text-sm text-gray-600 mb-3">Connect your Telegram account to receive notifications and update work orders from Telegram.</p>
                            {code ? (
                                <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2">Send this code to the Engineering Buddy bot in Telegram:</p>
                                    <div className="bg-gray-100 rounded-xl p-4 text-center">
                                        <code className="text-2xl font-bold text-brand-600">{code}</code>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">Expires in 10 minutes</p>
                                </div>
                            ) : (
                                <button onClick={generateCode} disabled={loading} className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                                    {loading ? 'Generating...' : 'Generate Link Code'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
