/**
 * FairTMHService.gs
 * Menghasilkan formula perhitungan promosi Fair Tebus Murah (FTM / TMH).
 */

class FairTMHService {
  constructor() {}

  /**
   * Formula nilai Fair Tebus Murah pada tabel SALES.
   * @param {string} tebusBenefitCell - Sel Rp Benefit tebus murah pada tabel Tipe Promo (misal 'E50')
   * @param {string} qtyCell - Misal 'E87'
   * @param {string} netPrevCell - Misal 'AI87'
   */
  buildSalesFormula(tebusBenefitCell, qtyCell, netPrevCell) {
    return `=MIN(${tebusBenefitCell}*${qtyCell},${netPrevCell})`;
  }

  /**
   * Formula nilai Fair TMH/PLU pada tabel Fulfillment:
   * Di Result Refference (AH114:AH123, AH125:AH127, AH131:AH132), menggunakan proporsi terhadap Sales:
   * =F131*(AK87/E87) atau =IFERROR(F118*(AK74/E74),0).
   */
  buildFulfillmentFormula(qtyAktualCell, salesTmhPluCell, qtyBeliCell, wrapIfError = false) {
    if (wrapIfError) {
      return `=IFERROR(${qtyAktualCell}*(${salesTmhPluCell}/${qtyBeliCell}),0)`;
    }
    return `=${qtyAktualCell}*(${salesTmhPluCell}/${qtyBeliCell})`;
  }

  /**
   * Formula Net Sales After Fair TMH: Net Prev - Fair TMH / PLU.
   */
  buildNetAfterFormula(netPrevCell, tmhPluCell) {
    return `=${netPrevCell}-${tmhPluCell}`;
  }

  /**
   * Formula Fair TMH pada tabel Refund: Sales Fair TMH/PLU - Fulfillment Fair TMH/PLU.
   */
  buildRefundFormula(salesTMHPluCell, fulfillmentTMHPluCell) {
    return `=${salesTMHPluCell}-${fulfillmentTMHPluCell}`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FairTMHService };
}
