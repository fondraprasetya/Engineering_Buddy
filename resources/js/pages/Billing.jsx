import { Head } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { CreditCard, CheckCircle2 } from 'lucide-react';
import AuthenticatedLayout from '../layouts/AuthenticatedLayout';

export default function Billing({ auth, subscription }) {
    const plan = subscription?.plan ?? 'trial';
    const status = subscription?.status ?? 'trial';

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Billing" />
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto space-y-6"
            >
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Billing &amp; Plan</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage your subscription.</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-brand-50 text-brand-600">
                                <CreditCard size={22} />
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-gray-900 capitalize">{plan} plan</p>
                                <p className="text-sm text-gray-500">Status: <span className="font-medium capitalize text-gray-700">{status}</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 border-t border-gray-100 pt-5">
                        <p className="text-sm text-gray-600">
                            This is a placeholder billing screen. Payment gateway integration (Stripe, Midtrans, Xendit) will be connected here.
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                            <CheckCircle2 size={16} className="text-green-500" />
                            Subscriptions are validated via payment webhooks.
                        </div>
                    </div>
                </div>
            </motion.div>
        </AuthenticatedLayout>
    );
}
