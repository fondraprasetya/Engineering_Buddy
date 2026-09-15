import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '../layouts/AuthenticatedLayout';

const num = (v) => {
    const n = parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
};
const fmt = (n, d = 2) => (n === null ? '–' : n.toLocaleString('id-ID', { maximumFractionDigits: d }));

function Card({ title, icon, children }) {
    return (
        <section className="bg-white rounded-2xl shadow-sm border border-brand-50 p-5">
            <h2 className="text-base font-semibold text-brand-800 mb-3">{icon} {title}</h2>
            <div className="space-y-3">{children}</div>
        </section>
    );
}

function Field({ label, children, unit }) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{label}{unit ? ` (${unit})` : ''}</label>
            {children}
        </div>
    );
}

const inputCls = 'w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400 focus:border-transparent';

function Result({ label, value }) {
    return (
        <div className="flex justify-between items-center bg-brand-50/60 rounded-xl px-3 py-2">
            <span className="text-sm text-gray-600">{label}</span>
            <span className="text-sm font-bold text-brand-800">{value}</span>
        </div>
    );
}

function HvacTools() {
    const [btu, setBtu] = useState('');
    const [room, setRoom] = useState({ p: '', l: '', type: 'bedroom' });
    const factors = { bedroom: 500, living: 600, meeting: 700, kitchen: 800 };
    const b = num(btu);
    const area = (() => {
        const p = num(room.p);
        const l = num(room.l);
        return p !== null && l !== null ? p * l : null;
    })();
    const need = area !== null ? area * (factors[room.type] ?? 500) : null;

    return (
        <Card title="HVAC — BTU / PK / Watt" icon="❄️">
            <Field label="Capacity">
                <input type="number" min="0" value={btu} onChange={e => setBtu(e.target.value)} placeholder="e.g. 9000" className={inputCls} />
            </Field>
            {b !== null && (
                <>
                    <Result label="BTU/h" value={fmt(b, 0)} />
                    <Result label="PK (÷ 9.000)" value={fmt(b / 9000)} />
                    <Result label="Watt (≈ BTU ÷ 3,412)" value={fmt(b / 3.412, 0)} />
                </>
            )}
            <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-medium text-gray-600 mb-2">Room size → recommended AC</p>
                <div className="grid grid-cols-3 gap-2">
                    <input type="number" min="0" value={room.p} onChange={e => setRoom({ ...room, p: e.target.value })} placeholder="Length (m)" className={inputCls} />
                    <input type="number" min="0" value={room.l} onChange={e => setRoom({ ...room, l: e.target.value })} placeholder="Width (m)" className={inputCls} />
                    <select value={room.type} onChange={e => setRoom({ ...room, type: e.target.value })} className={inputCls}>
                        <option value="bedroom">Bedroom</option>
                        <option value="living">Living / Office</option>
                        <option value="meeting">Meeting room</option>
                        <option value="kitchen">Kitchen / Heat load</option>
                    </select>
                </div>
                {need !== null && (
                    <div className="mt-2 space-y-1.5">
                        <Result label={`Need (${fmt(area, 1)} m²)`} value={`${fmt(need, 0)} BTU/h`} />
                        <Result label="Recommended" value={`${fmt(Math.ceil(need / 9000 / 0.5) * 0.5)} PK`} />
                    </div>
                )}
            </div>
        </Card>
    );
}

const CABLE_TABLE = [
    [4500, '1.5 mm²'], [7500, '2.5 mm²'], [11000, '4 mm²'],
    [16000, '6 mm²'], [22000, '10 mm²'], [30000, '16 mm²'],
];
function cableFor(watts) {
    if (watts === null) return '–';
    for (const [limit, size] of CABLE_TABLE) {
        if (watts <= limit) return size;
    }
    return '≥ 25 mm² (consult PUIL)';
}

function ElectricalTools() {
    const [kw, setKw] = useState('');
    const [load, setLoad] = useState({ p: '', v: '220', phase: '1', cos: '0.8' });
    const k = num(kw);
    const p = num(load.p);
    const v = num(load.v) || 220;
    const cos = num(load.cos) || 0.8;
    const amps = p !== null ? (load.phase === '3' ? p / (Math.sqrt(3) * v * cos) : p / (v * cos)) : null;

    return (
        <Card title="Electrical — Power & Current" icon="⚡">
            <Field label="Power">
                <input type="number" min="0" value={kw} onChange={e => setKw(e.target.value)} placeholder="e.g. 5.5" className={inputCls} />
            </Field>
            {k !== null && (
                <>
                    <Result label="Watt" value={fmt(k * 1000, 0)} />
                    <Result label="HP (× 1.34)" value={fmt(k * 1.34)} />
                    <Result label="Ampere @220V 1φ" value={fmt((k * 1000) / (220 * 0.8), 1) + ' A'} />
                </>
            )}
            <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-medium text-gray-600 mb-2">Load → current & cable</p>
                <div className="grid grid-cols-2 gap-2">
                    <input type="number" min="0" value={load.p} onChange={e => setLoad({ ...load, p: e.target.value })} placeholder="Load (watt)" className={inputCls} />
                    <input type="number" min="0" value={load.v} onChange={e => setLoad({ ...load, v: e.target.value })} placeholder="Voltage (V)" className={inputCls} />
                    <select value={load.phase} onChange={e => setLoad({ ...load, phase: e.target.value })} className={inputCls}>
                        <option value="1">1 phase</option>
                        <option value="3">3 phase</option>
                    </select>
                    <input type="number" min="0" step="0.01" value={load.cos} onChange={e => setLoad({ ...load, cos: e.target.value })} placeholder="cos φ (0.8)" className={inputCls} />
                </div>
                {amps !== null && (
                    <div className="mt-2 space-y-1.5">
                        <Result label="Current" value={`${fmt(amps, 1)} A`} />
                        <Result label="Min. cable (Cu)" value={cableFor(p)} />
                    </div>
                )}
            </div>
        </Card>
    );
}

function UnitTools() {
    const [pressure, setPressure] = useState('');
    const [temp, setTemp] = useState('');
    const pr = num(pressure);
    const tp = num(temp);
    return (
        <Card title="Pressure & Temperature" icon="🌡️">
            <Field label="Pressure (bar)">
                <input type="number" value={pressure} onChange={e => setPressure(e.target.value)} placeholder="e.g. 6" className={inputCls} />
            </Field>
            {pr !== null && (
                <>
                    <Result label="psi (× 14.5)" value={fmt(pr * 14.5038)} />
                    <Result label="kPa (× 100)" value={fmt(pr * 100, 0)} />
                </>
            )}
            <div className="border-t border-gray-100 pt-3">
                <Field label="Temperature (°C)">
                    <input type="number" value={temp} onChange={e => setTemp(e.target.value)} placeholder="e.g. 25" className={inputCls} />
                </Field>
                {tp !== null && <div className="mt-2"><Result label="°F" value={fmt((tp * 9) / 5 + 32)} /></div>}
            </div>
        </Card>
    );
}

export default function Tools({ auth }) {
    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Engineering Tools" />
            <div className="max-w-3xl mx-auto space-y-4">
                <div>
                    <h1 className="text-xl font-bold text-brand-800">Engineering Tools</h1>
                    <p className="text-sm text-gray-500">Field calculators — work fully offline once loaded.</p>
                </div>
                <HvacTools />
                <ElectricalTools />
                <UnitTools />
            </div>
        </AuthenticatedLayout>
    );
}
