/**
 * PHGService.gs
 * Menghasilkan formula perhitungan diskon Produk Hadiah Gratis (PHG).
 */

class PHGService {
  constructor() {}

  /**
   * Formula nilai PHG pada tabel SALES: sama dengan Gross Sales produk hadiah.
   * @param {string} grossCell - Misal 'F81'
   */
  buildSalesPHGFormula(grossCell) {
    return `=${grossCell}`;
  }

  /**
   * Formula Net Sales After PHG: Net After Bundling - PHG / PLU.
   */
  buildNetAfterPHGFormula(netBundlingCell, phgPluCell) {
    return `=${netBundlingCell}-${phgPluCell}`;
  }

  /**
   * Formula PHG/PLU pada tabel Fulfillment:
   * Pada baris item Hadiah PHG di Result Refference (L125:L127), nilainya sama dengan Gross Sales Fulfillment (=G125).
   * Pada baris Non-Paket/Bundling (L114:L123), merujuk ke sel Sales (=M70).
   */
  buildFulfillmentPHGFormula(fulfillGrossCell, salesPHGPluCell, isPHGRow = true) {
    if (isPHGRow) {
      return `=${fulfillGrossCell}`;
    }
    return `=${salesPHGPluCell}`;
  }

  /**
   * Formula PHG pada tabel Refund: Sales PHG/PLU - Fulfillment PHG/PLU.
   */
  buildRefundPHGFormula(salesPHGPluCell, fulfillmentPHGPluCell) {
    return `=${salesPHGPluCell}-${fulfillmentPHGPluCell}`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PHGService };
}
