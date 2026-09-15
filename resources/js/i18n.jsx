import { createContext, useContext, useEffect, useState } from 'react';

const STRINGS = {
    nav: {
        home: ['Home', 'Beranda'],
        calendar: ['Calendar', 'Kalender'],
        work_orders: ['Work Orders', 'Work Order'],
        profile: ['Profile', 'Profil'],
        approvals: ['Approvals', 'Persetujuan'],
        reports: ['Reports', 'Laporan'],
        my_tasks: ['My Tasks', 'Tugas Saya'],
        store: ['Store', 'Gudang'],
        logs: ['Logs', 'Log Harian'],
        master_data: ['Master Data', 'Data Master'],
        assets: ['Assets', 'Aset'],
        rates: ['Rates', 'Tarif'],
        budgets: ['Budgets', 'Anggaran'],
        post_acc: ['Post Acc.', 'Akun Posting'],
        checklists: ['Checklists', 'Checklist'],
        locations: ['Locations', 'Lokasi'],
        users: ['Users', 'Pengguna'],
        roster: ['Roster', 'Roster'],
        schedules: ['Schedules', 'Jadwal'],
        expenses: ['Expenses', 'Pengeluaran'],
        utilities: ['Utilities', 'Utilitas'],
        projects: ['Projects', 'Proyek'],
        tools: ['Tools', 'Peralatan'],
    },
    header: {
        morning: ['Good Morning', 'Selamat Pagi'],
        afternoon: ['Good Afternoon', 'Selamat Siang'],
        evening: ['Good Evening', 'Selamat Malam'],
        morning_shift: ['Morning Shift', 'Shift Pagi'],
        afternoon_shift: ['Afternoon Shift', 'Shift Siang'],
        night_shift: ['Night Shift', 'Shift Malam'],
        logout: ['Logout', 'Keluar'],
        help: ['Help & User Manual', 'Bantuan & Panduan'],
        notifications: ['Notifications', 'Notifikasi'],
    },
    tools: {
        title: ['Engineering Tools', 'Peralatan Engineering'],
        subtitle: ['Field calculators — work fully offline once loaded.', 'Kalkulator lapangan — bekerja offline setelah dimuat.'],
        hvac: ['HVAC — BTU / PK / Watt', 'HVAC — BTU / PK / Watt'],
        capacity: ['Capacity', 'Kapasitas'],
        capacity_ph: ['e.g. 9000', 'cth. 9000'],
        room_to_ac: ['Room size → recommended AC', 'Ukuran ruangan → rekomendasi AC'],
        length_m: ['Length (m)', 'Panjang (m)'],
        width_m: ['Width (m)', 'Lebar (m)'],
        bedroom: ['Bedroom', 'Kamar tidur'],
        living: ['Living / Office', 'Ruang tamu / Kantor'],
        meeting: ['Meeting room', 'Ruang meeting'],
        kitchen: ['Kitchen / Heat load', 'Dapur / Beban panas'],
        need: ['Need', 'Kebutuhan'],
        recommended: ['Recommended', 'Rekomendasi'],
        electrical: ['Electrical — Power & Current', 'Elektrikal — Daya & Arus'],
        power: ['Power', 'Daya'],
        power_ph: ['e.g. 5.5', 'cth. 5.5'],
        load_to_cable: ['Load → current & cable', 'Beban → arus & kabel'],
        load_w: ['Load (watt)', 'Beban (watt)'],
        voltage: ['Voltage (V)', 'Tegangan (V)'],
        phase1: ['1 phase', '1 fasa'],
        phase3: ['3 phase', '3 fasa'],
        current: ['Current', 'Arus'],
        min_cable: ['Min. cable (Cu)', 'Min. kabel (Cu)'],
        lighting: ['Lighting — Lamps Needed', 'Pencahayaan — Jumlah Lampu'],
        corridor: ['Corridor (100 lux)', 'Koridor (100 lux)'],
        bedroom_lux: ['Bedroom (150 lux)', 'Kamar (150 lux)'],
        kitchen_lux: ['Kitchen (200 lux)', 'Dapur (200 lux)'],
        meeting_lux: ['Meeting (300 lux)', 'Meeting (300 lux)'],
        office_lux: ['Office (350 lux)', 'Kantor (350 lux)'],
        light_needed: ['Light needed', 'Cahaya dibutuhkan'],
        lamps: ['18W LED lamps (≈1600 lm)', 'Lampu LED 18W (≈1600 lm)'],
        pcs: ['pcs', 'buah'],
        pressure_temp: ['Pressure & Temperature', 'Tekanan & Suhu'],
        pressure_bar: ['Pressure (bar)', 'Tekanan (bar)'],
        pressure_ph: ['e.g. 6', 'cth. 6'],
        temp_c: ['Temperature (°C)', 'Suhu (°C)'],
        temp_ph: ['e.g. 25', 'cth. 25'],
        },
        dash: {
        welcome_employee: ['Welcome! Report an issue or request maintenance work.', 'Selamat datang! Laporkan masalah atau minta pekerjaan maintenance.'],
        welcome_dept_head: ['Approvals await your review.', 'Ada persetujuan menunggu review Anda.'],
        welcome_technician: ['Tasks assigned to you.', 'Tugas yang diberikan kepada Anda.'],
        welcome_eng_admin: ['Manage assets, schedules, and templates.', 'Kelola aset, jadwal, dan template.'],
        welcome_chief: ['Work orders await your final approval.', 'Work order menunggu persetujuan final Anda.'],
        welcome_gm: ['Org-wide reports and project overview.', 'Laporan organisasi dan ringkasan proyek.'],
        overdue: ['overdue maintenance schedule', 'jadwal maintenance terlambat'],
        overdue_plural: ['overdue maintenance schedules', 'jadwal maintenance terlambat'],
        view_schedules: ['View schedules', 'Lihat jadwal'],
        owner_report: ['Download owner report (this month, PDF)', 'Unduh laporan owner (bulan ini, PDF)'],
        trial_title: ['Free trial', 'Masa trial gratis'],
        trial_days_left: ['days left', 'hari tersisa'],
        trial_day_left: ['day left', 'hari tersisa'],
        trial_body: ['Subscribe to keep your facility running without interruption.', 'Berlangganan agar fasilitas Anda tetap berjalan tanpa gangguan.'],
        trial_ends: ['Your trial ends on', 'Trial Anda berakhir pada'],
        view_plans: ['View plans', 'Lihat paket'],
        later: ['Later', 'Nanti'],
    },
};

const LangContext = createContext({ lang: 'en', setLang: () => {}, t: () => '' });

export function LangProvider({ children }) {
    const [lang, setLangState] = useState(() => {
        try {
            return localStorage.getItem('eb-lang') === 'id' ? 'id' : 'en';
        } catch {
            return 'en';
        }
    });

    const setLang = (l) => {
        const v = l === 'id' ? 'id' : 'en';
        setLangState(v);
        try {
            localStorage.setItem('eb-lang', v);
        } catch { /* ignore */ }
    };

    useEffect(() => {
        try {
            document.documentElement.lang = lang === 'id' ? 'id' : 'en';
        } catch { /* ignore */ }
    }, [lang]);

    const t = (path) => {
        const [section, key] = String(path).split('.');
        const entry = STRINGS[section]?.[key];
        if (!entry) return path;
        return lang === 'id' ? entry[1] : entry[0];
    };

    return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
    return useContext(LangContext);
}

export function navKey(name) {
    return String(name).toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '');
}
