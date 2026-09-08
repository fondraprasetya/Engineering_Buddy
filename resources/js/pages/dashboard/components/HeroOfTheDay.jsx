import { Users } from 'lucide-react';

export default function HeroOfTheDay({ heroOfTheDay }) {
    const data = heroOfTheDay ?? {
        shift: 'Morning Shift',
        supervisor: 'Budi Hartono',
        members: ['Ahmad Fauzi', 'Dwi Prasetyo', 'Rina Wijaya', 'Sigit Purnomo'],
        mission: 'Preventive maintenance for HVAC system & weekly generator inspection',
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
                <Users size={18} className="text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Hero of the Day</h3>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="text-xs text-gray-500">Today's Shift</p>
                        <p className="text-sm font-semibold text-gray-900">{data.shift}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500">Supervisor</p>
                        <p className="text-sm font-semibold text-brand-700">{data.supervisor}</p>
                    </div>
                </div>
                <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Team Members</p>
                    <div className="flex flex-wrap gap-1.5">
                        {data.members.map(m => (
                            <span key={m} className="text-[10px] bg-white rounded-full px-2.5 py-1 text-gray-700 font-medium shadow-sm">{m}</span>
                        ))}
                    </div>
                </div>
                <div>
                    <p className="text-xs text-gray-500 mb-1">Today's Mission</p>
                    <p className="text-xs text-gray-700 bg-white rounded-xl p-2.5 leading-relaxed">{data.mission}</p>
                </div>
            </div>
        </div>
    );
}
