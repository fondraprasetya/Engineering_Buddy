import { Link } from '@inertiajs/react';

const rp = (v) => new Intl.NumberFormat('id-ID').format(v);

export default function NewsSection({ occupancy, upcomingEvents }) {
    const latest = occupancy?.find(o => o.label === 'Today') ?? occupancy?.[0] ?? {};
    const todayRate = latest.rate ?? 0;
    const todayOccupied = latest.occupied ?? 0;
    const todayAvailable = latest.available ?? 0;

    return (
        <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">News</h3>

            <div className="mb-4 p-3 bg-blue-50 rounded-xl">
                <p className="text-xs font-medium text-brand-700 mb-1">Hotel Occupancy — Today</p>
                <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-brand-800">{todayRate}%</span>
                    <span className="text-xs text-brand-600 mb-1">{rp(todayOccupied)} / {rp(todayAvailable)} rooms</span>
                </div>
            </div>

            {occupancy?.length > 0 && (
                <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">7-Day Trend</p>
                    <div className="flex items-end gap-1">
                        {occupancy.map((d, i) => (
                            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-[10px] font-medium text-gray-600">{d.rate}%</span>
                                <div
                                    className="w-full rounded-t"
                                    style={{
                                        height: `${Math.max(d.rate * 0.6, 4)}px`,
                                        backgroundColor: d.rate > 70 ? '#22C55E' : d.rate > 40 ? '#F59E0B' : '#EF4444',
                                    }}
                                />
                                <span className="text-[10px] text-gray-400">{d.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Next 7 Days</p>
                {(!upcomingEvents || upcomingEvents.length === 0) ? (
                    <p className="text-xs text-gray-400">No events in the next 7 days.</p>
                ) : (
                    <div className="space-y-2">
                        {upcomingEvents.map(evt => (
                            <Link key={evt.id} href="/calendar" className="flex items-start gap-2 p-2 rounded-xl hover:bg-gray-50">
                                <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: evt.color || '#3B82F6' }} />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{evt.title}</p>
                                    <p className="text-xs text-gray-500">
                                        {evt.all_day ? 'All day' : (
                                            new Date(evt.start).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
                                            ' · ' + new Date(evt.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                        )}
                                        {evt.creator && <span> · {evt.creator}</span>}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
