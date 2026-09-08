import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Type, Hash, Calendar, CheckSquare, Camera, Tag, Eye, Plus, Copy, Trash2 } from 'lucide-react';
import FieldPalette from './FieldPalette';
import A4Canvas from './A4Canvas';
import FieldDrawer from './FieldDrawer';
import PrintPreview from './PrintPreview';

const fieldTypeIcons = { label: Tag, text: Type, number: Hash, date: Calendar, checkbox: CheckSquare, photo: Camera };

let nextId = 1;

function createField(fieldType, x, y, page = 1) {
    return {
        id: `f-${nextId++}`,
        label: '',
        field_type: fieldType,
        required: false,
        x,
        y,
        width: 280,
        page,
        photo: null,
    };
}

export default function FormBuilder({ initialFields, onSave, saving, name = '', category = '', onNameChange, onCategoryChange, errors = {} }) {
    const [fields, setFields] = useState(() => {
        if (initialFields && initialFields.length > 0) {
            return initialFields.map((f) => ({ ...f, id: f.id ?? `f-${nextId++}`, page: f.page ?? 1 }));
        }
        return [];
    });
    const [pageCount, setPageCount] = useState(() => {
        const maxPage = initialFields?.length ? Math.max(...initialFields.map((f) => f.page ?? 1)) : 1;
        return Math.max(1, maxPage);
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState([]);
    const [activeDrag, setActiveDrag] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const canvasRef = useRef(null);
    const pointerRef = useRef(null);
    const dragStartRef = useRef(null);

    useEffect(() => {
        const handlePointerMove = (e) => {
            pointerRef.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener('pointermove', handlePointerMove, { passive: true });
        return () => window.removeEventListener('pointermove', handlePointerMove);
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (selectedIds.length === 0) return;
            const target = e.target;
            if (
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.tagName === 'SELECT' ||
                    target.isContentEditable)
            ) {
                return;
            }

            const step = e.shiftKey ? 1 : 10;
            let dx = 0;
            let dy = 0;
            switch (e.key) {
                case 'ArrowUp': dy = -step; break;
                case 'ArrowDown': dy = step; break;
                case 'ArrowLeft': dx = -step; break;
                case 'ArrowRight': dx = step; break;
                default: return;
            }

            e.preventDefault();
            setFields((prev) =>
                prev.map((f) =>
                    selectedIds.includes(f.id)
                        ? { ...f, x: Math.max(0, Math.round(f.x + dx)), y: Math.max(0, Math.round(f.y + dy)) }
                        : f
                )
            );
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIds]);

    const selectedField = selectedIds.length === 1 ? (fields.find((f) => f.id === selectedIds[0]) ?? null) : null;
    const currentPageFields = fields.filter((f) => (f.page ?? 1) === currentPage);
    const suppressTransformId = activeDrag?.type === 'canvas' && activeDrag.groupCount > 1 ? activeDrag.fieldId : null;

    const handleSelectField = useCallback((id, additive = false) => {
        setSelectedIds((prev) => {
            if (additive) {
                return prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id];
            }
            return [id];
        });
    }, []);

    const handleDragStart = useCallback((event) => {
        const { active } = event;
        if (active.data.current?.source === 'palette') {
            setActiveDrag({ type: 'palette', fieldType: active.data.current.fieldType });
        } else if (active.data.current?.source === 'canvas') {
            const fieldId = active.data.current.fieldId;
            const f = fields.find((ff) => ff.id === fieldId);
            if (!f) return;
            const group = selectedIds.includes(fieldId) ? selectedIds : [fieldId];
            const start = new Map();
            fields.forEach((ff) => {
                if (group.includes(ff.id)) {
                    start.set(ff.id, { x: ff.x, y: ff.y });
                }
            });
            dragStartRef.current = start;
            setActiveDrag({ type: 'canvas', field: f, fieldId, groupCount: group.length });
        }
    }, [fields, selectedIds]);

    const handleDragMove = useCallback((event) => {
        const { active, delta } = event;
        if (active.data.current?.source !== 'canvas') return;
        const start = dragStartRef.current;
        if (!start || start.size <= 1) return;
        setFields((prev) =>
            prev.map((f) => {
                const s = start.get(f.id);
                return s
                    ? { ...f, x: Math.max(0, Math.round(s.x + delta.x)), y: Math.max(0, Math.round(s.y + delta.y)) }
                    : f;
            })
        );
    }, []);

    const handleDragEnd = useCallback((event) => {
        const { active, over, delta } = event;

        if (active.data.current?.source === 'palette' && over?.id === 'a4-canvas') {
            const rect = over.rect;
            const pointer = pointerRef.current;
            let dropX = 20;
            let dropY = 20;
            if (rect && pointer) {
                dropX = Math.max(0, Math.min(500 - 280, Math.round(pointer.x - rect.left)));
                dropY = Math.max(0, Math.min(707 - 80, Math.round(pointer.y - rect.top)));
            } else {
                const pageFields = fields.filter((f) => (f.page ?? 1) === currentPage);
                dropY = pageFields.length * 68 + 20;
            }
            const newField = createField(active.data.current.fieldType, dropX, dropY, currentPage);
            setFields((prev) => [...prev, newField]);
            setSelectedIds([newField.id]);
        } else if (active.data.current?.source === 'canvas') {
            const fieldId = active.data.current.fieldId;
            const start = dragStartRef.current;
            if (start && start.size > 1) {
                setFields((prev) =>
                    prev.map((f) => {
                        const s = start.get(f.id);
                        return s
                            ? { ...f, x: Math.max(0, Math.round(s.x + delta.x)), y: Math.max(0, Math.round(s.y + delta.y)) }
                            : f;
                    })
                );
            } else {
                setFields((prev) =>
                    prev.map((f) =>
                        f.id === fieldId
                            ? {
                                ...f,
                                x: Math.max(0, Math.round(f.x + delta.x)),
                                y: Math.max(0, Math.round(f.y + delta.y)),
                            }
                            : f
                    )
                );
            }
        }

        setActiveDrag(null);
        dragStartRef.current = null;
        pointerRef.current = null;
    }, [fields, currentPage]);

    const handleDragCancel = useCallback(() => {
        setActiveDrag(null);
        dragStartRef.current = null;
    }, []);

    const handleCanvasClick = useCallback(() => {
        setSelectedIds([]);
    }, []);

    const handleFieldUpdate = useCallback((id, updates) => {
        setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    }, []);

    const handleFieldDelete = useCallback((id) => {
        setFields((prev) => prev.filter((f) => f.id !== id));
        setSelectedIds((prev) => prev.filter((s) => s !== id));
    }, []);

    const handleDeleteSelected = useCallback(() => {
        setFields((prev) => prev.filter((f) => !selectedIds.includes(f.id)));
        setSelectedIds([]);
    }, [selectedIds]);

    const handleFieldDuplicate = useCallback((id) => {
        const field = fields.find((f) => f.id === id);
        if (!field) return;
        const newField = { ...field, id: `f-${nextId++}`, y: Math.round(field.y) + 80 };
        setFields((prev) => [...prev, newField]);
        setSelectedIds([newField.id]);
    }, [fields]);

    const handleDuplicateSelected = useCallback(() => {
        const newFields = fields
            .filter((f) => selectedIds.includes(f.id))
            .map((f) => ({ ...f, id: `f-${nextId++}`, y: Math.round(f.y) + 80 }));
        if (newFields.length === 0) return;
        setFields((prev) => [...prev, ...newFields]);
        setSelectedIds(newFields.map((f) => f.id));
    }, [fields, selectedIds]);

    const handleAddPage = useCallback(() => {
        setPageCount((c) => c + 1);
        setCurrentPage(pageCount + 1);
        setSelectedIds([]);
    }, [pageCount]);

    const handleMovePage = useCallback((id, newPage) => {
        setFields((prev) => prev.map((f) => (f.id === id ? { ...f, page: newPage } : f)));
        setCurrentPage(newPage);
        setSelectedIds([id]);
    }, []);

    const handleResizeStart = useCallback((fieldId, e) => {
        e.preventDefault();
        const startX = e.clientX;
        const field = fields.find((f) => f.id === fieldId);
        if (!field) return;

        const handleMouseMove = (ev) => {
            const dx = ev.clientX - startX;
            const newWidth = Math.max(50, Math.min(480, Math.round(field.width + dx)));
            handleFieldUpdate(fieldId, { width: newWidth });
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [fields, handleFieldUpdate]);

    const handleSave = () => {
        const data = fields.map((f, i) => ({
            label: f.label || `Field ${i + 1}`,
            field_type: f.field_type,
            required: f.required,
            sort_order: i,
            page: f.page ?? 1,
            x: Math.round(f.x),
            y: Math.round(f.y),
            width: Math.round(f.width),
            photo: f.photo ?? null,
        }));
        onSave(data);
    };

    const DragOverlayContent = activeDrag ? (
        activeDrag.type === 'palette' ? (
            <div className="flex items-center gap-2 p-3 rounded-xl border-2 border-brand-400 bg-brand-50 shadow-lg w-40">
                {React.createElement(fieldTypeIcons[activeDrag.fieldType] || Type, { size: 18, className: 'text-brand-600' })}
                <span className="text-sm font-medium text-brand-700">{activeDrag.fieldType}</span>
            </div>
        ) : (
            <div className="rounded-xl border-2 border-brand-400 bg-white shadow-lg p-3" style={{ width: activeDrag.field.width }}>
                <div className="flex items-center gap-1.5">
                    {React.createElement(fieldTypeIcons[activeDrag.field.field_type] || Type, { size: 14, className: 'text-gray-500' })}
                    <span className="text-sm font-medium text-gray-800 truncate">
                        {activeDrag.groupCount > 1
                            ? `${activeDrag.groupCount} fields`
                            : activeDrag.field.label || 'Field'}
                    </span>
                </div>
            </div>
        )
    ) : null;

    return (
        <DndContext
            sensors={sensors}
            autoScroll={false}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <div className="flex gap-4 h-full" onClick={handleCanvasClick}>
                <div className="flex flex-col gap-3 w-52 shrink-0">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Template Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => onNameChange?.(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400"
                            placeholder="e.g. Guest Room PMM"
                        />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                        <input
                            type="text"
                            value={category}
                            onChange={(e) => onCategoryChange?.(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400"
                            placeholder="e.g. Guest Room, Building"
                        />
                    </div>
                    <FieldPalette />
                    <button
                        onClick={() => setShowPreview(true)}
                        disabled={fields.length === 0}
                        className="w-full inline-flex items-center justify-center gap-1.5 bg-white text-brand-700 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-brand-50 disabled:opacity-50 border border-brand-200"
                    >
                        <Eye size={16} />
                        Print Preview
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || fields.length === 0}
                        className="w-full inline-flex items-center justify-center gap-1.5 bg-brand-400 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Template'}
                    </button>
                </div>
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex items-center gap-2 mb-2 px-1" onClick={(e) => e.stopPropagation()}>
                        {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                            <button
                                key={p}
                                onClick={() => { setCurrentPage(p); setSelectedIds([]); }}
                                className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                                    currentPage === p
                                        ? 'bg-brand-400 text-white border-brand-400'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-brand-50'
                                }`}
                            >
                                Page {p}
                            </button>
                        ))}
                        <button
                            onClick={handleAddPage}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium bg-white text-brand-700 border border-dashed border-brand-300 hover:bg-brand-50"
                        >
                            <Plus size={14} />
                            Add Page
                        </button>
                    </div>
                    <A4Canvas
                        fields={currentPageFields}
                        selectedIds={selectedIds}
                        suppressTransformId={suppressTransformId}
                        onSelect={handleSelectField}
                        onResizeStart={handleResizeStart}
                        onPhotoChange={handleFieldUpdate}
                    />
                </div>
                {selectedIds.length > 1 ? (
                    <div className="w-64 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-white rounded-2xl border border-brand-200 p-4">
                            <p className="text-sm font-semibold text-gray-900">{selectedIds.length} fields selected</p>
                            <p className="text-xs text-gray-500 mt-1 mb-3">
                                Ctrl/Shift-click to add. Drag any selected field to move the group. Arrows nudge.
                            </p>
                            <div className="space-y-2">
                                <button
                                    onClick={handleDuplicateSelected}
                                    className="w-full inline-flex items-center justify-center gap-1.5 bg-white text-brand-700 rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-50 border border-brand-200"
                                >
                                    <Copy size={15} />
                                    Duplicate Fields
                                </button>
                                <button
                                    onClick={handleDeleteSelected}
                                    className="w-full inline-flex items-center justify-center gap-1.5 bg-white text-red-600 rounded-xl px-4 py-2 text-sm font-medium hover:bg-red-50 border border-red-200"
                                >
                                    <Trash2 size={15} />
                                    Delete Fields
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <FieldDrawer
                        field={selectedField}
                        pageCount={pageCount}
                        onUpdate={handleFieldUpdate}
                        onDelete={handleFieldDelete}
                        onDuplicate={handleFieldDuplicate}
                        onMovePage={handleMovePage}
                        onClose={() => setSelectedIds([])}
                    />
                )}
            </div>

            <DragOverlay dropAnimation={null}>
                {DragOverlayContent}
            </DragOverlay>

            {showPreview && (
                <PrintPreview
                    name={name}
                    category={category}
                    fields={fields}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </DndContext>
    );
}
