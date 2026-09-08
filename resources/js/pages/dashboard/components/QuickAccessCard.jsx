import { Link } from '@inertiajs/react';
import {
    FilePlus, ListChecks, ClipboardList, Clock, Package,
    Wrench, CalendarCheck, Briefcase, Zap, Receipt,
} from 'lucide-react';

const links = [
    { route: '/work-orders/create', label: 'New Work Order', icon: FilePlus, color: 'text-brand-600', bg: 'bg-blue-50', roles: { exclude: ['gm'] } },
    { route: '/work-orders', label: 'All Work Orders', icon: ListChecks, color: 'text-gray-600', bg: 'bg-gray-50' },
    { route: '/my-tasks', label: 'My Tasks', icon: ClipboardList, color: 'text-cyan-600', bg: 'bg-cyan-50', roles: { include: ['technician'] } },
    { route: '/work-orders', label: 'Approvals', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', roles: { include: ['dept-head', 'chief-engineer'] } },
    { route: '/expenses', label: 'Expenses', icon: Receipt, color: 'text-rose-600', bg: 'bg-rose-50', roles: { exclude: ['employee', 'technician'] } },
    { route: '/assets', label: 'Assets', icon: Package, color: 'text-green-600', bg: 'bg-green-50' },
    { route: '/maintenance-schedules', label: 'Maintenance', icon: CalendarCheck, color: 'text-purple-600', bg: 'bg-purple-50', roles: { exclude: ['employee', 'technician'] } },
    { route: '/projects', label: 'Projects', icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-50', roles: { include: ['eng-admin', 'gm', 'chief-engineer'] } },
    { route: '/utilities', label: 'Utilities', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50', roles: { exclude: ['employee', 'technician'] } },
];

export default function QuickAccessCard({ role }) {
    const visible = links.filter(l => {
        if (l.roles?.include) return l.roles.include.includes(role);
        if (l.roles?.exclude) return !l.roles.exclude.includes(role);
        return true;
    });

    return (
        <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
                <Wrench size={18} className="text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Quick Access</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {visible.map(l => (
                    <Link
                        key={l.route + l.label}
                        href={l.route}
                        className={`${l.bg} ${l.color} rounded-xl p-3 text-center text-sm font-medium hover:scale-[1.03] transition-all duration-150`}
                    >
                        <l.icon size={20} className="mx-auto mb-1" />
                        {l.label}
                    </Link>
                ))}
            </div>
        </div>
    );
}
