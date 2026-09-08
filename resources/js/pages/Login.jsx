import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Mail, Lock } from 'lucide-react';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post('/login');
    };

    return (
        <>
            <Head title="Login" />
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col items-center justify-center px-4 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="w-full max-w-sm"
                >
                    <div className="text-center mb-8">
                        <img src="/images/logo.png" alt="Engineering Buddy" className="h-24 w-auto mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
                        <p className="text-sm text-gray-500 mt-1">Sign in to your account to continue</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 p-7">
                        <form onSubmit={submit} className="space-y-5">
                            {errors.email && (
                                <div className="text-sm text-red-600 bg-red-50 rounded-xl p-3 border border-red-100">{errors.email}</div>
                            )}

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-400 focus:border-brand-400 outline-none transition-shadow"
                                        placeholder="you@company.com"
                                        autoComplete="email"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        id="password"
                                        type="password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-400 focus:border-brand-400 outline-none transition-shadow"
                                        placeholder="Enter your password"
                                        autoComplete="current-password"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.remember}
                                        onChange={(e) => setData('remember', e.target.checked)}
                                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-400"
                                    />
                                    <span className="text-sm text-gray-600">Remember me</span>
                                </label>
                                <a href="#" className="text-sm text-brand-600 hover:text-brand-700 font-medium">Forgot password?</a>
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full bg-brand-400 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-sm"
                            >
                                {processing ? 'Signing in...' : 'Sign in'}
                            </button>
                        </form>
                    </div>

                    <p className="text-center text-xs text-gray-400 mt-8">Engineering Buddy &copy; {new Date().getFullYear()}</p>
                </motion.div>
            </div>
        </>
    );
}
