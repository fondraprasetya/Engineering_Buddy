import { createContext, useContext, useEffect, useState } from 'react';

const STRINGS = {
    common: {
        save: ['Save', 'Simpan'],
        saving: ['Saving...', 'Menyimpan...'],
        create: ['Create', 'Buat'],
        creating: ['Creating...', 'Membuat...'],
        edit: ['Edit', 'Ubah'],
        delete: ['Delete', 'Hapus'],
        remove: ['Remove', 'Hapus'],
        cancel: ['Cancel', 'Batal'],
        close: ['Close', 'Tutup'],
        search: ['Search...', 'Cari...'],
        loading: ['Loading...', 'Memuat...'],
        no_data: ['No data found.', 'Tidak ada data.'],
        actions: ['Actions', 'Aksi'],
        status: ['Status', 'Status'],
        date: ['Date', 'Tanggal'],
        description: ['Description', 'Deskripsi'],
        name: ['Name', 'Nama'],
        back: ['Back', 'Kembali'],
        update: ['Update', 'Perbarui'],
        confirm_delete: ['Are you sure?', 'Apakah Anda yakin?'],
        optional: ['optional', 'opsional'],
        all: ['All', 'Semua'],
        from: ['From', 'Dari'],
        to: ['To', 'Sampai'],
    },
    st: {
        draft: ['Draft', 'Draft'],
        pending_dept_head: ['Pending Dept Head', 'Menunggu Dept Head'],
        pending_chief_engineer: ['Pending Chief Engineer', 'Menunggu Chief Engineer'],
        rejected: ['Rejected', 'Ditolak'],
        approved: ['Approved', 'Disetujui'],
        assigned: ['Assigned', 'Ditugaskan'],
        in_progress: ['In Progress', 'Dikerjakan'],
        pending_check: ['Pending Check', 'Menunggu Cek'],
        completed: ['Completed', 'Selesai'],
        pending_close: ['Pending Close', 'Menunggu Tutup'],
        closed: ['Closed', 'Ditutup'],
    },
    pr: {
        low: ['Low', 'Rendah'],
        medium: ['Medium', 'Sedang'],
        high: ['High', 'Tinggi'],
        urgent: ['Urgent', 'Mendesak'],
    },
    wo: {
        title: ['Work Orders', 'Work Order'],
        new: ['New Work Order', 'Buat Work Order'],
        all_statuses: ['All Statuses', 'Semua Status'],
        all_priorities: ['All Priorities', 'Semua Prioritas'],
        filter: ['Filter', 'Saring'],
        empty: ['No work orders found.', 'Tidak ada work order.'],
        f_priority: ['Priority', 'Prioritas'],
    },
    roster: {
        title: ['Monthly Roster', 'Roster Bulanan'],
        approve_month: ['Approve Month', 'Setujui Sebulan'],
        unapprove_month: ['Unapprove Month', 'Batalkan Sebulan'],
        prev: ['Prev', 'Sblm'],
        next: ['Next', 'Brkt'],
        name: ['Name', 'Nama'],
        legend: ['Legend', 'Legenda'],
        approved: ['Approved', 'Disetujui'],
        view_shift: ['View Shift', 'Lihat Shift'],
        edit_shift: ['Edit Shift', 'Ubah Shift'],
        assign_shift: ['Assign Shift', 'Tugaskan Shift'],
        shift: ['Shift', 'Shift'],
        morning: ['Morning', 'Pagi'],
        afternoon: ['Afternoon', 'Siang'],
        night: ['Night', 'Malam'],
        off: ['Off', 'Libur'],
        leave: ['Leave', 'Cuti'],
        extra_off: ['Extra Off', 'Libur Ekstra'],
        time_blocks: ['Time Blocks', 'Blok Waktu'],
        add_block: ['+ Add Block', '+ Tambah Blok'],
        apply_through: ['Apply through (optional date range)', 'Berlaku sampai (rentang tanggal opsional)'],
        applies: ['Applies', 'Berlaku'],
        range_same: ['(same shift & hours every day).', '(shift & jam sama setiap hari).'],
        approved_locked: ['This entry has been approved by the Chief Engineer and cannot be edited.', 'Entri ini telah disetujui Chief Engineer dan tidak bisa diubah.'],
        approved_editable: ['This entry is approved. You can edit or unapprove it.', 'Entri ini disetujui. Anda bisa mengubah atau membatalkannya.'],
        remove: ['Remove', 'Hapus'],
        save: ['Save', 'Simpan'],
        approve: ['Approve', 'Setujui'],
        unapprove: ['Unapprove', 'Batalkan'],
        cannot_remove_last: ['Cannot remove the last', 'Tidak bisa menghapus yang terakhir'],
        failed_save: ['Failed to save.', 'Gagal menyimpan.'],
        failed_remove: ['Failed to remove.', 'Gagal menghapus.'],
        failed_approve: ['Failed to approve.', 'Gagal menyetujui.'],
        failed_unapprove: ['Failed to unapprove.', 'Gagal membatalkan.'],
        network_error: ['Network error.', 'Kesalahan jaringan.'],
        no_users: ['No users found for this role.', 'Tidak ada pengguna untuk peran ini.'],
        click_hint: ['Click a cell to edit.', 'Klik sel untuk mengubah.'],
        no_coverage: ['coverage', 'tanpa personel'],
        all: ['All', 'Semua'],
        role_technician: ['Technician', 'Teknisi'],
        role_eng_admin: ['Eng Admin', 'Admin Eng'],
        role_chief: ['Chief Eng', 'Chief Eng'],
    },
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
