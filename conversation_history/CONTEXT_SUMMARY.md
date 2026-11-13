# Context Summary & Conversation History (`30395cdd-5f05-49b9-8dff-e155211099c0`)

Dokumen ini menyimpan konteks lengkap percakapan, keputusan desain (hasil `/grill-me` dan `/plan`), struktur formula referensi, serta log transkrip agar dapat langsung dilanjutkan (*align*) ketika project dibuka dari perangkat lain.

## 1. Berkas di Dalam Folder `conversation_history/`
- [`CONTEXT_SUMMARY.md`](./CONTEXT_SUMMARY.md): Ringkasan keputusan arsitektur, aturan bisnis promosi, dan riwayat pengerjaan.
- [`implementation_plan.md`](./implementation_plan.md): Rencana implementasi per masing-masing berkas `.gs` (1–16).
- [`transcript.jsonl`](./transcript.jsonl) & [`transcript_full.jsonl`](./transcript_full.jsonl): Log transkrip lengkap percakapan Antigravity.
- [`scratch/ref_formulas.txt`](./scratch/ref_formulas.txt): Dump lengkap seluruh formula asli dari tab `Result Refference` (`B1:AW203`).
- [`scratch/verify_all.js`](./scratch/verify_all.js): Script pengujian lokal (Node.js VM) untuk memvalidasi ke-16 berkas `.gs` tanpa perlu membuka browser.
- [`user_uploaded/`](./user_uploaded/): Tangkapan layar (*screenshots*) referensi yang diunggah selama diskusi.

## 2. Keputusan Desain & Aturan Bisnis Utama
1. **Spreadsheet Referensi**:
   - URL: `https://docs.google.com/spreadsheets/d/1krkFeo8XVKz-_4ksLPShdbYWhIoqFJ4_16bLCkeZuVE/edit?gid=1775217777#gid=1775217777`
   - Salinan lokal juga disertakan di root repo: [`spreadsheet.xlsx`](../spreadsheet.xlsx), [`sheet.csv`](../sheet.csv), [`input.csv`](../input.csv), [`result1.csv`](../result1.csv).
2. **Arsitektur Modular OOP (`.gs`)**:
   - Terdiri dari 16 berkas `.gs` di root repo (`Main.gs`, `Models.gs`, `DataLoader.gs`, `InputTemplateBuilder.gs`, `QtyDistributionService.gs`, `ResultSheetBuilder.gs`, dan 10 service promosi).
   - Semua berkas `.gs` di Google Apps Script V8 berbagi *global scope*, sehingga tidak menggunakan `require()` di tingkat global.
3. **Urutan Waterfall Promosi**:
   - `Gross Sales -> Diskon Karton -> Bundling -> PHG -> Harga Coret -> Upsell -> Fair Potal -> Fair TMH / Fair Hadiah -> Diskon Alat Bayar (DAB) -> Point & Stamp`.
4. **Prioritas Distribusi Stok (`Qty Aktual`)**:
   - `1. Bundling -> 2. Hadiah PHG -> 3. Non-Paket / Upsell -> 4. Fair Hadiah -> 5. Fair Tebus Murah`.
5. **Formula Google Sheets Aktif**:
   - Seluruh sel kalkulasi pada tabel `Tipe Promo`, `SALES`, `EDIT ORDER`, `Detail Transaksi`, `FULFILLMENT SALES`, dan `REFUND` menggunakan rumus aktif (`=CEILING(...)`, `=ROUNDDOWN(...)`, `=VLOOKUP(...)`, `=SUMIF(...)`) dengan peta kolom dinamis (`salesColMap`, `fulfillColMap`, `refundColMap`).

## 3. Cara Melanjutkan di Perangkat Baru
Jika Anda membuka repositori ini di perangkat lain menggunakan Antigravity:
1. Lakukan `git clone https://github.com/KentangMcD/AutoCalculate.git`
2. Minta agent membaca [`conversation_history/CONTEXT_SUMMARY.md`](./CONTEXT_SUMMARY.md) dan [`conversation_history/implementation_plan.md`](./implementation_plan.md) (serta [`conversation_history/transcript.jsonl`](./transcript.jsonl) bila butuh detail langkah sebelumnya).
