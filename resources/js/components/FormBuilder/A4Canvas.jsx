import { useDroppable } from '@dnd-kit/core';
import CanvasField from './CanvasField';

function RulerX({ length }) {
    const ticks = [];
    for (let i = 0; i <= length; i += 50) {
        const isMajor = i % 100 === 0;
        ticks.push(
            <div
                key={`t${i}`}
                className="absolute border-l border-gray-300"
                style={{ left: i, top: 0, height: isMajor ? 9 : 5 }}
            />
        );
        if (isMajor) {
            ticks.push(
                <span
                    key={`n${i}`}
                    className="absolute text-[8px] leading-none text-gray-400 font-medium"
                    style={{ left: i + 3, top: 10 }}
                >
                    {i}
                </span>
            );
        }
    }
    return (
        <div className="absolute left-0 right-0 top-0 h-[18px] bg-gray-100/90 border-b border-gray-300 pointer-events-none overflow-hidden">
            {ticks}
        </div>
    );
}

function RulerY({ length }) {
    const ticks = [];
    for (let i = 0; i <= length; i += 50) {
        const isMajor = i % 100 === 0;
        ticks.push(
            <div
                key={`t${i}`}
                className="absolute border-t border-gray-300"
                style={{ top: i, left: 0, width: isMajor ? 9 : 5 }}
            />
        );
        if (isMajor) {
            ticks.push(
                <span
                    key={`n${i}`}
                    className="absolute text-[8px] leading-none text-gray-400 font-medium"
                    style={{ top: i + 3, left: 10 }}
                >
                    {i}
                </span>
            );
        }
    }
    return (
        <div className="absolute left-0 top-0 bottom-0 w-[18px] bg-gray-100/90 border-r border-gray-300 pointer-events-none overflow-hidden">
            {ticks}
        </div>
    );
}

export default function A4Canvas({ fields, selectedIds = [], suppressTransformId, onSelect, onResizeStart, onPhotoChange, children }) {
    const { setNodeRef, isOver } = useDroppable({
        id: 'a4-canvas',
        data: { source: 'canvas-drop' },
    });

    return (
        <div className="flex-1 flex justify-center overflow-auto py-4">
            <div
                ref={setNodeRef}
                className={`relative bg-white shadow-lg transition-shadow rounded-sm shrink-0 ${
                    isOver ? 'shadow-xl ring-2 ring-brand-300' : ''
                }`}
                style={{
                    width: 500,
                    minHeight: 707,
                    aspectRatio: 'auto',
                    backgroundImage: `
                        linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px),
                        linear-gradient(to right, rgba(0,0,0,0.07) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(0,0,0,0.07) 1px, transparent 1px),
                        linear-gradient(to right, rgba(0,0,0,0.11) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(0,0,0,0.11) 1px, transparent 1px)
                    `,
                    backgroundSize: '10px 10px, 10px 10px, 50px 50px, 50px 50px, 100px 100px, 100px 100px',
                }}
            >
                <RulerX length={500} />
                <RulerY length={707} />

                {fields.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-sm text-gray-400">Drag fields here</p>
                    </div>
                )}

                {fields.map((field) => (
                    <CanvasField
                        key={field.id}
                        field={field}
                        isSelected={selectedIds.includes(field.id)}
                        suppressTransform={field.id === suppressTransformId}
                        onSelect={onSelect}
                        onResizeStart={onResizeStart}
                        onPhotoChange={onPhotoChange}
                    />
                ))}

                {children}
            </div>
        </div>
    );
}
