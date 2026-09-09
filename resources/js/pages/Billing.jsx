import { useEffect, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import AuthenticatedLayout from '../layouts/AuthenticatedLayout';

const PLAN_NAMES = { starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise' };

const loadSnap = (isProduction, clientKey) =>
    new Promise((resolve, reject) => {
        if (window.SNAP_LOADED) return resolve();
        const s = document.createElement('script');
        s.src = isProduction
            ? 'https://app.midtrans.com/snap/snap.js'
            : 'https://app.sandbox.midtrans.com/snap/snap.js';
        s.setAttribute('data-client-key', clientKey);
        s.onload = () => { window.SNAP_LOADED = true; resolve(); };
        s.onerror = () => reject(new Error('snap load failed'));
        document.head.appendChild(s);
    });

export default function Billing({ auth, subscription, midtrans, snap_token, errors }) {
    const plan = subscription?.plan ?? 'trial';
    const status = subscription?.status ?? 'trial';
    const plans = midtrans?.plans ?? { starter: 350000, professional: 850000, enterprise: 2000000 };
    const [selectedPlan, setSelectedPlan] = useState(plan === 'trial' ? 'professional' : plan);
    const [working, setWorking] = useState(false);

    useEffect(() => {
        if (snap_token && midtrans?.client_key) {
            loadSnap(midtrans.is_production, midtrans.client_key)
                .then(() => window.snap.pay(snap_token, {
                    onSuccess: () => { router.reload(); },
                    onPending: () => { router.reload(); },
                    onError: () => { router.reload(); },
                    onClose: () => {},
                }))
                .catch(() => {});
        }
    }, [snap_token]);

    const upgrade = () => {
        setWorking(true);
        router.post('/billing/checkout', { plan: selectedPlan }, {
            preserveScroll: true,
            onFinish: () => setWorking(false),
        });
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Billing" />
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Billing &amp; Plan</h2>
                    <p className="text-sm text-gray-500 mt-1">Choose a plan to keep your facility running.</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-brand-50 text-brand-600"><CreditCard size={22} /></div>
                        <div>
                            <p className="text-lg font-semibold text-gray-900 capitalize">{plan} plan</p>
                            <p className="text-sm text-gray-500">Status: <span className="font-medium capitalize text-gray-700">{status}</span></p>
                        </div>
                    </div>
                </div>

                {!midtrans?.configured && (
                    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-xl p-3 border border-amber-100">
                        <AlertCircle size={16} /> Payment gateway is not configured yet. Add Midtrans keys to accept payments.
                    </div>
                )}

                {errors?.plan && (
                    <div className="text-sm text-red-600 bg-red-50 rounded-xl p-3 border border-red-100">{errors.plan}</div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {Object.entries(plans).map(([key, price]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setSelectedPlan(key)}
                            className={`rounded-2xl border p-5 text-left transition-colors ${
                                selectedPlan === key ? 'border-brand-400 bg-brand-50/40 ring-1 ring-brand-300' : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <p className="font-semibold text-gray-900">{PLAN_NAMES[key] ?? key}</p>
                            <p className="text-2xl font-bold text-gray-900 mt-2">Rp {price.toLocaleString('id-ID')}</p>
                            <p className="text-xs text-gray-500 mt-1">per month</p>
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={upgrade}
                    disabled={working || !midtrans?.configured}
                    className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 text-sm transition-colors disabled:opacity-50"
                >
                    {working ? 'Opening payment…' : 'Subscribe now'}
                </button>

                <p className="text-sm text-gray-500 text-center">
                    Payments are processed securely by <strong>Midtrans</strong> (QRIS, bank transfer, cards, e-wallets).
                </p>
            </motion.div>
        </AuthenticatedLayout>
    );
}
