import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

const typeColors = {
    building: 'bg-brand-50 text-brand-700',
    area: 'bg-green-100 text-green-700',
    room: 'bg-orange-100 text-orange-700',
};

const depthLabels = ['Building', 'Floor', 'Area', 'Room'];

function TreeNode({ node, depth }) {
    const [open, setOpen] = useState(depth < 2);
    const hasChildren = node.children?.length > 0;

    return (
        <div>
            <div
                className={`flex items-center gap-2 py-2 px-2 rounded-xl hover:bg-gray-50 cursor-pointer ${depth === 0 ? 'bg-white shadow-sm mb-1' : ''}`}
                style={{ paddingLeft: `${depth * 24 + 8}px` }}
                onClick={() => hasChildren && setOpen(!open)}
            >
                {hasChildren ? (
                    <span className="text-gray-400 text-xs w-4 shrink-0">{open ? '▼' : '▶'}</span>
                ) : (
                    <span className="text-gray-200 text-xs w-4 shrink-0">•</span>
                )}
                {depth !== 1 && depth !== 2 && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${typeColors[node.type] ?? 'bg-gray-100 text-gray-700'}`}>
                        {depthLabels[depth] ?? node.type.charAt(0).toUpperCase() + node.type.slice(1)}
                    </span>
                )}
                <span className="font-medium text-gray-900 text-sm">{node.name}</span>
                {node.floor_number && <span className="text-xs text-gray-400">Floor {node.floor_number}</span>}
                {node.code && <span className="text-xs text-gray-400">{node.code}</span>}
                <Link href={`/locations/${node.id}/edit`} className="text-xs text-brand-600 hover:text-brand-700 ml-auto shrink-0" onClick={e => e.stopPropagation()}>
                    Edit
                </Link>
            </div>
            <AnimatePresence>
                {hasChildren && open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                    >
                        {node.children.map(child => (
                            <TreeNode key={child.id} node={child} depth={depth + 1} />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function Index({ auth, tree }) {
    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Locations" />
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Locations</h2>
                    <Link href="/locations/create" className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">New Location</Link>
                </div>

                {tree.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">No locations found.</div>
                ) : (
                    <div className="space-y-1">
                        {tree.map(node => (
                            <TreeNode key={node.id} node={node} depth={0} />
                        ))}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
