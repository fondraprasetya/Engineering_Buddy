import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import FormBuilder from '../../components/FormBuilder';
import { useLang } from '../../i18n';

export default function Create({ auth }) {
    const { t } = useLang();
    const { data, setData, post, processing, errors } = useForm({
        name: '', asset_category: '', fields: [],
    });

    const handleSave = (fields) => {
        setData('fields', fields);
        post('/checklist-templates');
    };

    const fieldErrors = Object.entries(errors);

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title={t('cl.form_create')} />

            {fieldErrors.length > 0 && (
                <div className="mb-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                    <p className="text-sm font-medium text-red-700 mb-1">{t('cl.save_fail')}</p>
                    <ul className="list-disc list-inside text-xs text-red-600 space-y-0.5">
                        {fieldErrors.map(([k, v]) => (
                            <li key={k}>{v}</li>
                        ))}
                    </ul>
                </div>
            )}

            <FormBuilder
                onSave={handleSave}
                saving={processing}
                name={data.name}
                category={data.asset_category}
                onNameChange={(v) => setData('name', v)}
                onCategoryChange={(v) => setData('asset_category', v)}
                errors={errors}
            />
        </AuthenticatedLayout>
    );
}
