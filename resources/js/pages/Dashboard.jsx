import { Head, Link } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import AuthenticatedLayout from '../layouts/AuthenticatedLayout';
import DashboardHeader from './dashboard/components/DashboardHeader';
import WidgetGrid from './dashboard/components/WidgetGrid';
import { useLang } from '../i18n';

export default function Dashboard({ auth, notification_count, overdueCount, weather, widgetSettings, widgetData }) {
    const { t } = useLang();
    const role = auth.user.roles?.[0] ?? 'employee';
    const headlines = {
        employee: t('dash.welcome_employee'),
        'dept-head': t('dash.welcome_dept_head'),
        technician: t('dash.welcome_technician'),
        'eng-admin': t('dash.welcome_eng_admin'),
        'chief-engineer': t('dash.welcome_chief'),
        gm: t('dash.welcome_gm'),
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Dashboard" />

            <div className="space-y-4">
                <DashboardHeader auth={auth} notification_count={notification_count} weather={weather} />

                {['gm', 'super-admin', 'chief-engineer', 'eng-admin'].includes(role) && (
                    <a href="/reports/owner" className="flex items-center justify-center gap-2 bg-white border border-brand-100 rounded-2xl p-3 text-sm font-medium text-brand-700 hover:bg-brand-50 transition-colors">
                        📄 {t('dash.owner_report')}
                    </a>
                )}

                {overdueCount > 0 && (
                    <Link href="/maintenance-schedules" className="flex items-start gap-3 bg-danger-50 border border-danger-100 rounded-2xl p-4">
                        <span className="shrink-0 mt-0.5 p-2 rounded-2xl bg-white">
                            <AlertTriangle size={18} className="text-danger-600" />
                        </span>
                        <div>
                            <p className="text-danger-900 font-medium">{overdueCount} {overdueCount !== 1 ? t('dash.overdue_plural') : t('dash.overdue')}</p>
                            <p className="text-danger-600 text-sm mt-0.5">{t('dash.view_schedules')} &rarr;</p>
                        </div>
                    </Link>
                )}

                <WidgetGrid widgetSettings={widgetSettings} widgetData={widgetData} />
            </div>
        </AuthenticatedLayout>
    );
}
