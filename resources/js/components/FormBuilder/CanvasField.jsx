import { useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Type, Hash, Calendar, CheckSquare, Camera, Tag, GripHorizontal, X } from 'lucide-react';

const typeIcons = { label: Tag, text: Type, number: Hash, date: Calendar, checkbox: CheckSquare, photo: Camera };
const typeColors = {
    label: 'bg-gray-50 border-gray-300',
    text: 'bg-blue-50 border-blue-200',
    number: 'bg-amber-50 border-amber-200',
    date: 'bg-purple-50 border-purple-200',
    checkbox: 'bg-green-50 border-green-200',
    photo: 'bg-pink-50 border-pink-200',
};

function readAndResizePhoto(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const MAX = 800;
                let { width, height } = img;
                if (width > MAX || height > MAX) {
                    const scale = MAX / Math.max(width, height);
                    width = Math.round(width * scale);
                    height = Math.round(height * scale);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export default function CanvasField({ field, isSelected, suppressTransform, onSelect, onResizeStart, onPhotoChange }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `field-${field.id}`,
        data: { source: 'canvas', fieldId: field.id },
    });

    const fileInputRef = useRef(null);

    const Icon = typeIcons[field.field_type] || Type;
    const colorClass = typeColors[field.field_type] || typeColors.text;

    const labelFontSize = Math.max(11, Math.min(18, Math.round(field.width / 20)));
    const inputFontSize = Math.max(10, labelFontSize - 1);

    const photoSrc = field.photo
        ? field.photo.startsWith('data:')
            ? field.photo
            : `/storage/${field.photo}`
        : null;

    const openPhotoPicker = (e) => {
        e.stopPropagation();
        onSelect(field.id);
        fileInputRef.current?.click();
    };

    const handlePhotoFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            readAndResizePhoto(file).then((dataUrl) => onPhotoChange(field.id, { photo: dataUrl }));
        }
        e.target.value = '';
    };

    const removePhoto = (e) => {
        e.stopPropagation();
        onPhotoChange(field.id, { photo: null });
    };

    const style = {
        position: 'absolute',
        left: field.x,
        top: field.y,
        width: field.width,
        transform: suppressTransform ? undefined : (transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined),
        zIndex: isDragging ? 50 : 10,
        opacity: isDragging ? 0.7 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`rounded-xl border-2 p-2 transition-shadow ${
                isSelected ? 'ring-2 ring-brand-400 shadow-lg border-brand-400' : colorClass
            }`}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(field.id, e.ctrlKey || e.metaKey || e.shiftKey);
            }}
        >
            <div className="flex items-center justify-between gap-2" {...listeners} {...attributes}>
                <div className="flex items-center gap-1.5 min-w-0">
                    <Icon size={14} className="text-gray-500 shrink-0" />
                    {field.field_type === 'label' ? (
                        <span className="font-bold text-gray-900 truncate" style={{ fontSize: labelFontSize }}>{field.label}</span>
                    ) : (
                        <span className="font-medium text-gray-800 truncate" style={{ fontSize: labelFontSize }}>
                            {field.label || 'Field'}
                            {field.required && <span className="text-red-500 ml-0.5">*</span>}
                        </span>
                    )}
                </div>
                <GripHorizontal size={14} className="text-gray-400 shrink-0" />
            </div>

            {field.field_type !== 'label' && (
                <div className="mt-1.5 pointer-events-none">
                    {field.field_type === 'text' && (
                        <input
                            type="text"
                            readOnly
                            tabIndex={-1}
                            placeholder="Type here..."
                            style={{ fontSize: inputFontSize }}
                            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-gray-800"
                        />
                    )}
                    {field.field_type === 'number' && (
                        <input
                            type="number"
                            readOnly
                            tabIndex={-1}
                            placeholder="0"
                            style={{ fontSize: inputFontSize }}
                            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-gray-800"
                        />
                    )}
                    {field.field_type === 'date' && (
                        <input
                            type="date"
                            readOnly
                            tabIndex={-1}
                            style={{ fontSize: inputFontSize }}
                            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-gray-800"
                        />
                    )}
                    {field.field_type === 'checkbox' && (
                        <div className="flex items-center py-0.5">
                            <input type="checkbox" readOnly tabIndex={-1} className="w-4 h-4 rounded border-gray-300 bg-gray-50" />
                        </div>
                    )}
                </div>
            )}

            {field.field_type === 'photo' && (
                <div className="mt-1.5">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoFileChange}
                    />
                    {photoSrc ? (
                        <div className="relative" onClick={openPhotoPicker}>
                            <img
                                src={photoSrc}
                                alt={field.label || 'Photo'}
                                className="w-full rounded-lg border border-gray-300 object-cover"
                                style={{ maxHeight: 90 }}
                            />
                            <button
                                onClick={removePhoto}
                                title="Remove photo"
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={openPhotoPicker}
                            className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-2 text-gray-500 hover:border-brand-300 hover:bg-brand-50"
                        >
                            <Camera size={16} />
                            <span style={{ fontSize: inputFontSize }}>Add Photo</span>
                        </button>
                    )}
                </div>
            )}

            {isSelected && (
                <div
                    className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-brand-400 rounded-sm cursor-se-resize"
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        onResizeStart(field.id, e);
                    }}
                />
            )}
        </div>
    );
}
