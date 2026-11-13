/**
 * FairHadiahService.gs
 * Menghasilkan formula diskon Fair Hadiah Gratis (FTH).
 */

class FairHadiahService {
  constructor() {}

  /**
   * Formula nilai Fair Hadiah Gratis pada tabel SALES: sama dengan Gross Sales item hadiah.
   * @param {string} grossCell - Misal 'F84'
   */
  buildSalesFormula(grossCell) {
    return `=${grossCell}`;
  }

  /**
   * Formula Fair Hadiah Gratis pada tabel Fulfillment:
   * Merujuk pada Net Sales sebelumnya di baris yang sama (misal '=AG128' di Result Refference),
   * sehingga jika Qty Aktual > 0 maka sebesar nilai barang hadiahnya, dan jika Qty Aktual = 0 maka Rp0.
   * @param {string} fulfillNetPrevCell - Misal 'AG128'
   */
  buildFulfillmentFormula(fulfillNetPrevCell) {
    return `=${fulfillNetPrevCell}`;
  }

  /**
   * Formula Fair Hadiah Gratis pada tabel Refund: Sales FTH - Fulfillment FTH.
   */
  buildRefundFormula(salesFTHPluCell, fulfillmentFTHPluCell) {
    return `=${salesFTHPluCell}-${fulfillmentFTHPluCell}`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FairHadiahService };
}
