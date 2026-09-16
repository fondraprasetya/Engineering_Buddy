import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { useLang } from '../../i18n';

const isEmployee = (role) => role === 'employee';

export default function Create({ auth, departments, roles, deptHeads }) {
    const { t } = useLang();
    const { data, setData, post, processing, errors } = useForm({
        name: '', email: '', password: '', department_id: '', phone: '', is_active: true, role: '', dept_head_id: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/users');
    };

    const roleLabel = (name) => {
        const map = { 'super-admin': t('rl.super-admin'), 'chief-engineer': t('rl.chief-engineer'), 'eng-admin': t('rl.eng-admin'), 'dept-head': t('rl.dept-head'), technician: t('rl.technician'), employee: t('rl.employee'), gm: t('rl.gm') };
        return map[name] ?? name.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title={t('usr.form_create')} />
            <div className="max-w-lg mx-auto">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('usr.form_create')}</h2>
                <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    {Object.values(errors).length > 0 && (
                        <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{Object.values(errors)[0]}</div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('usr.name')}</label>
                        <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('usr.email')}</label>
                        <input type="email" value={data.email} onChange={e => setData('email', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('usr.password')}</label>
                        <input type="password" value={data.password} onChange={e => setData('password', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required minLength={8} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('usr.role')}</label>
                        <select value={data.role} onChange={e => setData('role', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required>
                            <option value="">{t('usr.select_role')}</option>
                            {roles?.map(r => <option key={r.id} value={r.name}>{roleLabel(r.name)}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('usr.department')}</label>
                        <select value={data.department_id} onChange={e => setData('department_id', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                            <option value="">{t('usr.select_dept')}</option>
                            {departments?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('usr.phone')}</label>
                        <input type="text" value={data.phone} onChange={e => setData('phone', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" />
                    </div>

                    {isEmployee(data.role) && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('usr.dept_head')}</label>
                            <select value={data.dept_head_id} onChange={e => setData('dept_head_id', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                                <option value="">{t('usr.select_dh')}</option>
                                {deptHeads?.map(dh => (
                                    <option key={dh.id} value={dh.id}>{dh.name}{dh.department ? ` (${dh.department})` : ''}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex items-center">
                        <input id="is_active" type="checkbox" checked={data.is_active} onChange={e => setData('is_active', e.target.checked)} className="rounded border-gray-300 text-brand-600 focus:ring-brand-400" />
                        <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">{t('usr.active')}</label>
                    </div>

                    <button type="submit" disabled={processing} className="w-full bg-brand-400 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                        {processing ? t('usr.creating') : t('usr.create_btn')}
                    </button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
