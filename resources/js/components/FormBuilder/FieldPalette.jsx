import { useDraggable } from '@dnd-kit/core';
import { Type, Hash, Calendar, CheckSquare, Camera, Tag } from 'lucide-react';

const fieldTypes = [
    { fieldType: 'label', label: 'Label', icon: Tag },
    { fieldType: 'text', label: 'Text', icon: Type },
    { fieldType: 'number', label: 'Number', icon: Hash },
    { fieldType: 'date', label: 'Date', icon: Calendar },
    { fieldType: 'checkbox', label: 'Checkbox', icon: CheckSquare },
    { fieldType: 'photo', label: 'Photo', icon: Camera },
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
    return (
        <div className="w-44 shrink-0 space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Field Types</h3>
            {fieldTypes.map((ft) => (
                <PaletteItem key={ft.type} {...ft} />
            ))}
        </div>
    );
}
