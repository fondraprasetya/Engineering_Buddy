import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ label, value, sparklineData, trend = 0, color = '#2563EB', bg = '#EFF6FF', href }) {
    const Icon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
    const trendColor = trend > 0 ? '#22C55E' : trend < 0 ? '#EF4444' : '#6B7280';

    const Wrapper = href ? 'a' : 'div';
    const props = href ? { href, className: 'block' } : {};

    return (
        <Wrapper {...props}>
            <div className={`rounded-xl p-4 ${href ? 'cursor-pointer hover:scale-[1.02] transition-all duration-150' : ''}`} style={{ backgroundColor: bg }}>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-2xl font-bold mb-2" style={{ color }}>{value}</p>
                {sparklineData?.length > 1 && (
                    <div className="h-8 -mx-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sparklineData}>
                                <defs>
                                    <linearGradient id={`grad-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#grad-${label.replace(/\s/g, '')})`} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
                {trend !== 0 && (
                    <div className="flex items-center gap-1 mt-1">
                        <Icon size={12} style={{ color: trendColor }} />
                        <span className="text-xs" style={{ color: trendColor }}>
                            {trend > 0 ? '+' : ''}{trend}% vs last month
                        </span>
                    </div>
                )}
            </div>
        </Wrapper>
    );
}
