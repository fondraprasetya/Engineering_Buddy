import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Trash2, X } from 'lucide-react';

const fieldTypeOptions = [
    { value: 'label', label: 'Label' },
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'photo', label: 'Photo' },
];

export default function FieldDrawer({ field, pageCount, onUpdate, onDelete, onDuplicate, onMovePage, onClose }) {
    return (
        <AnimatePresence>
            {field && (
                <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-60 shrink-0 bg-white rounded-2xl shadow-sm border border-gray-200 self-start"
                >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-900 text-sm">Field Properties</h3>
                        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
                            <X size={16} className="text-gray-500" />
                        </button>
                    </div>

                    <div className="p-4 space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
                            <input
                                type="text"
                                value={field.label}
                                onChange={(e) => onUpdate(field.id, { label: e.target.value })}
                                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                            <select
                                value={field.field_type}
                                onChange={(e) => onUpdate(field.id, { field_type: e.target.value })}
                                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400"
                            >
                                {fieldTypeOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Page</label>
                            <select
                                value={field.page ?? 1}
                                onChange={(e) => onMovePage(field.id, parseInt(e.target.value))}
                                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400"
                            >
                                {Array.from({ length: pageCount || 1 }, (_, i) => i + 1).map((p) => (
                                    <option key={p} value={p}>Page {p}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="field-required"
                                checked={field.required}
                                onChange={(e) => onUpdate(field.id, { required: e.target.checked })}
                                className="rounded border-gray-300"
                            />
                            <label htmlFor="field-required" className="text-sm text-gray-700">Required</label>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Width (px)</label>
                            <input
                                type="number"
                                value={field.width}
                                min={50}
                                max={480}
                                onChange={(e) => onUpdate(field.id, { width: Math.max(50, parseInt(e.target.value) || 280) })}
                                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400"
                            />
                        </div>

                        <button
                            onClick={() => onDuplicate(field.id)}
                            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl py-2.5 hover:bg-gray-200"
                        >
                            <Copy size={16} />
                            Duplicate Field
                        </button>

                        <button
                            onClick={() => { onDelete(field.id); onClose(); }}
                            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-red-600 bg-red-50 rounded-xl py-2.5 hover:bg-red-100"
                        >
                            <Trash2 size={16} />
                            Delete Field
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
