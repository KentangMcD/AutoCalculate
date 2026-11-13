/**
 * QtyDistributionService.gs
 * Bertanggung jawab mendistribusikan total Qty Aktual / Stok fisik per PLU
 * ke masing-masing baris transaksi berdasarkan urutan prioritas pemenuhan:
 * 1. Bundling
 * 2. Hadiah PHG
 * 3. Non-Paket / Upsell
 * 4. Fair Hadiah
 * 5. Fair Tebus Murah
 */

class QtyDistributionService {
  constructor() {}

  /**
   * Menentukan kategori prioritas dari nama paket.
   * Nilai return lebih kecil berarti prioritas lebih tinggi.
   */
  static getPacketPriority(packetName) {
    const p = (packetName || '').toLowerCase();
    if (p.includes('bundling')) return 1;
    if (p.includes('hadiah phg') || p.includes('phg')) return 2;
    if (p.includes('non-paket') || p.includes('upsell') || p === '') return 3;
    if (p.includes('fair hadiah')) return 4;
    if (p.includes('tebus murah') || p.includes('tmh')) return 5;
    return 6;
  }

  /**
   * Mendistribusikan total stok per PLU ke baris-baris transaksi.
   * @param {Array<TransactionItem>} transactions 
   * @param {Map<string, number>} stockPerPluMap - Map berisi plu -> total Qty Stok
   * @returns {Array<TransactionItem>} transactions yang telah diperbarui qtyAktual-nya
   */
  distributeStock(transactions, stockPerPluMap) {
    // Salin stok agar tidak memodifikasi input asli langsung
    const remainingStock = new Map();
    for (const [plu, stock] of stockPerPluMap.entries()) {
      remainingStock.set(String(plu).trim(), Number(stock) || 0);
    }

    // Kelompokkan item berdasarkan prioritas paket
    const prioritizedIndices = transactions.map((item, idx) => ({
      index: idx,
      priority: QtyDistributionService.getPacketPriority(item.packet),
      plu: item.plu,
      qtyBeli: item.qtyBeli
    })).sort((a, b) => a.priority - b.priority);

    // Reset qtyAktual pada semua item
    for (const item of transactions) {
      item.qtyAktual = 0;
    }

    // Alokasikan stok sesuai prioritas
    for (const entry of prioritizedIndices) {
      const item = transactions[entry.index];
      const available = remainingStock.get(item.plu) || 0;
      if (available <= 0) {
        item.qtyAktual = 0;
      } else if (available >= item.qtyBeli) {
        item.qtyAktual = item.qtyBeli;
        remainingStock.set(item.plu, available - item.qtyBeli);
      } else {
        item.qtyAktual = available;
        remainingStock.set(item.plu, 0);
      }
    }

    return transactions;
  }

  /**
   * Menghasilkan ringkasan Edit Order per PLU dari daftar transaksi.
   * @param {Array<TransactionItem>} transactions
   * @param {Map<string, Product>} productsMap
   * @returns {Array<EditOrderRow>}
   */
  buildEditOrderSummary(transactions, productsMap) {
    const summaryMap = new Map();

    for (const item of transactions) {
      if (!summaryMap.has(item.plu)) {
        const prod = productsMap ? productsMap.get(item.plu) : null;
        summaryMap.set(item.plu, {
          plu: item.plu,
          name: prod ? prod.name : item.name,
          qtyBeli: 0,
          qtyStok: 0
        });
      }
      const entry = summaryMap.get(item.plu);
      entry.qtyBeli += item.qtyBeli;
      entry.qtyStok += item.qtyAktual;
    }

    const result = [];
    for (const entry of summaryMap.values()) {
      const qtyRefund = Math.max(0, entry.qtyBeli - entry.qtyStok);
      result.push(new EditOrderRow(
        entry.plu,
        entry.name,
        entry.qtyBeli,
        entry.qtyStok,
        qtyRefund
      ));
    }

    return result;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QtyDistributionService };
}
