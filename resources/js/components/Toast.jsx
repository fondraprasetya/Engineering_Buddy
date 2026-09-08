import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export default function Toast() {
    const { flash } = usePage().props;
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (!flash) return;
        if (flash.success) {
            setToast({ type: 'success', message: flash.success });
        } else if (flash.error) {
            setToast({ type: 'error', message: flash.error });
        }
    }, [flash]);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(timer);
    }, [toast]);

    if (!toast) return null;

    const isSuccess = toast.type === 'success';

    return (
        <div className="fixed bottom-6 right-6 z-[100]">
            <div
                className={`flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg border ${
                    isSuccess
                        ? 'bg-white border-green-200'
                        : 'bg-white border-red-200'
                }`}
            >
                {isSuccess ? (
                    <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                ) : (
                    <XCircle size={20} className="text-red-500 shrink-0" />
                )}
                <p className={`text-sm font-medium ${isSuccess ? 'text-green-800' : 'text-red-800'}`}>
                    {toast.message}
                </p>
                <button onClick={() => setToast(null)} className="ml-2 p-0.5 hover:bg-gray-100 rounded">
                    <X size={16} className="text-gray-400" />
                </button>
            </div>
        </div>
    );
}
