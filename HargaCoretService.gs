/**
 * HargaCoretService.gs
 * Menghasilkan formula perhitungan diskon promosi Harga Coret (fixed Rp maupun % benefit).
 */

class HargaCoretService {
  constructor() {}

  /**
   * Menghitung ekspresi sisa limitasi Harga Coret setelah dikurangi pemenuhan baris prioritas sebelumnya.
   * @param {PromoRule} promoRule
   * @param {string} minQtyCell - Sel Mekanisme Beli pada tabel Tipe Promo
   * @param {string} maxQtyCell - Sel Limitasi Max pada tabel Tipe Promo
   * @param {Array<string>} priorQtyCells - Sel Qty baris prioritas lebih tinggi
   * @returns {string} Ekspresi max limit untuk formula Google Sheets
   */
  _resolveEffectiveMax(promoRule, minQtyCell, maxQtyCell, priorQtyCells = []) {
    const hasLimit = promoRule.qtyMax !== null || promoRule.rpMax !== null;
    if (priorQtyCells && priorQtyCells.length > 0 && hasLimit) {
      return `MAX(0,${maxQtyCell}-ROUNDDOWN(SUM(${priorQtyCells.join(',')})/${minQtyCell},0))`;
    }
    return maxQtyCell;
  }

  /**
   * Helper internal untuk membangun formula Harga Coret (SALES / FULFILLMENT).
   */
  _buildCoretFormula(promoRule, qtyCell, grossCell, minQtyCell, benefitCell, maxQtyCell, priorQtyCells = [], wrapPctWithIfError = false) {
    const effectiveMaxExpr = this._resolveEffectiveMax(promoRule, minQtyCell, maxQtyCell, priorQtyCells);
    if (promoRule.rpBenefit) {
      return `=CEILING(MIN(ROUNDDOWN(SUM(${qtyCell})/${minQtyCell},0),${effectiveMaxExpr})*${benefitCell},100)`;
    } else if (promoRule.pctBenefit) {
      const expr = `MIN(ROUNDDOWN(SUM(${qtyCell})/${minQtyCell},0)*${minQtyCell},${minQtyCell}*${effectiveMaxExpr})*CEILING((SUM(${grossCell})/SUM(${qtyCell}))*${benefitCell},100)`;
      return wrapPctWithIfError ? `=IFERROR(${expr},0)` : `=${expr}`;
    }
    return '=0';
  }

  /**
   * Menghasilkan formula diskon Harga Coret pada tabel SALES.
   * @param {PromoRule} promoRule
   * @param {string} qtyCell - Misal 'E72'
   * @param {string} grossCell - Misal 'F72'
   * @param {string} minQtyCell - Misal 'C34'
   * @param {string} benefitCell - Misal 'E34' (Rp) atau 'D35' (%)
   * @param {string} maxQtyCell - Misal 'L34'
   * @param {Array<string>} priorQtyCells - Daftar sel Qty baris prioritas lebih tinggi (Non-Paket / TMH sebelumnya)
   */
  buildSalesFormula(promoRule, qtyCell, grossCell, minQtyCell, benefitCell, maxQtyCell, priorQtyCells = []) {
    return this._buildCoretFormula(promoRule, qtyCell, grossCell, minQtyCell, benefitCell, maxQtyCell, priorQtyCells, false);
  }

  /**
   * Menghasilkan formula diskon Harga Coret pada tabel Fulfillment untuk item Non-Paket yang eligible.
   */
  buildFulfillmentFormula(promoRule, qtyAktualCell, grossAktualCell, minQtyCell, benefitCell, maxQtyCell, priorQtyCells = []) {
    return this._buildCoretFormula(promoRule, qtyAktualCell, grossAktualCell, minQtyCell, benefitCell, maxQtyCell, priorQtyCells, true);
  }

  /**
   * Menghasilkan formula proporsional Harga Coret pada tabel Fulfillment untuk baris non-eligible (N114:N115, N118:N123).
   */
  buildFulfillmentProportionalFormula(qtyAktualCell, salesCoretPluCell, qtyBeliCell, wrapIfError = false) {
    if (wrapIfError) {
      return `=IFERROR(${qtyAktualCell}*(${salesCoretPluCell}/${qtyBeliCell}),0)`;
    }
    return `=${qtyAktualCell}*(${salesCoretPluCell}/${qtyBeliCell})`;
  }

  /**
   * Formula Net Sales After Harga Coret:
   * Di SALES: =N70-P70
   * Di FULFILLMENT & REFUND: =MAX(0, M114-N114)
   */
  buildNetAfterFormula(netPrevCell, coretPluCell, useMaxZero = false) {
    if (useMaxZero) {
      return `=MAX(0, ${netPrevCell}-${coretPluCell})`;
    }
    return `=${netPrevCell}-${coretPluCell}`;
  }

  /**
   * Formula Harga Coret pada tabel Refund: Sales Harga Coret - Fulfillment Harga Coret / PLU.
   */
  buildRefundFormula(salesCoretCell, fulfillmentCoretPluCell) {
    return `=${salesCoretCell}-${fulfillmentCoretPluCell}`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HargaCoretService };
}
