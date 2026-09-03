# PANTAU — Portal Antar Unit untuk Monitoring Terpadu

Lihat `CLAUDE.md` untuk konteks lengkap. Ringkasan setup di bawah ini.

## 1. Buat project Supabase (gratis)

1. Buka https://supabase.com, buat project baru (region Singapore paling dekat).
2. Buka **Project Settings → API**, salin `Project URL` (cth. `https://xxxx.supabase.co` — **bukan** URL contoh curl yang ada `/rest/v1` di belakangnya) dan `service_role` key (bukan `anon` key).
3. Buka **SQL Editor**, jalankan isi file `supabase/migrations/0001_init.sql`, lalu `0002_categories.sql`, lalu `0003_project_closed.sql` — urutannya penting, tiap file mengubah tabel yang dibuat file sebelumnya.

## 2. Konfigurasi environment

```bash
cp .env.local.example .env.local
```

Isi `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — dari langkah 1.
- `SESSION_SECRET` — jalankan `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- `ADMIN_CODE` — kode login Anda sendiri sebagai admin. Bebas, pilih yang tidak mudah ditebak.

## 3. Install & isi data awal

```bash
npm install
npm run seed     # membaca sample_data.xlsx, mengisi teams/projects/checklist
npm run dev       # buka http://localhost:3000
```

Login dengan `ADMIN_CODE` Anda → masuk ke Dashboard Admin → buka **Kelola Kode Akses** →
buat satu kode login per tim (GPAN1, GPAN2, KPAP). Kode hanya ditampilkan sekali saat dibuat,
jadi catat dan bagikan langsung ke tim terkait.

## 4. Deploy (Vercel, gratis)

1. Push repo ini ke GitHub.
2. Import ke Vercel, set environment variables yang sama seperti `.env.local` (Production + Preview).
3. Deploy. Setiap push ke `main` akan auto-deploy.

`.github/workflows/keep-alive.yml` sudah ada di repo ini — ia mem-ping `/api/health` tiap 3 hari
supaya project Supabase gratis tidak "tidur" karena tidak ada trafik (lihat `CLAUDE.md` §2). Agar
jalan, tambahkan repository secret `APP_URL` (Settings → Secrets and variables → Actions) berisi
URL production Vercel Anda, mis. `https://pantau.vercel.app`.

## Mengubah data proyek / tim / checklist

Buka **Kelola Proyek & Tim** (menu admin) untuk: menambah tim, menambah proyek (pilih tim +
kategori + nama + target), menambah kategori baru (cukup nama, kode & warna dibuat otomatis),
dan menyusun checklist deliverable tiap proyek (tambah/hapus tahap & item). Menghapus proyek juga
lewat sini — akan menghapus checklist dan riwayat update mingguannya sekaligus, jadi ada konfirmasi
dulu.

Yang **tidak** ada di layar ini: mengganti nama/kategori proyek yang sudah dibuat, atau mengubah
urutan checklist. Untuk itu, edit langsung lewat **Table Editor** di Supabase Studio (seperti
spreadsheet, tidak perlu query SQL). Lihat `CLAUDE.md` §6 untuk detail.
