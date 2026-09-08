import { WIDGETS } from '../widgetRegistry';

export default function WidgetSettingsDrawer({ layout, hidden, onToggle, onReorder, onReset, onClose }) {
    const visible = layout.filter(l => !hidden.includes(l.key));
    const hiddenWidgets = layout.filter(l => hidden.includes(l.key));

    const moveUp = (index) => {
        if (index === 0) return;
        const item = visible[index];
        const prev = visible[index - 1];
        onReorder(item.key, prev.key);
    };

    const moveDown = (index) => {
        if (index >= visible.length - 1) return;
        const item = visible[index];
        const next = visible[index + 1];
        onReorder(item.key, next.key);
    };

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
            <div className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-white shadow-xl overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="text-sm font-semibold text-gray-900">Widget Settings</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
                </div>

                <div className="p-4 space-y-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Visible Widgets</p>
                    {visible.length === 0 && <p className="text-xs text-gray-400">No visible widgets.</p>}
                    {visible.map((item, i) => {
                        const widget = WIDGETS.find(w => w.key === item.key);
                        return (
                            <div key={item.key} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <div className="flex flex-col gap-0.5">
                                        <button onClick={() => moveUp(i)} className="text-[10px] text-gray-400 hover:text-gray-600 leading-none" disabled={i === 0}>&#9650;</button>
                                        <button onClick={() => moveDown(i)} className="text-[10px] text-gray-400 hover:text-gray-600 leading-none" disabled={i >= visible.length - 1}>&#9660;</button>
                                    </div>
                                    <span className="text-sm text-gray-900">{widget?.title ?? item.key}</span>
                                </div>
                                <button
                                    onClick={() => onToggle(item.key)}
                                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                                >
                                    Hide
                                </button>
                            </div>
                        );
                    })}
                </div>

                {hiddenWidgets.length > 0 && (
                    <div className="p-4 pt-0 space-y-3">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hidden Widgets</p>
                        {hiddenWidgets.map(item => {
                            const widget = WIDGETS.find(w => w.key === item.key);
                            return (
                                <div key={item.key} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl opacity-60">
                                    <span className="text-sm text-gray-500">{widget?.title ?? item.key}</span>
                                    <button
                                        onClick={() => onToggle(item.key)}
                                        className="text-xs text-brand-400 hover:text-brand-700 font-medium"
                                    >
                                        Show
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="p-4 border-t border-gray-200">
                    <button
                        onClick={onReset}
                        className="w-full text-center text-xs text-gray-500 hover:text-gray-700 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
                    >
                        Reset to Defaults
                    </button>
                </div>
            </div>
        </>
    );
}
