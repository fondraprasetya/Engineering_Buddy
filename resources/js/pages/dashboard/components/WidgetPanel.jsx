import { useState } from 'react';
import { WIDTH_OPTIONS } from '../widgetRegistry';

export default function WidgetPanel({ title, width, onWidthChange, onRemove, children }) {
    const [showMenu, setShowMenu] = useState(false);

    const widthLabel = WIDTH_OPTIONS.find(w => w.value === width)?.label ?? 'Medium';

    return (
        <div className="bg-white rounded-2xl shadow-sm p-5 relative group">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="text-xs text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded hover:bg-brand-50"
                            title="Resize"
                        >
                            {widthLabel}
                        </button>
                        {showMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                                <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[120px]">
                                    {WIDTH_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => { onWidthChange(opt.value); setShowMenu(false); }}
                                            className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${width === opt.value ? 'font-semibold text-brand-600' : 'text-gray-700'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    <button
                        onClick={onRemove}
                        className="text-xs text-gray-400 hover:text-red-500 px-1.5 py-0.5 rounded hover:bg-red-50"
                        title="Hide widget"
                    >
                        ✕
                    </button>
                </div>
            </div>
            {children}
        </div>
    );
}
