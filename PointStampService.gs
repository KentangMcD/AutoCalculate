/**
 * PointStampService.gs
 * Menghasilkan formula perhitungan perolehan Poin dan Stamp (Base, Fair, Cart).
 */

class PointStampService {
  constructor() {}

  /**
   * Formula Base Point/Stamp (Campur = N) pada tabel SALES.
   */
  buildBaseNonCampurSalesFormula(qtyCell, minQtyCell, benefitPtCell, maxQtyCell) {
    return `=CEILING(MIN(ROUNDDOWN(SUM(${qtyCell})/${minQtyCell},0),${maxQtyCell})*${benefitPtCell},1)`;
  }

  /**
   * Formula Base Point/Stamp (Campur = Y) pada tabel SALES.
   */
  buildBaseCampurSalesFormula(qtyRange, minQtyCell, benefitPtCell, maxQtyCell) {
    return `=CEILING(MIN(ROUNDDOWN(SUM(${qtyRange})/${minQtyCell},0),${maxQtyCell})*${benefitPtCell},1)`;
  }

  /**
   * Formula Fair Point/Stamp pada tabel SALES.
   */
  buildFairSalesFormula(netRangeSum, minRpCell, benefitPtCell, maxRpCell) {
    return `=CEILING(ROUNDDOWN(MIN(${maxRpCell},${netRangeSum})/${minRpCell},0)*${benefitPtCell},1)`;
  }

  /**
   * Formula Cart Point/Stamp pada tabel SALES.
   * Sesuai Result Refference (AS70, AW70):
   * =CEILING(MIN(ROUNDDOWN((SUM(AO70:AO88)+B108)/C62,0)*C62,L62)/C62*F62,1)
   */
  buildCartSalesFormula(netTotalSum, minRpCell, benefitPtCell, maxRpCell, packagingFeeCell = '') {
    const totalExpr = packagingFeeCell ? `(${netTotalSum}+${packagingFeeCell})` : netTotalSum;
    return `=CEILING(MIN(ROUNDDOWN(${totalExpr}/${minRpCell},0)*${minRpCell},${maxRpCell})/${minRpCell}*${benefitPtCell},1)`;
  }

  /**
   * Formula Base Point (Campur = N) pada tabel Fulfillment.
   */
  buildBaseNonCampurFulfillmentFormula(qtyAktualCell, qtyBeliCell, minQtyCell, maxQtyCell, salesPtCell) {
    return `=IFERROR(MIN(CEILING(MIN(SUM(${qtyAktualCell}),(ROUNDDOWN(SUM(${qtyBeliCell})/${minQtyCell},0)*${minQtyCell}))/MIN(ROUNDDOWN(SUM(${qtyBeliCell})/${minQtyCell},0)*${minQtyCell},(${minQtyCell}*${maxQtyCell}))*${salesPtCell},1),${salesPtCell}),0)`;
  }

  /**
   * Formula Base Point (Campur = Y) pada tabel Fulfillment (misal AN114 di Result Refference).
   */
  buildBaseCampurFulfillmentFormula(qtyAktualRange, qtyBeliRange, minQtyCell, maxQtyCell, salesPtCell) {
    return `=IFERROR(MIN(CEILING(MIN(SUM(${qtyAktualRange}),(ROUNDDOWN(SUM(${qtyBeliRange})/${minQtyCell},0)*${minQtyCell}))/MIN(ROUNDDOWN(SUM(${qtyBeliRange})/${minQtyCell},0)*${minQtyCell},(${minQtyCell}*${maxQtyCell}))*${salesPtCell},1),${salesPtCell}),0)`;
  }

  /**
   * Formula Base Stamp (Campur = N maupun Campur = Y) pada tabel Fulfillment (AQ115:AQ117, AR115 di Result Refference):
   * Menghitung ulang berdasarkan Qty Aktual (=CEILING(MIN(ROUNDDOWN(SUM(F115)/C18,0),L18)*F18,1)).
   */
  buildBaseStampFulfillmentFormula(qtyAktualRangeOrCell, minQtyCell, benefitPtCell, maxQtyCell) {
    return `=CEILING(MIN(ROUNDDOWN(SUM(${qtyAktualRangeOrCell})/${minQtyCell},0),${maxQtyCell})*${benefitPtCell},1)`;
  }

  /**
   * Formula Fair Point/Stamp pada tabel Fulfillment.
   */
  buildFairFulfillmentFormula(fulfillmentNetRangeSum, minRpCell, benefitPtCell, maxRpCell) {
    return `=CEILING(ROUNDDOWN(MIN(${maxRpCell},${fulfillmentNetRangeSum})/${minRpCell},0)*${benefitPtCell},1)`;
  }

  /**
   * Formula Cart Point/Stamp pada tabel Fulfillment (AP114, AT114 di Result Refference).
   */
  buildCartFulfillmentFormula(fulfillmentNetTotalSum, minRpCell, benefitPtCell, maxRpCell, packagingFeeCell = '') {
    const totalExpr = packagingFeeCell ? `(${fulfillmentNetTotalSum}+${packagingFeeCell})` : fulfillmentNetTotalSum;
    return `=CEILING(MIN(ROUNDDOWN(${totalExpr}/${minRpCell},0)*${minRpCell},${maxRpCell})/${minRpCell}*${benefitPtCell},1)`;
  }

  /**
   * Formula Point/Stamp pada tabel Refund: Selisih antara Sales dan Fulfillment.
   */
  buildRefundFormula(salesPtCell, fulfillmentPtCell) {
    return `=${salesPtCell}-${fulfillmentPtCell}`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PointStampService };
}
