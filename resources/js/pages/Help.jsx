import { Head } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../layouts/AuthenticatedLayout';
import { useLang } from '../i18n';

const SECTIONS_EN = [
    { id: 'start', title: 'Getting Started', body: [
        'Log in with the email and password created for you. If your company just signed up, the owner account was created during registration.',
        'Your bottom navigation bar shows only the menus your role can use. Roles: employee, technician, dept-head, chief-engineer, eng-admin, super-admin, and GM.',
        'Your data belongs to your property (tenant) — you only ever see your own property’s records.',
    ]},
    { id: 'dashboard', title: 'Dashboard (Home)', body: [
        'The Home screen is your daily briefing: work-order counts by status, overdue maintenance, pending approvals, utility trends, and budget vs actuals.',
        'Numbers are live — tap a card to jump to the underlying list.',
    ]},
    { id: 'workorders', title: 'Work Orders', body: [
        'Create: Work Orders → New. Describe the problem, set priority and location, attach a photo if helpful.',
        'Lifecycle: draft → pending approval (dept-head, then chief-engineer) → approved → assigned → in progress → pending check → closed.',
        'Track progress from the work-order detail page: notes, photos, status changes, and cost entries.',
        'If you approve requests, they appear under Approvals with Approve / Reject actions.',
    ]},
    { id: 'calendar', title: 'Calendar & Daily Statistics', body: [
        'The calendar shows events and the green Daily Statistics entries (occupancy, guest, restaurant, and MICE numbers per day).',
        'Add a statistic: open a date → choose “Statistic” → enter the MTD numbers. The app computes the daily values automatically from the previous day.',
        'Events carry venue, type (half/full day), and optional file attachments.',
    ]},
    { id: 'maintenance', title: 'Preventive Maintenance', body: [
        'Schedules define recurring PM tasks per asset (daily, weekly, monthly). The system rolls them over automatically each night.',
        'Overdue schedules are flagged on the dashboard — clear them by completing the generated work orders.',
    ]},
    { id: 'mytasks', title: 'My Tasks (Technicians)', body: [
        'My Tasks lists every work order assigned to you. Open one to update status, add notes and photos, and fill the checklist.',
        'Logs (daily-logs) records what you did each day for handover and reporting.',
    ]},
    { id: 'assets', title: 'Assets, Locations & Checklists', body: [
        'Assets is the equipment registry with history and cost. Locations holds buildings, areas (e.g. AR-001), and rooms used as venues.',
        'Checklist templates define the inspection steps technicians fill on each job — create once, reuse everywhere.',
    ]},
    { id: 'roster', title: 'Roster', body: [
        'Roster shows who is on shift each day. Managers publish the roster; staff check their upcoming shifts here or via the Telegram bot.',
    ]},
    { id: 'store', title: 'Store & Inventory', body: [
        'Receiving records incoming goods; Requests take stock out for jobs; Adjustments correct counts.',
        'Low-stock items surface automatically so the store never runs dry mid-job.',
    ]},
    { id: 'utilities', title: 'Utilities', body: [
        'Record daily electricity, water, and gas meter stands. Cost is computed from your Rates table.',
        'Import many days at once with a CSV file. Variance reports show unusual consumption spikes.',
    ]},
    { id: 'budgets', title: 'Budgets & Expenses', body: [
        'Monthly Budgets set the spending plan; Expenses record actuals against post-accounts.',
        'The dashboard compares budget vs actual across energy, projects, and maintenance.',
    ]},
    { id: 'projects', title: 'Projects', body: [
        'Projects track bigger works with milestones, budget items, and actual costs.',
        'Update milestone status as phases complete; attach site photos for evidence.',
    ]},
    { id: 'telegram', title: 'Telegram Bot', body: [
        'Link: open Profile to get your 6-letter code, then send /start <code> to the bot.',
        'Field essentials: /workorder (new ticket), /inputds (daily statistics), /inputec (utility reading), /myroster (your shifts), /pending (approvals), /event (upcoming events).',
        'Send /cancel any time to quit what you are doing; /cmdlist shows everything.',
    ]},
    { id: 'billing', title: 'Billing & Subscription', body: [
        'Billing shows your plan and status. New properties start with a 14-day free trial.',
        'Before the trial ends you get a reminder; after expiry the app asks you to subscribe. Pay with QRIS, transfer, cards, or e-wallet via Midtrans — access activates automatically on payment.',
        'Plans: Starter Rp350rb, Professional Rp850rb, Enterprise Rp2jt per month.',
    ]},
    { id: 'profile', title: 'Profile & Notifications', body: [
        'Profile holds your name, phone, photo, and the Telegram link code.',
        'The bell shows system notifications (approvals, reminders, billing). Linked Telegram users get them as chat messages too.',
    ]},
];

const SECTIONS_ID = [
    { id: 'start', title: 'Mulai', body: [
        'Masuk dengan email dan password yang dibuat untuk Anda. Jika perusahaan baru mendaftar, akun owner dibuat saat registrasi.',
        'Navigasi bawah hanya menampilkan menu sesuai peran Anda. Peran: employee, technician, dept-head, chief-engineer, eng-admin, super-admin, dan GM.',
        'Data milik properti (tenant) Anda — Anda hanya melihat data properti sendiri.',
    ]},
    { id: 'dashboard', title: 'Dashboard (Beranda)', body: [
        'Layar Beranda adalah briefing harian: jumlah work order per status, maintenance terlambat, persetujuan menunggu, tren utilitas, dan anggaran vs aktual.',
        'Angka bersifat live — ketuk kartu untuk melompat ke daftarnya.',
    ]},
    { id: 'workorders', title: 'Work Order', body: [
        'Buat: Work Order → Baru. Jelaskan masalah, atur prioritas dan lokasi, lampirkan foto bila perlu.',
        'Alur: draft → persetujuan (dept-head, lalu chief-engineer) → disetujui → ditugaskan → dikerjakan → pending check → ditutup.',
        'Pantau progres dari halaman detail: catatan, foto, perubahan status, dan biaya.',
        'Jika Anda penyetuju, permintaan muncul di Approvals dengan aksi Setuju / Tolak.',
    ]},
    { id: 'calendar', title: 'Kalender & Statistik Harian', body: [
        'Kalender menampilkan event dan entri hijau Statistik Harian (okupansi, tamu, restoran, dan MICE per hari).',
        'Tambah statistik: buka tanggal → pilih “Statistic” → isi angka MTD. Aplikasi menghitung nilai harian otomatis dari hari sebelumnya.',
        'Event memiliki venue, tipe (setengah/sehari penuh), dan lampiran file opsional.',
    ]},
    { id: 'maintenance', title: 'Preventive Maintenance', body: [
        'Jadwal mendefinisikan tugas PM rutin per aset (harian, mingguan, bulanan). Sistem menggulirkannya otomatis setiap malam.',
        'Jadwal terlambat ditandai di dashboard — selesaikan work order yang dibuat agar hilang.',
    ]},
    { id: 'mytasks', title: 'Tugas Saya (Teknisi)', body: [
        'Tugas Saya berisi semua work order yang ditugaskan ke Anda. Buka untuk update status, tambah catatan dan foto, serta isi checklist.',
        'Log harian mencatat pekerjaan tiap hari untuk serah terima dan laporan.',
    ]},
    { id: 'assets', title: 'Aset, Lokasi & Checklist', body: [
        'Aset adalah registry peralatan beserta riwayat dan biaya. Lokasi berisi gedung, area (cth. AR-001), dan ruangan untuk venue.',
        'Template checklist mendefinisikan langkah inspeksi yang diisi teknisi tiap pekerjaan — buat sekali, pakai berkali-kali.',
    ]},
    { id: 'roster', title: 'Roster', body: [
        'Roster menunjukkan siapa shift tiap hari. Manajer mempublish roster; staf cek jadwal di sini atau via bot Telegram.',
    ]},
    { id: 'store', title: 'Gudang & Inventaris', body: [
        'Receiving mencatat barang masuk; Request mengeluarkan stok untuk pekerjaan; Adjustment mengoreksi jumlah.',
        'Stok menipis muncul otomatis agar gudang tidak kehabisan di tengah pekerjaan.',
    ]},
    { id: 'utilities', title: 'Utilitas', body: [
        'Catat angka meter listrik, air, dan gas harian. Biaya dihitung dari tabel Tarif Anda.',
        'Impor banyak hari sekaligus dengan file CSV. Laporan varians menunjukkan lonjakan pemakaian tak wajar.',
    ]},
    { id: 'budgets', title: 'Anggaran & Pengeluaran', body: [
        'Anggaran Bulanan menetapkan rencana belanja; Pengeluaran mencatat aktual terhadap post-account.',
        'Dashboard membandingkan anggaran vs aktual untuk energi, proyek, dan maintenance.',
    ]},
    { id: 'projects', title: 'Proyek', body: [
        'Proyek melacak pekerjaan besar dengan milestone, item anggaran, dan biaya aktual.',
        'Update status milestone tiap tahap selesai; lampirkan foto lapangan sebagai bukti.',
    ]},
    { id: 'telegram', title: 'Bot Telegram', body: [
        'Hubungkan: buka Profil untuk kode 6 huruf, lalu kirim /start <kode> ke bot.',
        'Perintah lapangan: /workorder (tiket baru), /inputds (statistik harian), /inputec (catat utilitas), /myroster (shift Anda), /pending (persetujuan), /event (event mendatang).',
        'Kirim /cancel kapan saja untuk batal; /cmdlist menampilkan semuanya.',
    ]},
    { id: 'billing', title: 'Penagihan & Langganan', body: [
        'Billing menampilkan paket dan status. Properti baru mendapat trial gratis 14 hari.',
        'Sebelum trial berakhir ada pengingat; setelah kedaluwarsa aplikasi meminta berlangganan. Bayar via QRIS, transfer, kartu, atau e-wallet Midtrans — akses aktif otomatis setelah bayar.',
        'Paket: Starter Rp350rb, Professional Rp850rb, Enterprise Rp2jt per bulan.',
    ]},
    { id: 'profile', title: 'Profil & Notifikasi', body: [
        'Profil berisi nama, telepon, foto, dan kode hubung Telegram.',
        'Bel menampilkan notifikasi sistem (persetujuan, pengingat, billing). Pengguna Telegram terhubung juga menerimanya sebagai pesan chat.',
    ]},
];

export default function Help({ auth }) {
    const { lang, t } = useLang();
    const [query, setQuery] = useState('');
    const SECTIONS = lang === 'id' ? SECTIONS_ID : SECTIONS_EN;
    const searchPh = lang === 'id' ? 'Cari panduan…' : 'Search the manual…';
    const noMatch = lang === 'id' ? 'Tidak ada bagian yang cocok.' : 'No sections match.';
    const headTitle = lang === 'id' ? 'Bantuan & Panduan Pengguna' : 'Help & User Manual';
    const headSub = lang === 'id' ? 'Semua yang Anda butuhkan untuk menjalankan Engineering Buddy, dalam satu tempat.' : 'Everything you need to run Engineering Buddy, in one place.';
    const q = query.trim().toLowerCase();
    const shown = q
        ? SECTIONS.filter((s) => s.title.toLowerCase().includes(q) || s.body.some((b) => b.toLowerCase().includes(q)))
        : SECTIONS;

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title={headTitle} />
            <div className="max-w-3xl mx-auto">
                <h1 className="text-2xl font-bold text-brand-800 mb-1">{headTitle}</h1>
                <p className="text-sm text-gray-500 mb-4">{headSub}</p>
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPh}
                    className="w-full mb-4 px-4 py-2 rounded-xl border border-brand-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <div className="flex flex-wrap gap-2 mb-6">
                    {SECTIONS.map((s) => (
                        <a key={s.id} href={`#${s.id}`} className="text-xs px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 hover:bg-brand-100">
                            {s.title}
                        </a>
                    ))}
                </div>
                {shown.length === 0 && <p className="text-gray-500">{noMatch} “{query}”.</p>}
                {shown.map((s) => (
                    <section key={s.id} id={s.id} className="bg-white rounded-2xl shadow-sm border border-brand-50 p-5 mb-4 scroll-mt-4">
                        <h2 className="text-lg font-semibold text-brand-800 mb-2">{s.title}</h2>
                        <ul className="space-y-1.5">
                            {s.body.map((b, i) => (
                                <li key={i} className="text-sm text-gray-700 leading-relaxed">• {b}</li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </AuthenticatedLayout>
    );
}
