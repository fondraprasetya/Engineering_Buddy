import { Trophy, Star } from 'lucide-react';

const medals = ['🥇', '🥈', '🥉'];

function getInitials(name) {
    return (name ?? '').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

const avatarColors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

export default function TechnicianRanking({ topPerformers }) {
    if (!topPerformers?.length) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
                <Trophy size={18} className="text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Top Technicians</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="text-left py-2 pr-3 text-[10px] text-gray-400 font-medium uppercase tracking-wider">Rank</th>
                            <th className="text-left py-2 pr-3 text-[10px] text-gray-400 font-medium uppercase tracking-wider">Technician</th>
                            <th className="text-center py-2 pr-3 text-[10px] text-gray-400 font-medium uppercase tracking-wider">Done</th>
                            <th className="text-center py-2 pr-3 text-[10px] text-gray-400 font-medium uppercase tracking-wider">Rating</th>
                            <th className="text-right py-2 text-[10px] text-gray-400 font-medium uppercase tracking-wider">Efficiency</th>
                        </tr>
                    </thead>
                    <tbody>
                        {topPerformers.map((t, i) => {
                            const rating = t.avg_rating ?? 0;
                            const efficiency = Math.min(Math.round(((t.completed_count ?? 0) / Math.max(...topPerformers.map(x => x.completed_count ?? 0), 1)) * 100), 100);
                            return (
                                <tr key={t.id} className="border-b border-gray-50 last:border-0">
                                    <td className="py-2.5 pr-3 text-center text-sm">
                                        {i < 3
                                            ? <span className="text-base">{medals[i]}</span>
                                            : <span className="text-gray-400 font-mono text-xs">{i + 1}</span>}
                                    </td>
                                    <td className="py-2.5 pr-3">
                                        <div className="flex items-center gap-2">
                                            {t.photo ? (
                                                <img src={`/storage/${t.photo}`} alt={t.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                                            ) : (
                                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: avatarColors[i % 5] }}>
                                                    {getInitials(t.name)}
                                                </div>
                                            )}
                                            <span className="text-sm font-medium text-gray-900 truncate">{t.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-2.5 pr-3 text-center">
                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-50 text-brand-700 font-bold text-xs">{t.completed_count}</span>
                                    </td>
                                    <td className="py-2.5 pr-3">
                                        <div className="flex items-center justify-center gap-1">
                                            <Star size={10} className="text-amber-400 fill-amber-400" />
                                            <span className="text-xs font-semibold text-gray-700">{rating}</span>
                                        </div>
                                    </td>
                                    <td className="py-2.5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${efficiency}%`, backgroundColor: efficiency > 80 ? '#22C55E' : efficiency > 60 ? '#F59E0B' : '#EF4444' }} />
                                            </div>
                                            <span className="text-xs font-medium text-gray-500 w-8 text-right">{efficiency}%</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
