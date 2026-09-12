import { Head } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../layouts/AuthenticatedLayout';

const SECTIONS = [
    {
        id: 'start',
        title: 'Getting Started',
        body: [
            'Log in with the email and password created for you. If your company just signed up, the owner account was created during registration.',
            'Your bottom navigation bar shows only the menus your role can use. Roles: employee, technician, dept-head, chief-engineer, eng-admin, super-admin, and GM.',
            'Your data belongs to your property (tenant) — you only ever see your own property’s records.',
        ],
    },
    {
        id: 'dashboard',
        title: 'Dashboard (Home)',
        body: [
            'The Home screen is your daily briefing: work-order counts by status, overdue maintenance, pending approvals, utility trends, and budget vs actuals.',
            'Numbers are live — tap a card to jump to the underlying list.',
        ],
    },
    {
        id: 'workorders',
        title: 'Work Orders',
        body: [
            'Create: Work Orders → New. Describe the problem, set priority and location, attach a photo if helpful.',
            'Lifecycle: draft → pending approval (dept-head, then chief-engineer) → approved → assigned → in progress → pending check → closed.',
            'Track progress from the work-order detail page: notes, photos, status changes, and cost entries.',
            'If you approve requests, they appear under Approvals with Approve / Reject actions.',
        ],
    },
    {
        id: 'calendar',
        title: 'Calendar & Daily Statistics',
        body: [
            'The calendar shows events and the green Daily Statistics entries (occupancy, guest, restaurant, and MICE numbers per day).',
            'Add a statistic: open a date → choose “Statistic” → enter the MTD numbers. The app computes the daily values automatically from the previous day.',
            'Events carry venue, type (half/full day), and optional file attachments.',
        ],
    },
    {
        id: 'maintenance',
        title: 'Preventive Maintenance',
        body: [
            'Schedules define recurring PM tasks per asset (daily, weekly, monthly). The system rolls them over automatically each night.',
            'Overdue schedules are flagged on the dashboard — clear them by completing the generated work orders.',
        ],
    },
    {
        id: 'mytasks',
        title: 'My Tasks (Technicians)',
        body: [
            'My Tasks lists every work order assigned to you. Open one to update status, add notes and photos, and fill the checklist.',
            'Logs (daily-logs) records what you did each day for handover and reporting.',
        ],
    },
    {
        id: 'assets',
        title: 'Assets, Locations & Checklists',
        body: [
            'Assets is the equipment registry with history and cost. Locations holds buildings, areas (e.g. AR-001), and rooms used as venues.',
            'Checklist templates define the inspection steps technicians fill on each job — create once, reuse everywhere.',
        ],
    },
    {
        id: 'roster',
        title: 'Roster',
        body: [
            'Roster shows who is on shift each day. Managers publish the roster; staff check their upcoming shifts here or via the Telegram bot.',
        ],
    },
    {
        id: 'store',
        title: 'Store & Inventory',
        body: [
            'Receiving records incoming goods; Requests take stock out for jobs; Adjustments correct counts.',
            'Low-stock items surface automatically so the store never runs dry mid-job.',
        ],
    },
    {
        id: 'utilities',
        title: 'Utilities',
        body: [
            'Record daily electricity, water, and gas meter stands. Cost is computed from your Rates table.',
            'Import many days at once with a CSV file. Variance reports show unusual consumption spikes.',
        ],
    },
    {
        id: 'budgets',
        title: 'Budgets & Expenses',
        body: [
            'Monthly Budgets set the spending plan; Expenses record actuals against post-accounts.',
            'The dashboard compares budget vs actual across energy, projects, and maintenance.',
        ],
    },
    {
        id: 'projects',
        title: 'Projects',
        body: [
            'Projects track bigger works with milestones, budget items, and actual costs.',
            'Update milestone status as phases complete; attach site photos for evidence.',
        ],
    },
    {
        id: 'telegram',
        title: 'Telegram Bot',
        body: [
            'Link: open Profile to get your 6-letter code, then send /start <code> to the bot.',
            'Field essentials: /workorder (new ticket), /inputds (daily statistics), /inputec (utility reading), /myroster (your shifts), /pending (approvals), /event (upcoming events).',
            'Send /cancel any time to quit what you are doing; /cmdlist shows everything.',
        ],
    },
    {
        id: 'billing',
        title: 'Billing & Subscription',
        body: [
            'Billing shows your plan and status. New properties start with a 14-day free trial.',
            'Before the trial ends you get a reminder; after expiry the app asks you to subscribe. Pay with QRIS, transfer, cards, or e-wallet via Midtrans — access activates automatically on payment.',
            'Plans: Starter Rp350rb, Professional Rp850rb, Enterprise Rp2jt per month.',
        ],
    },
    {
        id: 'profile',
        title: 'Profile & Notifications',
        body: [
            'Profile holds your name, phone, photo, and the Telegram link code.',
            'The bell shows system notifications (approvals, reminders, billing). Linked Telegram users get them as chat messages too.',
        ],
    },
];

export default function Help({ auth }) {
    const [query, setQuery] = useState('');
    const q = query.trim().toLowerCase();
    const shown = q
        ? SECTIONS.filter((s) => s.title.toLowerCase().includes(q) || s.body.some((b) => b.toLowerCase().includes(q)))
        : SECTIONS;

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Help & User Manual" />
            <div className="max-w-3xl mx-auto">
                <h1 className="text-2xl font-bold text-brand-800 mb-1">Help & User Manual</h1>
                <p className="text-sm text-gray-500 mb-4">Everything you need to run Engineering Buddy, in one place.</p>
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search the manual…"
                    className="w-full mb-4 px-4 py-2 rounded-xl border border-brand-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <div className="flex flex-wrap gap-2 mb-6">
                    {SECTIONS.map((s) => (
                        <a key={s.id} href={`#${s.id}`} className="text-xs px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 hover:bg-brand-100">
                            {s.title}
                        </a>
                    ))}
                </div>
                {shown.length === 0 && <p className="text-gray-500">No sections match “{query}”.</p>}
                {shown.map((s) => (
                    <section key={s.id} id={s.id} className="bg-white rounded-2xl shadow-sm border border-brand-50 p-5 mb-4 scroll-mt-4">
                        <h2 className="text-lg font-semibold text-brand-800 mb-2">{s.title}</h2>
                        <ul className="space-y-1.5">
                            {s.body.map((b, i) => (
                                <li key={i} className="text-sm text-gray-700 leading-relaxed">• {b}</li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </AuthenticatedLayout>
    );
}
