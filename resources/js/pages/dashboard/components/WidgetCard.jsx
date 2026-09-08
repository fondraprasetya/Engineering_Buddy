export default function WidgetCard({ title, icon: Icon, children, className = '', color }) {
    return (
        <div className={`bg-white rounded-2xl shadow-sm border border-brand-50 p-5 ${className}`}>
            {title && (
                <div className="flex items-center gap-2 mb-4">
                    {Icon && (
                        <span className="p-1.5 rounded-xl bg-brand-50">
                            <Icon size={16} className="text-brand-600" />
                        </span>
                    )}
                    <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                </div>
            )}
            {children}
        </div>
    );
}
