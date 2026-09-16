import { useDraggable } from '@dnd-kit/core';
import { Type, Hash, Calendar, CheckSquare, Camera, Tag } from 'lucide-react';
import { useLang } from '../../i18n';

const fieldTypeKeys = [
    { fieldType: 'label', key: 'ft_label', icon: Tag },
    { fieldType: 'text', key: 'ft_text', icon: Type },
    { fieldType: 'number', key: 'ft_number', icon: Hash },
    { fieldType: 'date', key: 'ft_date', icon: Calendar },
    { fieldType: 'checkbox', key: 'ft_checkbox', icon: CheckSquare },
    { fieldType: 'photo', key: 'ft_photo', icon: Camera },
];

function PaletteItem({ fieldType, label, icon: Icon }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `palette-${fieldType}`,
        data: { source: 'palette', fieldType },
    });

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`flex items-center gap-2 p-3 rounded-xl border-2 border-dashed cursor-grab active:cursor-grabbing transition-colors ${
                isDragging
                    ? 'border-brand-400 bg-brand-50 opacity-50'
                    : 'border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50'
            }`}
        >
            <Icon size={18} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
    );
}

export default function FieldPalette() {
    const { t } = useLang();
    return (
        <div className="w-44 shrink-0 space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t('fb.field_types')}</h3>
            {fieldTypeKeys.map((ft) => (
                <PaletteItem key={ft.fieldType} fieldType={ft.fieldType} label={t('fb.' + ft.key)} icon={ft.icon} />
            ))}
        </div>
    );
}
