import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

const typeIcons = {
    work_order_created: '📋',
    work_order_approved: '✅',
    work_order_rejected: '❌',
    work_order_assigned: '🔧',
    work_order_completed: '✔️',
    work_order_status: '🔄',
    maintenance_due: '⏰',
    maintenance_overdue: '🚨',
    approval_needed: '👀',
};

const typeColors = {
    work_order_created: 'bg-blue-50 border-blue-200',
    work_order_approved: 'bg-green-50 border-green-200',
    work_order_rejected: 'bg-red-50 border-red-200',
    work_order_assigned: 'bg-purple-50 border-purple-200',
    work_order_completed: 'bg-emerald-50 border-emerald-200',
    work_order_status: 'bg-gray-50 border-gray-200',
    maintenance_due: 'bg-amber-50 border-amber-200',
    maintenance_overdue: 'bg-red-50 border-red-200',
    approval_needed: 'bg-indigo-50 border-indigo-200',
};

export default function Notifications({ auth, notifications }) {
    const sorted = notifications.data ?? notifications ?? [];

    const handleMarkRead = (id) => {
        router.post(`/notifications/${id}/read`);
    };

    const handleMarkAllRead = () => {
        router.post('/notifications/read-all');
    };

    const unreadCount = sorted.filter((n) => !n.read_at).length;

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Notifications" />
            <div className="max-w-lg mx-auto space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
                    {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} className="text-sm text-brand-600 hover:text-brand-800 font-medium">
                            Mark all as read
                        </button>
                    )}
                </div>

                {sorted.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <span className="text-5xl block mb-3">🔔</span>
                        <p className="text-sm">No notifications yet</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {sorted.map((notification) => {
                            const icon = typeIcons[notification.type] ?? '📌';
                            const colorClass = typeColors[notification.type] ?? 'bg-gray-50 border-gray-200';

                            return (
                                <div
                                    key={notification.id}
                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${colorClass} ${!notification.read_at ? 'border-l-4' : 'opacity-70'}`}
                                    onClick={() => !notification.read_at && handleMarkRead(notification.id)}
                                >
                                    <span className="text-xl mt-0.5">{icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm ${!notification.read_at ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                                            {notification.data?.message ?? notification.type}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {new Date(notification.created_at).toLocaleDateString('en-US', {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                    {!notification.read_at && (
                                        <span className="w-2 h-2 rounded-full bg-brand-400 mt-2 shrink-0" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {notifications.total > notifications.per_page && (
                    <div className="flex justify-center gap-2 text-sm pt-2">
                        {notifications.prev_page_url && (
                            <Link href={notifications.prev_page_url} className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900">
                                Previous
                            </Link>
                        )}
                        {notifications.next_page_url && (
                            <Link href={notifications.next_page_url} className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900">
                                Next
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
