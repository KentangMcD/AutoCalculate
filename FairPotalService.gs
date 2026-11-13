/**
 * FairPotalService.gs
 * Menghasilkan formula perhitungan diskon promosi Fair Potal (Potongan Langsung belanja fair).
 */

class FairPotalService {
  constructor() {}

  /**
   * Formula total diskon Fair Potal pada tabel SALES (diletakkan pada baris pertama item eligible).
   * @param {PromoRule} promoRule
   * @param {string} eligibleNetPrevSum - Misal "SUM(AC72:AC73,AC76,AC78:AC79)"
   * @param {string} minRpCell - Misal 'C36'
   * @param {string} benefitCell - Misal 'E36' (Rp) atau 'D38' (%)
   * @param {string} maxRpCell - Misal 'L36' atau 'L38'
   */
  buildSalesTotalFormula(promoRule, eligibleNetPrevSum, minRpCell, benefitCell, maxRpCell) {
    if (promoRule.rpBenefit) {
      return `=CEILING(ROUNDDOWN(MIN(${maxRpCell},${eligibleNetPrevSum})/${minRpCell},0)*${benefitCell},100)`;
    } else if (promoRule.pctBenefit) {
      return `=CEILING(ROUNDDOWN(MIN(${maxRpCell},${eligibleNetPrevSum})*${benefitCell},0),100)`;
    }
    return '=0';
  }

  /**
   * Formula prorata Fair Potal per PLU pada tabel SALES.
   */
  buildProrateFormula(isBalancingItem, netPrevCell, eligibleNetPrevRangeAbs, totalPotalCellAbs, balancingSumRange, totalPotalCellClean) {
    if (isBalancingItem) {
      return `=${totalPotalCellClean}-SUM(${balancingSumRange})`;
    }
    return `=ROUND(${netPrevCell}/${eligibleNetPrevRangeAbs}*${totalPotalCellAbs},0)`;
  }

  /**
   * Formula total diskon Fair Potal pada tabel Fulfillment.
   * @param {string} fulfillmentEligibleSum - Misal 'SUM(AA116:AA117,AA120,AA122:AA123)'
   * @param {string|number} maxRpRef - Sel Limitasi Max (misal 'L36') atau nilai angka
   * @param {string} salesTotalCell - Sel total Fair Potal di tabel SALES (misal 'AD72')
   */
  buildFulfillmentTotalFormula(fulfillmentEligibleSum, maxRpRef, salesTotalCell) {
    return `=MIN(CEILING((${fulfillmentEligibleSum}/${maxRpRef})*${salesTotalCell},100),${salesTotalCell})`;
  }

  /**
   * Formula prorata Fair Potal pada tabel Fulfillment.
   */
  buildFulfillmentProrateFormula(isBalancingItem, netPrevCell, eligibleSumAbs, totalFulfillmentPotalCellAbs, balancingSumRange, totalFulfillmentPotalCellClean) {
    if (isBalancingItem) {
      return `=${totalFulfillmentPotalCellClean}-SUM(${balancingSumRange})`;
    }
    return `=IFERROR(ROUND(${netPrevCell}/${eligibleSumAbs}*${totalFulfillmentPotalCellAbs},0),0)`;
  }

  /**
   * Formula Net Sales After Fair Potal.
   */
  buildNetAfterFormula(netPrevCell, potalPluCell) {
    return `=${netPrevCell}-${potalPluCell}`;
  }

  /**
   * Formula total Fair Potal pada tabel Refund: Sales Total - Fulfillment Total.
   */
  buildRefundTotalFormula(salesTotalCell, fulfillTotalCell) {
    return `=${salesTotalCell}-${fulfillTotalCell}`;
  }

  /**
   * Formula prorata Fair Potal pada tabel Refund.
   */
  buildRefundProrateFormula(isBalancingItem, refundNetPrevCell, refundEligibleSumAbs, refundTotalPotalCellAbs, balancingSumRange, refundTotalPotalCellClean) {
    if (isBalancingItem) {
      return `=${refundTotalPotalCellClean}-SUM(${balancingSumRange})`;
    }
    return `=IFERROR(ROUND(${refundNetPrevCell}/${refundEligibleSumAbs}*${refundTotalPotalCellAbs},0),0)`;
  }

  /**
   * Formula Fair Potal pada tabel Refund (selisih langsung).
   */
  buildRefundFormula(salesPotalPluCell, fulfillmentPotalPluCell) {
    return `=${salesPotalPluCell}-${fulfillmentPotalPluCell}`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FairPotalService };
}
