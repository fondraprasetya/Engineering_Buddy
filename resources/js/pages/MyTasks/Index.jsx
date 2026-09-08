import { Head, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

export default function Index({ auth, tasks }) {
    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="My Tasks" />
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">My Tasks</h2>

                {tasks.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">No assigned tasks.</div>
                ) : (
                    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.04 } } }} className="space-y-3">
                        {tasks.map((wo) => {
                            const assignment = wo.technician_assignments?.[0];
                            return (
                                <motion.div key={wo.id} variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}>
                                    <Link href={`/my-tasks/${wo.id}`} className="block bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-medium text-gray-900">{wo.title}</h3>
                                                <p className="text-sm text-gray-500 mt-0.5">
                                                    {wo.asset?.name ?? 'No asset'} · {assignment?.scheduled_date ? new Date(assignment.scheduled_date).toLocaleDateString() : ''} · {assignment?.shift}
                                                </p>
                                            </div>
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                                wo.status === 'assigned' ? 'bg-purple-100 text-purple-700' :
                                                wo.status === 'in_progress' ? 'bg-cyan-100 text-cyan-700' :
                                                'bg-rose-100 text-rose-700'
                                            }`}>
                                                {wo.status === 'in_progress' ? 'In Progress' : wo.status === 'pending_check' ? 'Pending Check' : 'Assigned'}
                                            </span>
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
