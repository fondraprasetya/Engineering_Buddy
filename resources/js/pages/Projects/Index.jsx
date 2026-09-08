import { Head, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

export default function Index({ auth, projects }) {
    const role = auth.user.roles?.[0] ?? 'employee';
    const canManage = role === 'eng-admin' || role === 'chief-engineer';

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Projects" />
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
                    {canManage && <Link href="/projects/create" className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">New Project</Link>}
                </div>

                {projects.data.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">No projects found.</div>
                ) : (
                    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.04 } } }} className="space-y-3">
                        {projects.data.map((p) => (
                            <motion.div key={p.id} variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}>
                                <Link href={`/projects/${p.id}`} className="block bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-medium text-gray-900">{p.name}</h3>
                                            <p className="text-sm text-gray-500 mt-0.5">
                                                {new Date(p.start_date).toLocaleDateString()} - {new Date(p.end_date).toLocaleDateString()}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">{p.milestones_count} milestone(s) · {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(p.budget_planned ?? 0))}</p>
                                            {p.milestones_count > 0 && (
                                                <div className="mt-2 flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-green-500"
                                                            style={{ width: `${Math.round((p.completed_milestones_count / p.milestones_count) * 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-600">{Math.round((p.completed_milestones_count / p.milestones_count) * 100)}%</span>
                                                </div>
                                            )}
                                        </div>
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${p.status === 'completed' ? 'bg-green-100 text-green-700' : p.status === 'in_progress' ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {p.status?.replace('_', ' ') ?? 'planned'}
                                        </span>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
