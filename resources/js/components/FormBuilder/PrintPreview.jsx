import { Printer, X, Camera } from 'lucide-react';

const SCALE_X = 794 / 500;
const SCALE_Y = 1.0;

function PrintField({ field }) {
    const style = {
        position: 'absolute',
        left: field.x * SCALE_X,
        top: field.y * SCALE_Y,
        width: field.width * SCALE_X,
    };
    const labelFontSize = Math.max(11, Math.min(22, Math.round(field.width / 22)));

    if (field.field_type === 'label') {
        return (
            <div style={style}>
                <span className="block font-bold text-gray-900" style={{ fontSize: labelFontSize }}>{field.label}</span>
            </div>
        );
    }

    const label = (
        <span className="block font-semibold text-gray-800 mb-1" style={{ fontSize: labelFontSize }}>
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
    );

    if (field.field_type === 'checkbox') {
        return (
            <div style={style}>
                {label}
                <div className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-gray-700 inline-block rounded-sm" />
                </div>
            </div>
        );
    }

    if (field.field_type === 'photo') {
        const src = field.photo
            ? field.photo.startsWith('data:')
                ? field.photo
                : `/storage/${field.photo}`
            : null;
        return (
            <div style={style}>
                {label}
                {src ? (
                    <img
                        src={src}
                        alt={field.label || 'Photo'}
                        className="w-full h-20 border border-gray-400 rounded object-cover"
                    />
                ) : (
                    <div className="flex items-center justify-center h-20 border border-dashed border-gray-400 rounded bg-gray-50">
                        <Camera size={18} className="text-gray-400" />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={style}>
            {label}
            <input
                type={field.field_type}
                readOnly
                className="w-full border-b-2 border-gray-400 bg-transparent focus:outline-none"
            />
        </div>
    );
}

function PrintSheet({ pageNo, pageTotal, name, category, fields }) {
    return (
        <div
            className="print-sheet bg-white mx-auto shadow-lg print:shadow-none"
            style={{ width: 794, minHeight: 1123, position: 'relative' }}
        >
            <div className="pt-10 pb-6 px-8 text-center border-b-2 border-gray-800">
                <h1 className="text-2xl font-bold text-gray-900 uppercase">{name || 'Untitled Template'}</h1>
                {category && <p className="text-sm text-gray-600 mt-1">Category: {category}</p>}
                <p className="text-sm text-gray-500 mt-2">Date: ____________</p>
            </div>

            <div className="relative" style={{ height: 1123 - 170 }}>
                {fields.map((f) => (
                    <PrintField key={f.id} field={f} />
                ))}
            </div>

            {pageTotal > 1 && (
                <div className="absolute bottom-6 left-0 right-0 text-center text-xs text-gray-400">
                    Page {pageNo} of {pageTotal}
                </div>
            )}
        </div>
    );
}

export default function PrintPreview({ name, category, fields, onClose }) {
    const byPage = fields.reduce((acc, f) => {
        const p = f.page ?? 1;
        (acc[p] = acc[p] ?? []).push(f);
        return acc;
    }, {});
    const pageNumbers = Object.keys(byPage).map(Number).sort((a, b) => a - b);

    return (
        <div className="fixed inset-0 z-40 print:static">
            <div className="absolute inset-0 bg-black/40 print:hidden" onClick={onClose} />

            <div className="absolute inset-0 flex items-start justify-center p-4 pointer-events-none print:block print:p-0 overflow-auto">
                <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-3xl print:max-w-none print:rounded-none print:shadow-none print:static">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 print:hidden">
                        <h3 className="font-semibold text-gray-900">Print Preview</h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => window.print()}
                                className="inline-flex items-center gap-1.5 bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600"
                            >
                                <Printer size={15} />
                                Print
                            </button>
                            <button
                                onClick={onClose}
                                className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-200"
                            >
                                <X size={15} />
                                Close
                            </button>
                        </div>
                    </div>

                    <div className="py-4 space-y-6 print:space-y-0 print:p-0">
                        {pageNumbers.map((p, idx) => (
                            <PrintSheet
                                key={p}
                                pageNo={idx + 1}
                                pageTotal={pageNumbers.length}
                                name={name}
                                category={category}
                                fields={byPage[p]}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
