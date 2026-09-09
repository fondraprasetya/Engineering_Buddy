import { Link, Head, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Building2, User, Mail, Lock } from 'lucide-react';

export default function Register() {
    const { data, setData, post, processing, errors } = useForm({
        tenant_name: '',
        owner_name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/register');
    };

    const field = 'w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-400 focus:border-brand-400 outline-none transition-shadow';

    return (
        <>
            <Head title="Sign up" />
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col items-center justify-center px-4 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="w-full max-w-sm"
                >
                    <div className="text-center mb-8">
                        <img src="/images/logo.png" alt="Engineering Buddy" className="h-24 w-auto mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
                        <p className="text-sm text-gray-500 mt-1">Start your free 14-day trial</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 p-7">
                        <form onSubmit={submit} className="space-y-4">
                            {errors.email && <div className="text-sm text-red-600 bg-red-50 rounded-xl p-3 border border-red-100">{errors.email}</div>}
                            {errors.tenant_name && <div className="text-sm text-red-600 bg-red-50 rounded-xl p-3 border border-red-100">{errors.tenant_name}</div>}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Facility / Company name</label>
                                <div className="relative">
                                    <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input className={field} value={data.tenant_name} onChange={(e) => setData('tenant_name', e.target.value)} placeholder="Acme Facilities" autoComplete="organization" required />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your name</label>
                                <div className="relative">
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input className={field} value={data.owner_name} onChange={(e) => setData('owner_name', e.target.value)} placeholder="Jane Doe" autoComplete="name" required />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="email" className={field} value={data.email} onChange={(e) => setData('email', e.target.value)} placeholder="you@company.com" autoComplete="email" required />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="password" className={field} value={data.password} onChange={(e) => setData('password', e.target.value)} placeholder="Min. 8 characters" autoComplete="new-password" required />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="password" className={field} value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} placeholder="Repeat password" autoComplete="new-password" required />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full mt-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 text-sm transition-colors disabled:opacity-60"
                            >
                                {processing ? 'Creating account…' : 'Create account'}
                            </button>
                        </form>

                        <p className="text-sm text-gray-500 text-center mt-6">
                            Already have an account? <Link href="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </>
    );
}
