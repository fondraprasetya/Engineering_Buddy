import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

const isEmployee = (role) => role === 'employee';

export default function Create({ auth, departments, roles, deptHeads }) {
    const { data, setData, post, processing, errors } = useForm({
        name: '', email: '', password: '', department_id: '', phone: '', is_active: true, role: '', dept_head_id: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/users');
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Create User" />
            <div className="max-w-lg mx-auto">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Create User</h2>
                <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    {Object.values(errors).length > 0 && (
                        <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{Object.values(errors)[0]}</div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" value={data.email} onChange={e => setData('email', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input type="password" value={data.password} onChange={e => setData('password', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required minLength={8} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select value={data.role} onChange={e => setData('role', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" required>
                            <option value="">Select role</option>
                            {roles?.map(r => <option key={r.id} value={r.name}>{r.name.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <select value={data.department_id} onChange={e => setData('department_id', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                            <option value="">Select department</option>
                            {departments?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input type="text" value={data.phone} onChange={e => setData('phone', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400" />
                    </div>

                    {isEmployee(data.role) && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Department Head</label>
                            <select value={data.dept_head_id} onChange={e => setData('dept_head_id', e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400">
                                <option value="">Select department head</option>
                                {deptHeads?.map(dh => (
                                    <option key={dh.id} value={dh.id}>{dh.name}{dh.department ? ` (${dh.department})` : ''}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex items-center">
                        <input id="is_active" type="checkbox" checked={data.is_active} onChange={e => setData('is_active', e.target.checked)} className="rounded border-gray-300 text-brand-600 focus:ring-brand-400" />
                        <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">Active</label>
                    </div>

                    <button type="submit" disabled={processing} className="w-full bg-brand-400 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                        {processing ? 'Creating...' : 'Create User'}
                    </button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
