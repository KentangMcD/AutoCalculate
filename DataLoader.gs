/**
 * DataLoader.gs
 * Bertanggung jawab memuat dan memvalidasi data dari tab 'PLU Master' dan 'Input'.
 */

class DataLoader {
  constructor(spreadsheet, inputSheet = null) {
    this.ss = spreadsheet || SpreadsheetApp.getActiveSpreadsheet();
    this.inputSheet = inputSheet;
    this.inputSheetName = 'Input';
    this.productsMap = new Map();
    this.promoRules = [];
    this.transactions = [];
  }

  /**
   * Menentukan sheet Input yang digunakan (prioritas: parameter eksplisit -> sheet aktif yang dibuka user -> fallback 'Input').
   */
  resolveInputSheet() {
    if (this.inputSheet) {
      return this.inputSheet;
    }
    if (this.ss.getActiveSheet) {
      const active = this.ss.getActiveSheet();
      if (active) return active;
    }
    const legacy = this.ss.getSheetByName('Input');
    if (legacy) return legacy;

    if (this.ss.getSheets) {
      const inputSheets = this.ss.getSheets().filter(s => /^Input(\s*-\s*\d+)?$/i.test(s.getName()));
      if (inputSheets.length > 0) return inputSheets[inputSheets.length - 1];
    }
    return null;
  }

  loadAll() {
    this.loadPluMaster();
    this.loadInputSheet();
    this.autoDistributeIfTotalStockEntered();
    this.validate();
    return {
      productsMap: this.productsMap,
      promoRules: this.promoRules,
      transactions: this.transactions
    };
  }

  loadPluMaster() {
    const sheet = this.ss.getSheetByName('PLU Master');
    if (!sheet) {
      throw new Error("Tab 'PLU Master' tidak ditemukan di spreadsheet.");
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      throw new Error("Tab 'PLU Master' kosong atau tidak memiliki data.");
    }

    // Header at row 1, data starts row 2. Columns: No (1), PLU (2), Nama Produk (3), Harga (4), FRAC_KRT (5), PRICE_KRT (6), ...
    const data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rawPlu = row[1];
      if (rawPlu !== null && rawPlu !== undefined && String(rawPlu).trim() !== '') {
        const plu = String(rawPlu).trim();
        const product = new Product(
          plu,
          row[2], // Nama Produk
          row[3], // Harga
          row[4], // FRAC_KRT
          row[5], // PRICE_KRT
          row[7], // Benefit Rp
          row[8]  // Benefit %
        );
        this.productsMap.set(plu, product);
      }
    }
  }

  loadInputSheet() {
    const sheet = this.resolveInputSheet();
    if (!sheet) {
      throw new Error("Tab Input tidak ditemukan. Silakan buka tab Input yang ingin dihitung.");
    }

    const sheetName = sheet.getName ? sheet.getName() : 'Input';
    if (sheetName.toLowerCase() === 'plu master' || /^result\s*-/i.test(sheetName)) {
      throw new Error(`Tab yang sedang dibuka ('${sheetName}') bukan tab Input. Silakan buka/pilih tab Input yang ingin dihitung terlebih dahulu.`);
    }
    this.inputSheetName = sheetName;

    const lastRow = sheet.getLastRow();
    const lastCol = Math.max(sheet.getLastColumn(), 15);
    if (lastRow < 3) {
      throw new Error(`Tab '${sheetName}' tidak memiliki data yang cukup.`);
    }

    const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();

    // 1. Parsing KODE PROMOSI INPUT
    let promoHeaderRow = -1;
    let promoColMap = {};

    for (let r = 0; r < data.length; r++) {
      for (let c = 0; c < data[r].length; c++) {
        const cell = String(data[r][c] || '').trim().toLowerCase();
        if (cell === 'kode promo') {
          promoHeaderRow = r;
          break;
        }
      }
      if (promoHeaderRow !== -1) break;
    }

    if (promoHeaderRow !== -1) {
      const headerRowVals = data[promoHeaderRow];
      for (let c = 0; c < headerRowVals.length; c++) {
        const h = String(headerRowVals[c] || '').trim().toLowerCase();
        if (h.includes('tipe promo')) promoColMap.tipe = c;
        else if (h.includes('kode promo')) promoColMap.kode = c;
        else if (h.includes('qty min')) promoColMap.qtyMin = c;
        else if (h.includes('rp min')) promoColMap.rpMin = c;
        else if (h.includes('% benefit')) promoColMap.pctBenefit = c;
        else if (h.includes('rp benefit')) promoColMap.rpBenefit = c;
        else if (h.includes('poin') || h.includes('stamp benefit')) promoColMap.ptBenefit = c;
        else if (h.includes('item target')) promoColMap.targetItem = c;
        else if (h.includes('plu syarat')) promoColMap.pluSyarat = c;
        else if (h.includes('campur')) promoColMap.campur = c;
        else if (h.includes('kelipatan')) promoColMap.kelipatan = c;
        else if (h.includes('qty  max') || h.includes('qty max')) promoColMap.qtyMax = c;
        else if (h.includes('rp  max') || h.includes('rp max')) promoColMap.rpMax = c;
      }
      if (promoColMap.tipe === undefined && promoColMap.kode > 0) {
        promoColMap.tipe = promoColMap.kode - 1;
      }

      let currentTipe = '';
      let lastPromoRule = null;

      for (let r = promoHeaderRow + 1; r < data.length; r++) {
        const row = data[r];
        const rowText = row.join(' ').toLowerCase();
        if (rowText.includes('transaction & refund input') || rowText.includes('transaction input')) {
          break; // Selesai tabel promosi
        }

        const kodeVal = promoColMap.kode !== undefined ? String(row[promoColMap.kode] || '').trim() : '';
        const tipeVal = promoColMap.tipe !== undefined ? String(row[promoColMap.tipe] || '').trim() : '';
        const pluSyaratVal = promoColMap.pluSyarat !== undefined ? String(row[promoColMap.pluSyarat] || '').trim() : '';
        const targetItemVal = promoColMap.targetItem !== undefined ? String(row[promoColMap.targetItem] || '').trim() : '';

        if (tipeVal) currentTipe = tipeVal;

        if (kodeVal) {
          const promoRule = new PromoRule({
            type: currentTipe,
            code: kodeVal,
            qtyMin: promoColMap.qtyMin !== undefined ? row[promoColMap.qtyMin] : null,
            rpMin: promoColMap.rpMin !== undefined ? row[promoColMap.rpMin] : null,
            pctBenefit: promoColMap.pctBenefit !== undefined ? row[promoColMap.pctBenefit] : null,
            rpBenefit: promoColMap.rpBenefit !== undefined ? row[promoColMap.rpBenefit] : null,
            ptBenefit: promoColMap.ptBenefit !== undefined ? row[promoColMap.ptBenefit] : null,
            targetItem: targetItemVal,
            pluSyarat: pluSyaratVal,
            campur: promoColMap.campur !== undefined ? row[promoColMap.campur] : 'N',
            kelipatan: promoColMap.kelipatan !== undefined ? row[promoColMap.kelipatan] : 'Y',
            qtyMax: promoColMap.qtyMax !== undefined ? row[promoColMap.qtyMax] : null,
            rpMax: promoColMap.rpMax !== undefined ? row[promoColMap.rpMax] : null,
            sourceRow: r + 1
          });
          this.promoRules.push(promoRule);
          lastPromoRule = promoRule;
        } else if (lastPromoRule && (pluSyaratVal && pluSyaratVal !== '-')) {
          // Mendukung sub-baris PLU Syarat jika user menulis 1 PLU per baris di bawah kode promo yang sama
          if (lastPromoRule.pluSyarat && lastPromoRule.pluSyarat !== '-') {
            lastPromoRule.pluSyarat += '\n' + pluSyaratVal;
          } else {
            lastPromoRule.pluSyarat = pluSyaratVal;
          }
          if (targetItemVal && targetItemVal !== '-' && (!lastPromoRule.targetItem || lastPromoRule.targetItem === '-')) {
            lastPromoRule.targetItem = targetItemVal;
          }
        }
      }
    }

    // 2. Parsing TRANSACTION & REFUND INPUT
    let txHeaderRow = -1;
    let txColMap = {};

    for (let r = 0; r < data.length; r++) {
      const rowText = data[r].join(' ').toLowerCase();
      if (rowText.includes('transaction & refund input') || rowText.includes('transaction input')) {
        for (let subR = r + 1; subR < Math.min(r + 6, data.length); subR++) {
          for (let c = 0; c < data[subR].length; c++) {
            const cell = String(data[subR][c] || '').trim().toLowerCase();
            if (cell === 'plu') {
              txHeaderRow = subR;
              break;
            }
          }
          if (txHeaderRow !== -1) break;
        }
        break;
      }
    }

    if (txHeaderRow !== -1) {
      const headerRowVals = data[txHeaderRow];
      for (let c = 0; c < headerRowVals.length; c++) {
        const h = String(headerRowVals[c] || '').trim().toLowerCase();
        if (h.includes('paket')) txColMap.paket = c;
        else if (h === 'plu') txColMap.plu = c;
        else if (h.includes('qty beli')) txColMap.qtyBeli = c;
        else if (h.includes('qty aktual')) txColMap.qtyAktual = c;
        else if (h.includes('karton')) txColMap.karton = c;
      }
      if (txColMap.paket === undefined && txColMap.plu > 0) {
        txColMap.paket = txColMap.plu - 1;
      }

      let currentPaket = 'Non-Paket';
      let itemId = 1;

      for (let r = txHeaderRow + 1; r < data.length; r++) {
        const row = data[r];
        const rawPlu = txColMap.plu !== undefined ? row[txColMap.plu] : null;
        const rawPaket = txColMap.paket !== undefined ? String(row[txColMap.paket] || '').trim() : '';

        // Jika baris berisi judul kategori hadiah/tebus murah tanpa PLU
        if (rawPaket && (!rawPlu || String(rawPlu).trim() === '')) {
          currentPaket = rawPaket;
          continue;
        }

        if (rawPaket) {
          currentPaket = rawPaket;
        }

        if (rawPlu !== null && rawPlu !== undefined && String(rawPlu).trim() !== '') {
          const plu = String(rawPlu).trim();
          const qtyBeli = txColMap.qtyBeli !== undefined ? row[txColMap.qtyBeli] : 0;
          const qtyAktual = txColMap.qtyAktual !== undefined ? row[txColMap.qtyAktual] : 0;
          const isKarton = txColMap.karton !== undefined ? row[txColMap.karton] : 'N';

          const item = new TransactionItem(
            itemId++,
            currentPaket,
            plu,
            qtyBeli,
            qtyAktual,
            isKarton
          );

          // Pasangkan info dari PLU Master
          const prod = this.productsMap.get(plu);
          if (prod) {
            item.name = prod.name;
            item.price = prod.price;
          }

          this.transactions.push(item);
        }
      }
    }
  }

  /**
   * Jika user memasukkan total Qty Stok PLU pada salah satu baris (misal baris Non-Paket
   * sehingga qtyAktual > qtyBeli sementara baris paket lainnya bernilai 0), distribusikan
   * total stok tersebut ke seluruh paket PLU yang sama berdasarkan prioritas paket.
   */
  autoDistributeIfTotalStockEntered() {
    const groupedByPlu = new Map();
    for (const item of this.transactions) {
      if (!groupedByPlu.has(item.plu)) {
        groupedByPlu.set(item.plu, []);
      }
      groupedByPlu.get(item.plu).push(item);
    }

    const DistServiceClass = (typeof QtyDistributionService !== 'undefined')
      ? QtyDistributionService
      : (typeof require !== 'undefined' ? require('./QtyDistributionService.gs').QtyDistributionService : null);

    if (!DistServiceClass) return;
    const distService = new DistServiceClass();

    for (const [plu, pluItems] of groupedByPlu.entries()) {
      if (pluItems.length > 1 && pluItems.some(it => it.qtyAktual > it.qtyBeli)) {
        const totalStock = pluItems.reduce((sum, it) => sum + (it.qtyAktual || 0), 0);
        const totalQtyBeli = pluItems.reduce((sum, it) => sum + (it.qtyBeli || 0), 0);
        if (totalStock <= totalQtyBeli) {
          const stockMap = new Map([[plu, totalStock]]);
          distService.distributeStock(pluItems, stockMap);
        }
      }
    }
  }

  validate() {
    const sheetName = this.inputSheetName || 'Input';
    if (this.promoRules.length === 0) {
      throw new Error(`Tidak ditemukan aturan promosi yang valid pada tab '${sheetName}'.`);
    }

    if (this.transactions.length === 0) {
      throw new Error(`Tidak ditemukan item transaksi pada bagian 'TRANSACTION & REFUND INPUT' di tab '${sheetName}'.`);
    }

    // Validasi PLU
    for (const item of this.transactions) {
      if (!this.productsMap.has(item.plu)) {
        throw new Error(`PLU '${item.plu}' pada transaksi (${item.packet}) tidak terdaftar di tab 'PLU Master'.`);
      }
      if (item.qtyBeli < 0) {
        throw new Error(`Qty Beli untuk PLU '${item.plu}' tidak boleh bernilai negatif.`);
      }
      if (item.qtyAktual < 0) {
        throw new Error(`Qty Aktual untuk PLU '${item.plu}' tidak boleh bernilai negatif.`);
      }
      if (item.qtyAktual > item.qtyBeli) {
        throw new Error(`Qty Aktual (${item.qtyAktual}) untuk PLU '${item.plu}' tidak boleh melebihi Qty Beli (${item.qtyBeli}).`);
      }
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DataLoader };
}
