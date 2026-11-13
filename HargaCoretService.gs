/**
 * HargaCoretService.gs
 * Menghasilkan formula perhitungan diskon promosi Harga Coret (fixed Rp maupun % benefit).
 */

class HargaCoretService {
  constructor() {}

  /**
   * Menghasilkan formula diskon Harga Coret pada tabel SALES.
   * @param {PromoRule} promoRule
   * @param {string} qtyCell - Misal 'E72'
   * @param {string} grossCell - Misal 'F72'
   * @param {string} minQtyCell - Misal 'C34'
   * @param {string} benefitCell - Misal 'E34' (Rp) atau 'D35' (%)
   * @param {string} maxQtyCell - Misal 'L34'
   */
  buildSalesFormula(promoRule, qtyCell, grossCell, minQtyCell, benefitCell, maxQtyCell) {
    if (promoRule.rpBenefit) {
      return `=CEILING(MIN(ROUNDDOWN(SUM(${qtyCell})/${minQtyCell},0),${maxQtyCell})*${benefitCell},100)`;
    } else if (promoRule.pctBenefit) {
      return `=MIN(ROUNDDOWN(SUM(${qtyCell})/${minQtyCell},0)*${minQtyCell},${minQtyCell}*${maxQtyCell})*CEILING((SUM(${grossCell})/SUM(${qtyCell}))*${benefitCell},100)`;
    }
    return '=0';
  }

  /**
   * Menghasilkan formula diskon Harga Coret pada tabel Fulfillment untuk item Non-Paket yang eligible.
   */
  buildFulfillmentFormula(promoRule, qtyAktualCell, grossAktualCell, minQtyCell, benefitCell, maxQtyCell) {
    if (promoRule.rpBenefit) {
      return `=CEILING(MIN(ROUNDDOWN(SUM(${qtyAktualCell})/${minQtyCell},0),${maxQtyCell})*${benefitCell},100)`;
    } else if (promoRule.pctBenefit) {
      return `=IFERROR(MIN(ROUNDDOWN(SUM(${qtyAktualCell})/${minQtyCell},0)*${minQtyCell},${minQtyCell}*${maxQtyCell})*CEILING((SUM(${grossAktualCell})/SUM(${qtyAktualCell}))*${benefitCell},100),0)`;
    }
    return '=0';
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
