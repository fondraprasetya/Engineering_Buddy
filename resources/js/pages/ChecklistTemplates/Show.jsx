import { Head, Link, router } from '@inertiajs/react';
import { Copy } from 'lucide-react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';

export default function Show({ auth, template }) {
    const handleDuplicate = () => {
        if (confirm(`Copy "${template.name}" to a new template?`)) {
            router.post(`/checklist-templates/${template.id}/duplicate`);
        }
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title={template.name} />
            <div className="max-w-2xl mx-auto space-y-4">
                <Link href="/checklist-templates" className="text-sm text-brand-600 hover:text-brand-700">&larr; Back to Templates</Link>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-semibold text-gray-900">{template.name}</h2>
                        <div className="flex items-center gap-2">
                            <button onClick={handleDuplicate} className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl px-3 py-1.5 hover:bg-gray-200 hover:text-gray-800">
                                <Copy size={14} />
                                Copy
                            </button>
                            <Link href={`/checklist-templates/${template.id}/edit`} className="text-sm bg-brand-400 text-white rounded-xl px-3 py-1.5 hover:bg-brand-600">Edit</Link>
                        </div>
                    </div>
                    {template.asset_category && <p className="text-sm text-gray-500 mb-4">Category: {template.asset_category}</p>}

                    <h3 className="font-semibold text-gray-900 mb-3">Fields ({template.fields?.length})</h3>
                    {template.fields?.length > 0 ? (
                        <div className="space-y-2">
                            {template.fields.map((field) => (
                                <div key={field.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        {field.field_type === 'photo' && field.photo && (
                                            <img
                                                src={field.photo.startsWith('data:') ? field.photo : `/storage/${field.photo}`}
                                                alt={field.label}
                                                className="h-12 w-12 object-cover rounded-lg border border-gray-200"
                                            />
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{field.label}</p>
                                            <p className="text-xs text-gray-500">{field.field_type}{field.required ? ' · Required' : ''}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded">{field.field_type}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">No fields defined.</p>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
