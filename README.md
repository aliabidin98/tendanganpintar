# ⚽ AR Tendangan Pintar (EduKick AR)

Game AR interaktif edukasi sepak bola dengan AI **MediaPipe Pose Tracking** untuk menjawab kuis secara kinestetik real-time di depan kamera.

---

## 🚀 Panduan Langsung Deploy ke GitHub Pages (via Folder `/docs`)

Kode build produksi sudah disiapkan secara otomatis di dalam folder **/docs** (dan juga disinkronkan ke **/doc**) lengkap dengan konfigurasi *relative path* (`base: './'`) serta file `.nojekyll` agar dapat langsung aktif di GitHub Pages tanpa konfigurasi tambahan.

### Langkah-langkah Deploy:

#### 1. Push Seluruh Kode ke Repository GitHub Anda
Buka terminal di folder proyek ini dan jalankan:
```bash
git init
git add .
git commit -m "feat: Siap deploy AR Tendangan Pintar ke GitHub Pages"
git branch -M main
git remote add origin https://github.com/<USERNAME-ANDA>/<NAMA-REPO-ANDA>.git
git push -u origin main
```

#### 2. Aktifkan GitHub Pages di Repository GitHub
1. Buka repository Anda di browser: `https://github.com/<USERNAME-ANDA>/<NAMA-REPO-ANDA>`
2. Klik tab **Settings** (Pengaturan) di bagian atas menu repository.
3. Di panel menu sebelah kiri, klik menu **Pages**.
4. Di bagian **Build and deployment**:
   - **Source**: Pilih **Deploy from a branch**
   - **Branch**: Pilih `main` (atau `master`)
   - **Folder**: Pilih **/docs**
   - Klik tombol **Save**.
5. Tunggu sekitar 1–2 menit hingga muncul notifikasi hijau dengan tautan website Anda:
   👉 **`https://<USERNAME-ANDA>.github.io/<NAMA-REPO-ANDA>/`**

> 💡 **Penting mengenai Akses Kamera:**
> Browser (Chrome, Safari, Edge, Firefox) mewajibkan protokol **HTTPS** agar kamera web/HP dapat diakses. GitHub Pages secara otomatis menyediakan HTTPS gratis, sehingga deteksi gerakan kaki MediaPipe akan langsung berfungsi lancar!

---

## 🛠️ Perintah Pengembangan & Build Lokal

Jika di masa mendatang Anda ingin memperbarui atau mengubah soal/kode:

```bash
# 1. Jalankan development server lokal
npm run dev

# 2. Build ulang untuk produksi (otomatis memperbarui /docs dan /doc)
npm run build

# 3. Preview hasil build produksi
npm run preview
```

---

## 🌟 Fitur Utama Game

1. **AI Kinesthetic Pose Tracking**:
   - Deteksi pergerakan kaki real-time (kaki kiri & kanan) menggunakan MediaPipe Pose.
   - Deteksi tendangan virtual pada opsi bola pilihan jawaban.
2. **Karakter Kiper 3D Interaktif**:
   - Pilihan karakter 3D: **Singa Juara 3D**, **Hero Champion 3D**, dan **Cyber Bot 3D**.
   - Kiper bergerak dinamis dan akan melompat menangkap bola jika jawaban salah.
3. **Mode 1 Pemain & 2 Pemain (Split-Screen)**:
   - Mode 1 Pemain: Lapangan penuh dengan animasi gol & selebrasi.
   - Mode 2 Pemain: Layar dibagi dua (Pemain 1 di kiri, Pemain 2 di kanan) dengan soal acak yang berbeda untuk masing-masing pemain.
4. **Menu Pengaturan & Bank Soal Terpadu**:
   - Unduh template soal format CSV & JSON.
   - Impor soal kuis baru secara instan.
   - 5 soal bawaan standar siap pakai.
   - Pengaturan durasi (30s, 60s, 90s) dan tingkat sensitivitas tendangan.
5. **Fallback Kontrol Fleksibel**:
   - Selain sensor kaki kamera, game dapat dimainkan via sentuhan layar (Touch/Click) dan tombol keyboard (P1: `A`/`D` atau `Q`/`W`, P2: `O`/`P` atau `K`/`L`).

---

## 👨‍💻 Pengembang

- **M. Nur Ali Abidin, S.Pd.**
- **Instagram**: [@aliabidin988](https://instagram.com/aliabidin988)
- **TikTok**: [@aliabidin98](https://tiktok.com/@aliabidin98)
