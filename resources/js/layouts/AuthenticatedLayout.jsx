import { Link, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import Toast from '../components/Toast';
import {
    Home, Calendar, ClipboardList, CheckCircle2, BarChart3, User,
    Wrench, Package, NotebookPen, FolderOpen, Factory, Wallet,
    BookText, Users, MapPin, ListChecks, Clock, Zap, Receipt, Bell, CircleHelp,
} from 'lucide-react';

const masterData = {
    name: 'Master Data',
    icon: FolderOpen,
    children: [
        { name: 'Assets', href: '/assets', icon: Factory },
        { name: 'Rates', href: '/utility-rates', icon: Wallet },
        { name: 'Budgets', href: '/budgets', icon: Wallet },
        { name: 'Post Acc.', href: '/post-accounts', icon: BookText },
        { name: 'Checklists', href: '/checklist-templates', icon: ListChecks },
        { name: 'Locations', href: '/locations', icon: MapPin },
        { name: 'Users', href: '/users', icon: Users },
    ],
};

const tabConfig = {
    employee: [
        { name: 'Home', href: '/dashboard', icon: Home },
        { name: 'Calendar', href: '/calendar', icon: Calendar },
        { name: 'Work Orders', href: '/work-orders', icon: ClipboardList },
        { name: 'Profile', href: '/profile', icon: User },
    ],
    'dept-head': [
        { name: 'Home', href: '/dashboard', icon: Home },
        { name: 'Calendar', href: '/calendar', icon: Calendar },
        { name: 'Approvals', href: '/work-orders', icon: CheckCircle2 },
        { name: 'Reports', href: '#', icon: BarChart3 },
        { name: 'Profile', href: '/profile', icon: User },
    ],
    technician: [
        { name: 'Home', href: '/dashboard', icon: Home },
        { name: 'Calendar', href: '/calendar', icon: Calendar },
        { name: 'My Tasks', href: '/my-tasks', icon: Wrench },
        { name: 'Store', href: '/store', icon: Package },
        { name: 'Logs', href: '/daily-logs', icon: NotebookPen },
        { name: 'Profile', href: '/profile', icon: User },
    ],
    'eng-admin': [
        { name: 'Home', href: '/dashboard', icon: Home },
        { name: 'Calendar', href: '/calendar', icon: Calendar },
        masterData,
        { name: 'Roster', href: '/roster', icon: ClipboardList },
        { name: 'Schedules', href: '/maintenance-schedules', icon: Clock },
        { name: 'Store', href: '/store', icon: Package },
        { name: 'Expenses', href: '/expenses', icon: Receipt },
        { name: 'Utilities', href: '/utilities', icon: Zap },
        { name: 'Profile', href: '/profile', icon: User },
    ],
    'super-admin': [
        { name: 'Home', href: '/dashboard', icon: Home },
        { name: 'Calendar', href: '/calendar', icon: Calendar },
        masterData,
        { name: 'Roster', href: '/roster', icon: ClipboardList },
        { name: 'Schedules', href: '/maintenance-schedules', icon: Clock },
        { name: 'Store', href: '/store', icon: Package },
        { name: 'Expenses', href: '/expenses', icon: Receipt },
        { name: 'Utilities', href: '/utilities', icon: Zap },
        { name: 'Profile', href: '/profile', icon: User },
    ],
    'chief-engineer': [
        { name: 'Home', href: '/dashboard', icon: Home },
        { name: 'Calendar', href: '/calendar', icon: Calendar },
        { name: 'Approvals', href: '/work-orders', icon: CheckCircle2 },
        { name: 'Projects', href: '/projects', icon: BarChart3 },
        { name: 'Roster', href: '/roster', icon: ClipboardList },
        { name: 'Schedules', href: '/maintenance-schedules', icon: Clock },
        { name: 'Store', href: '/store', icon: Package },
        { name: 'Expenses', href: '/expenses', icon: Receipt },
        { name: 'Locations', href: '/locations', icon: MapPin },
        { name: 'Utilities', href: '/utilities', icon: Zap },
        { name: 'Logs', href: '/daily-logs', icon: NotebookPen },
        { name: 'Profile', href: '/profile', icon: User },
    ],
    'gm': [
        { name: 'Home', href: '/dashboard', icon: Home },
        { name: 'Calendar', href: '/calendar', icon: Calendar },
        { name: 'Projects', href: '/projects', icon: BarChart3 },
        { name: 'Profile', href: '/profile', icon: User },
    ],
};

export default function AuthenticatedLayout({ auth, children }) {
    const user = auth.user;
    const role = user.roles?.[0] ?? 'employee';
    const tabs = tabConfig[role] ?? tabConfig.employee;
    const { url } = usePage();
    const [openGroup, setOpenGroup] = useState(null);

    const isChildActive = (children) =>
        children.some((c) => url.startsWith(c.href));

    return (
        <div className="min-h-screen bg-app-bg flex flex-col">

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 pb-24">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={url}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.15 }}
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>

            <Toast />

            {!url.startsWith('/help') && (
                <Link
                    href="/help"
                    title="Help & User Manual"
                    className="fixed bottom-24 right-4 z-30 flex items-center justify-center w-12 h-12 rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 transition-colors"
                >
                    <CircleHelp size={24} />
                </Link>
            )}

            <nav className="bg-white border-t border-brand-50 fixed bottom-0 left-0 right-0 z-30">
                {openGroup && (
                    <>
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenGroup(null)}
                        />
                        <div className="absolute bottom-full left-0 right-0 z-20 bg-white border-t border-brand-50 shadow-lg rounded-t-2xl overflow-hidden">
                            <div className="max-w-lg mx-auto grid grid-cols-3 gap-1 p-3">
                                {openGroup.children.map((child) => {
                                    const ChildIcon = child.icon;
                                    return (
                                        <Link
                                            key={child.name}
                                            href={child.href}
                                            onClick={() => setOpenGroup(null)}
                                            className="flex flex-col items-center py-3 px-2 text-xs text-gray-700 hover:text-brand-800 hover:bg-brand-50 rounded-xl transition-colors"
                                        >
                                            <ChildIcon size={20} className="mb-1" />
                                            <span className="text-center leading-tight">{child.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                <div className="max-w-lg mx-auto flex justify-around overflow-x-auto overflow-y-hidden scrollbar-none">
                    {tabs.map((tab) => {
                        const TabIcon = tab.icon;
                        const isActive = tab.children
                            ? openGroup?.name === tab.name || isChildActive(tab.children)
                            : url.startsWith(tab.href) && tab.href !== '#';

                        return tab.children ? (
                            <button
                                key={tab.name}
                                onClick={() =>
                                    setOpenGroup(openGroup?.name === tab.name ? null : tab)
                                }
                                className="shrink-0 flex flex-col items-center gap-0.5 py-2 px-3 text-xs whitespace-nowrap"
                            >
                                <span className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-brand-50' : ''}`}>
                                    <TabIcon size={20} className={isActive ? 'text-brand-600' : 'text-gray-400'} />
                                </span>
                                <span className={isActive ? 'text-brand-700 font-medium' : 'text-gray-500'}>{tab.name}</span>
                            </button>
                        ) : (
                            <Link
                                key={tab.name}
                                href={tab.href}
                                className="shrink-0 flex flex-col items-center gap-0.5 py-2 px-3 text-xs whitespace-nowrap"
                            >
                                <span className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-brand-50' : ''}`}>
                                    <TabIcon size={20} className={isActive ? 'text-brand-600' : 'text-gray-400'} />
                                </span>
                                <span className={isActive ? 'text-brand-700 font-medium' : 'text-gray-500'}>{tab.name}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
