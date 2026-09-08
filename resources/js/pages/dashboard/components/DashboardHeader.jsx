import { Bell, CloudSun, Clock, LogOut, User } from 'lucide-react';
import { Link, router } from '@inertiajs/react';

const greetings = ['Good Morning', 'Good Afternoon', 'Good Evening'];

function getGreeting() {
    const h = new Date().getHours();
    return h < 12 ? greetings[0] : h < 17 ? greetings[1] : greetings[2];
}

function getShift() {
    const h = new Date().getHours();
    if (h >= 6 && h < 14) return 'Morning Shift';
    if (h >= 14 && h < 22) return 'Afternoon Shift';
    return 'Night Shift';
}

function formatDate() {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function DashboardHeader({ auth, notification_count, weather }) {
    const user = auth?.user;
    const name = user?.name ?? 'User';
    const temp = weather?.temp ?? '--';
    const condition = weather?.condition ?? '';

    const handleLogout = (e) => {
        e.preventDefault();
        router.post('/logout');
    };

    return (
        <div className="sticky top-0 z-20 bg-white rounded-2xl shadow-sm p-3 border border-brand-50">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <img src="/images/logo.png" alt="Engineering Buddy" className="h-10 md:h-28 w-auto shrink-0" />
                    <div className="min-w-0">
                        <h1 className="text-sm md:text-base font-bold text-gray-900 truncate leading-tight">
                            {getGreeting()}, {name.split(' ')[0]}
                        </h1>
                        <p className="text-[10px] text-brand-600 font-medium leading-tight">Holiday Inn Cikarang</p>
                        <div className="flex flex-wrap items-center gap-x-2 text-[8px] md:text-[9px] text-gray-400 leading-tight mt-0.5">
                            <span className="truncate max-w-[120px] md:max-w-none">{formatDate()}</span>
                            <span className="flex items-center gap-0.5 shrink-0"><Clock size={8} />{getShift()}</span>
                            <span className="flex items-center gap-0.5 shrink-0"><CloudSun size={8} />{temp}°C {condition}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button onClick={handleLogout} className="p-2 rounded-2xl hover:bg-brand-50 transition-colors" title="Logout">
                        <LogOut size={18} className="text-gray-400" />
                    </button>
                    <Link href="/notifications" className="relative p-2 rounded-2xl hover:bg-brand-50 transition-colors">
                        <Bell size={18} className="text-gray-400" />
                        {notification_count > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-accent-400 rounded-full text-[9px] text-white font-bold">
                                {notification_count > 99 ? '99+' : notification_count}
                            </span>
                        )}
                    </Link>
                    <Link href="/profile" className="shrink-0">
                        {user?.photo ? (
                            <img src={`/storage/${user.photo}`} alt={name} className="w-9 h-9 rounded-full object-cover border-2 border-brand-100" />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-brand-400 flex items-center justify-center text-white text-xs font-bold">
                                {name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
                            </div>
                        )}
                    </Link>
                </div>
            </div>
        </div>
    );
}
