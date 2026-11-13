/**
 * KartonanService.gs
 * Menghasilkan formula perhitungan diskon kartonan dan net sales after karton.
 */

class KartonanService {
  constructor() {}

  /**
   * Menghasilkan formula diskon karton untuk suatu baris transaksi.
   * @param {string} pluCell - Contoh 'B70'
   * @param {string} qtyCell - Contoh 'E70'
   * @param {boolean} isKarton - Apakah item ini berstatus kartonan
   * @returns {string} Formula atau angka '=0'
   */
  buildDiskonKartonFormula(pluCell, qtyCell, isKarton) {
    if (!isKarton) {
      return '=0';
    }
    // FRAC_KRT ada di kolom E (indeks 4 dari B), Diskon Karton (Benefit Rp) ada di kolom H (indeks 7 dari B)
    return `=IFERROR(ROUNDDOWN(${qtyCell}/VLOOKUP(${pluCell},'PLU Master'!$B:$E,4,FALSE),0)*VLOOKUP(${pluCell},'PLU Master'!$B:$H,7,FALSE),0)`;
  }

  /**
   * Menghasilkan formula Net Sales After Karton: Gross Sales - Diskon Karton.
   * @param {string} grossCell - Contoh 'F70'
   * @param {string} kartonCell - Contoh 'G70'
   * @returns {string}
   */
  buildNetAfterKartonFormula(grossCell, kartonCell) {
    return `=${grossCell}-${kartonCell}`;
  }

  /**
   * Menghasilkan formula Diskon Karton pada tabel Refund: Sales Karton - Fulfillment Karton.
   * @param {string} salesKartonCell - Contoh 'G70'
   * @param {string} fulfillKartonCell - Contoh 'H114'
   * @returns {string}
   */
  buildRefundKartonFormula(salesKartonCell, fulfillKartonCell) {
    return `=${salesKartonCell}-${fulfillKartonCell}`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KartonanService };
}
