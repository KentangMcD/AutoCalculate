# Helper Simulasi Perhitungan Promosi & Refund (Google Apps Script)

Helper ini dirancang untuk memproses simulasi perhitungan promosi bertingkat (*waterfall promo accounting*) dan partial refund pada Google Spreadsheet dengan menghasilkan **formula Google Sheets aktif** (`=CEILING(...)`, `=ROUNDDOWN(...)`, `=VLOOKUP(...)`, dll.) pada setiap sel hasil kalkulasi agar dapat diaudit dan dianalisa secara transparan.

---

## 📁 Struktur Modul & File Script (OOP)

Proyek ini dibangun secara modular menggunakan prinsip Object-Oriented Programming (OOP) dan dibagi menjadi beberapa service berkas `.gs`:

| Nama File | Deskripsi / Tanggung Jawab |
| :--- | :--- |
| **`Main.gs`** | Entry point untuk custom menu Google Sheets (`Simulasi Promo & Refund`) dan fungsi orkestrasi utama. |
| **`Models.gs`** | Definisi class model data (`Product`, `PromoRule`, `TransactionItem`, `EditOrderRow`). |
| **`DataLoader.gs`** | Membaca dan memvalidasi data dari tab `PLU Master` dan tab `Input`. |
| **`QtyDistributionService.gs`** | Mendistribusikan total stok / Qty Aktual per PLU ke baris transaksi berdasarkan prioritas pemenuhan. |
| **`KartonanService.gs`** | Formula diskon kartonan dan *Net Sales After Karton*. |
| **`BundlingService.gs`** | Formula diskon paket bundling (% benefit atau Rp benefit) dan prorata nilai diskon ke tiap PLU. |
| **`PHGService.gs`** | Formula Produk Hadiah Gratis (pembebasan harga produk hadiah). |
| **`HargaCoretService.gs`** | Formula promo Harga Coret (fixed benefit Rp atau % benefit) dengan batas limitasi. |
| **`UpsellService.gs`** | Formula promo Upsell baik per PLU (`Campur = N`) maupun akumulasi total belanja grup PLU (`Campur = Y`). |
| **`FairPotalService.gs`** | Formula promo Fair Potongan Langsung (% benefit atau Rp benefit) berdasar syarat belanja minimum. |
| **`FairTMHService.gs`** | Formula Fair Tebus Murah. |
| **`FairHadiahService.gs`** | Formula Fair Hadiah Gratis. |
| **`DABService.gs`** | Formula Diskon Alat Bayar (DAB) di level keranjang/fair beserta prorata nilai ke seluruh item. |
| **`PointStampService.gs`** | Formula perolehan poin dan stamp (Base, Fair, Cart). |
| **`InputTemplateBuilder.gs`** | Pembangkit template tab `Input` dan `PLU Master` otomatis lengkap dengan format warna, border, dan sample data. |
| **`ResultSheetBuilder.gs`** | Pembangkit tab result baru (`Result - 1`, `Result - 2`, dst.), penyusun tata letak tabel, injeksi formula, dan styling visual. |

---

## 🚀 Panduan Pemasangan ke Google Spreadsheet

1. Buka spreadsheet Google Anda (misalnya spreadsheet referensi yang telah Anda buat).
2. Pada menu atas Google Sheets, klik menu **Extensions** (Ekstensi) > **Apps Script**.
3. Di editor Apps Script:
   - Buat file script baru untuk setiap file `.gs` di atas (klik tombol **`+`** di sebelah "Files" > pilih **Script**).
   - Beri nama sesuai daftar file (contoh: `Main`, `Models`, `DataLoader`, `QtyDistributionService`, `KartonanService`, `BundlingService`, `PHGService`, `HargaCoretService`, `UpsellService`, `FairPotalService`, `FairTMHService`, `FairHadiahService`, `DABService`, `PointStampService`, `ResultSheetBuilder`).
   - Salin (*copy-paste*) kode dari masing-masing file lokal ke editor Apps Script.
4. Klik tombol **Save** (ikon disket) atau tekan `Ctrl + S`.
5. Muat ulang (*refresh*) halaman Google Spreadsheet Anda di browser.
6. Menu baru bernama **`Simulasi Promo & Refund`** akan otomatis muncul pada bilah menu atas Google Sheets.

---

## 💡 Cara Penggunaan

### 1. Menyiapkan Data di Tab `Input` & `PLU Master`
- Pastikan tab **`PLU Master`** memuat daftar PLU, nama produk, harga satuan, dan data kartonan (`FRAC_KRT`, `PRICE_KRT`, `Benefit Rp`).
- Pada tab **`Input`**:
  - Tabel **`KODE PROMOSI INPUT`**: Masukkan aturan promo aktif (tipe promo, kode promo, qty/rp min, benefit, PLU syarat, limitasi max).
  - Tabel **`TRANSACTION & REFUND INPUT`**: Masukkan paket transaksi awal (Bundling, Non-Paket, Hadiah PHG, Fair Hadiah, Tebus Murah) beserta `Qty Beli`.
  - Masukkan juga `Qty Aktual` (stok yang tersedia) jika sudah ditentukan.

### 2. Menjalankan Perhitungan
- Klik menu **`Simulasi Promo & Refund`** > pilih **`1. Hitung & Buat Tab Result Baru`**.
- Script akan otomatis:
  1. Memvalidasi data (memastikan PLU valid, Qty tidak bernilai minus, dan Qty Aktual tidak melebihi Qty Beli).
  2. Mendistribusikan alokasi stok fisik ke paket berdasarkan hierarki prioritas:
     $$\text{Bundling} \rightarrow \text{Hadiah PHG} \rightarrow \text{Non-Paket / Upsell} \rightarrow \text{Fair Hadiah} \rightarrow \text{Tebus Murah}$$
  3. Membuat tab baru dengan nomor urut berikutnya (misal: `Result - 1`, `Result - 2`).
  4. Menuliskan seluruh tabel dengan formula Google Sheets aktif:
     - **Tabel Tipe Promo** (referensi parameter promo di baris atas).
     - **Tabel SALES** (Gross Sales, Diskon Karton, Bundling, PHG, Harga Coret, Upsell 1..N, Fair Potal 1..N, Fair TMH, DAB, Poin & Stamp).
     - **Tabel EDIT ORDER** (Ringkasan per PLU: Qty Beli, Qty Stok, Qty Refund).
     - **Tabel Detail Transaksi Order Awal** (Total Harga, Diskon Base, Fair Potal, Hadiah/TMH, Sebelum DAB, DAB, Total Pembayaran).
     - **Tabel FULFILLMENT SALES** (Perhitungan ulang penjualan berdasarkan Qty Aktual).
     - **Tabel REFUND** (Gross refund, selisih promo clawback, net refund).
     - **Tabel Detail Transaksi Pemenuhan & Refund** (Total Pemenuhan, Total Fulfillment, Refund Amount, Total Refund Paid).

### 3. Fitur Tambahan: Auto-Distribusi Qty ke Input
Jika Anda hanya ingin mengisi kolom `Qty Aktual` pada tab `Input` secara otomatis berdasarkan prioritas pemenuhan tanpa membuat tab result terlebih dahulu, klik:
- Menu **`Simulasi Promo & Refund`** > pilih **`2. Auto-Distribusi Qty Stok ke Input`**.
