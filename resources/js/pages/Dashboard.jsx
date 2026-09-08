import { Head, Link } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import AuthenticatedLayout from '../layouts/AuthenticatedLayout';
import DashboardHeader from './dashboard/components/DashboardHeader';
import WidgetGrid from './dashboard/components/WidgetGrid';

export default function Dashboard({ auth, notification_count, overdueCount, weather, widgetSettings, widgetData }) {
    const role = auth.user.roles?.[0] ?? 'employee';
    const headlines = {
        employee: 'Welcome! Report an issue or request maintenance work.',
        'dept-head': `Approvals await your review.`,
        technician: `Tasks assigned to you.`,
        'eng-admin': 'Manage assets, schedules, and templates.',
        'chief-engineer': `Work orders await your final approval.`,
        gm: 'Org-wide reports and project overview.',
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Dashboard" />

            <div className="space-y-4">
                <DashboardHeader auth={auth} notification_count={notification_count} weather={weather} />

                {overdueCount > 0 && (
                    <Link href="/maintenance-schedules" className="flex items-start gap-3 bg-danger-50 border border-danger-100 rounded-2xl p-4">
                        <span className="shrink-0 mt-0.5 p-2 rounded-2xl bg-white">
                            <AlertTriangle size={18} className="text-danger-600" />
                        </span>
                        <div>
                            <p className="text-danger-900 font-medium">{overdueCount} overdue maintenance schedule{overdueCount !== 1 ? 's' : ''}</p>
                            <p className="text-danger-600 text-sm mt-0.5">View schedules &rarr;</p>
                        </div>
                    </Link>
                )}

                <WidgetGrid widgetSettings={widgetSettings} widgetData={widgetData} />
            </div>
        </AuthenticatedLayout>
    );
}
