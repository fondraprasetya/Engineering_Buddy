import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { useLang } from '../../i18n';

export default function Index({ auth, users }) {
    const { t } = useLang();
    const [search, setSearch] = useState('');

    const handleSearch = (e) => {
        e.preventDefault();
        router.get('/users', { search }, { preserveState: true });
    };

    const roleLabel = (name) => {
        const map = { 'super-admin': t('rl.super-admin'), 'chief-engineer': t('rl.chief-engineer'), 'eng-admin': t('rl.eng-admin'), 'dept-head': t('rl.dept-head'), technician: t('rl.technician'), employee: t('rl.employee'), gm: t('rl.gm') };
        return map[name] ?? name?.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title={t('usr.title')} />
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">{t('usr.title')}</h2>
                    <Link href="/users/create" className="bg-brand-400 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">{t('usr.new')}</Link>
                </div>

                <form onSubmit={handleSearch} className="flex gap-2">
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t('usr.search_ph')}
                        className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400"
                    />
                    <button type="submit" className="bg-gray-100 text-gray-700 rounded-xl px-4 py-2 text-sm hover:bg-brand-50">{t('usr.search')}</button>
                </form>

                {users.data.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">{t('usr.empty')}</div>
                ) : (
                    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.04 } } }} className="space-y-3">
                        {users.data.map((user) => (
                            <motion.div key={user.id} variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}>
                                <div className="bg-white rounded-2xl shadow-sm p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-gray-900">{user.name}</h3>
                                            <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {user.department?.name ?? t('usr.no_dept')} · {user.roles?.map(r => roleLabel(r.name)).join(', ')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {user.is_active ? t('usr.active') : t('usr.inactive')}
                                            </span>
                                            <Link href={`/users/${user.id}/edit`} className="text-sm text-brand-600 hover:text-brand-700">{t('usr.edit')}</Link>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {users.meta && users.meta.last_page > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                        {users.meta.links?.filter(l => l.url).map((link, i) => (
                            <Link
                                key={i}
                                href={link.url}
                                className={`px-3 py-1 text-sm rounded-xl ${link.active ? 'bg-brand-400 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
