/**
 * Main.gs
 * Entry point untuk Google Sheets Custom Menu dan orkestrator proses perhitungan.
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🌟 Simulasi Promo & Refund 🌟")
    .addItem("🧮 Hitung & Buat Tab Result Baru", "calculateAndGenerateResult")
    .addItem("🖨️ Generate Template Tab Input", "generateInputTemplate")
    .addToUi();
}

/**
 * Menjalankan validasi, kalkulasi distribusi, dan membuat tab Result baru lengkap dengan formula.
 */
function calculateAndGenerateResult() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    // 1. Inisialisasi Service Modular OOP
    const tmhService = new FairTMHService();
    const services = {
      kartonan: new KartonanService(),
      bundling: new BundlingService(),
      phg: new PHGService(),
      hargaCoret: new HargaCoretService(),
      upsell: new UpsellService(),
      fairPotal: new FairPotalService(),
      fairTMH: tmhService,
      fairTmh: tmhService,
      fairHadiah: new FairHadiahService(),
      dab: new DABService(),
      pointStamp: new PointStampService(),
      distribution: new QtyDistributionService()
    };

    // 2. Muat dan Validasi Data dari tab aktif yang sedang dibuka user
    const activeSheet = ss.getActiveSheet ? ss.getActiveSheet() : null;
    const loader = new DataLoader(ss, activeSheet);
    const { productsMap, promoRules, transactions } = loader.loadAll();

    // 3. Bangun Ringkasan Edit Order per PLU
    const editOrderSummary = services.distribution.buildEditOrderSummary(transactions, productsMap);

    // 4. Bangun Sheet Result Baru dengan Formula Lengkap
    const builder = new ResultSheetBuilder(ss, services);
    const newSheet = builder.build(promoRules, transactions, editOrderSummary);

    // Aktifkan tab baru
    ss.setActiveSheet(newSheet);

    ui.alert(
      "Kalkulasi Berhasil",
      `Tab baru '${newSheet.getName()}' berhasil dibuat!\n\nSeluruh tabel SALES, FULFILLMENT, REFUND, dan Detail Transaksi telah diisi dengan formula Google Sheets aktif step-by-step.`,
      ui.ButtonSet.OK
    );

  } catch (error) {
    ui.alert(
      "Gagal Memproses Input",
      `Terjadi kesalahan:\n\n${error.message}`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * Helper opsional: Mendistribusikan total Qty Aktual ke kolom Qty Aktual pada tab Input aktif
 */
function autoDistributeQtyToInput() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    const activeSheet = ss.getActiveSheet ? ss.getActiveSheet() : null;
    const loader = new DataLoader(ss, activeSheet);
    const { productsMap, transactions } = loader.loadAll();
    const distributionService = new QtyDistributionService();

    // Ambil data stok per PLU yang saat ini ada
    const stockMap = new Map();
    for (const item of transactions) {
      if (!stockMap.has(item.plu)) {
        // Ambil stok dari item jika sudah ada, atau default ke qtyBeli
        stockMap.set(item.plu, item.qtyAktual > 0 ? item.qtyAktual : item.qtyBeli);
      }
    }

    // Ambil sheet Input yang sedang aktif
    const inputSheet = loader.resolveInputSheet();
    if (!inputSheet) {
      throw new Error("Tab Input tidak ditemukan.");
    }
    const lastRow = inputSheet.getLastRow();
    const data = inputSheet.getRange(1, 1, lastRow, 10).getValues();

    // Cari letak baris tabel transaksi
    let txHeaderRow = -1;
    let colQtyAktual = -1;
    let colPlu = -1;

    for (let r = 0; r < data.length; r++) {
      for (let c = 0; c < data[r].length; c++) {
        if (String(data[r][c] || '').toLowerCase() === 'qty aktual') {
          colQtyAktual = c + 1;
        }
        if (String(data[r][c] || '').toLowerCase() === 'plu') {
          colPlu = c + 1;
          txHeaderRow = r + 1;
        }
      }
      if (colQtyAktual !== -1 && colPlu !== -1) break;
    }

    if (colQtyAktual === -1 || colPlu === -1) {
      throw new Error("Kolom 'Qty Aktual' atau 'PLU' tidak ditemukan pada tabel Input.");
    }

    // Jalankan distribusi
    distributionService.distributeStock(transactions, stockMap);

    // Tulis kembali ke kolom Qty Aktual di tab Input
    let txIdx = 0;
    for (let r = txHeaderRow + 1; r <= lastRow; r++) {
      const cellPlu = String(inputSheet.getRange(r, colPlu).getValue() || '').trim();
      if (cellPlu && txIdx < transactions.length && transactions[txIdx].plu === cellPlu) {
        inputSheet.getRange(r, colQtyAktual).setValue(transactions[txIdx].qtyAktual);
        txIdx++;
      }
    }

    ui.alert(
      "Distribusi Berhasil",
      "Kolom 'Qty Aktual' pada tab 'Input' telah diperbarui sesuai prioritas alokasi stok.",
      ui.ButtonSet.OK
    );

  } catch (error) {
    ui.alert("Kesalahan", error.message, ui.ButtonSet.OK);
  }
}

/**
 * Menu Action: Membuat tab Input baru ('Input - 1', 'Input - 2', dst.) dengan format dan data siap pakai.
 */
function generateInputTemplate() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    const builder = new InputTemplateBuilder(ss);
    const sheet = builder.generateInputSheet();
    ss.setActiveSheet(sheet);

    ui.alert(
      "Berhasil",
      `Tab input baru '${sheet.getName()}' telah berhasil dibuat dengan format dan data contoh yang siap digunakan.`,
      ui.ButtonSet.OK
    );
  } catch (err) {
    ui.alert("Gagal", err.message, ui.ButtonSet.OK);
  }
}

/**
 * Menu Action: Membuat atau menimpa template tab 'PLU Master' dengan format master produk siap pakai.
 */
function generatePluMasterTemplate() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const response = ui.alert(
    "Konfirmasi Generate Template PLU Master",
    "Apakah Anda yakin ingin membuat/mereset tab 'PLU Master'?\n\nJika tab 'PLU Master' sudah ada, isinya akan ditimpa dengan format dan contoh data master baru.",
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  try {
    const builder = new InputTemplateBuilder(ss);
    const sheet = builder.generatePluMasterSheet();
    ss.setActiveSheet(sheet);

    ui.alert(
      "Berhasil",
      "Template tab 'PLU Master' telah berhasil dibuat dengan daftar produk dan formula kartonan yang siap digunakan.",
      ui.ButtonSet.OK
    );
  } catch (err) {
    ui.alert("Gagal", err.message, ui.ButtonSet.OK);
  }
}
