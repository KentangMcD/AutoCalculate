/**
 * DABService.gs
 * Menghasilkan formula perhitungan Diskon Alat Bayar (DAB) di tingkat keranjang / fair.
 */

class DABService {
  constructor() {}

  /**
   * Formula total Diskon Alat Bayar pada tabel SALES (diletakkan pada baris pertama).
   * Mendukung % Benefit (D) maupun Rp Benefit (E).
   * @param {string} netPrevSum - Misal 'SUM(AL70:AL88)'
   * @param {string} maxRpCell - Misal 'L42'
   * @param {string} benefitCell - Misal 'D42' (%) atau 'E42' (Rp)
   * @param {string|null} minRpCell - Misal 'C42' jika menggunakan Rp Benefit
   * @param {boolean} isRpBenefit - True jika promo DAB menggunakan potongan nominal Rp Benefit
   */
  buildSalesTotalFormula(netPrevSum, maxRpCell, benefitCell, minRpCell = null, isRpBenefit = false) {
    if (isRpBenefit && minRpCell) {
      return `=CEILING(ROUNDDOWN(MIN(${maxRpCell},${netPrevSum})/${minRpCell},0)*${benefitCell},100)`;
    }
    return `=CEILING(ROUNDDOWN(MIN(${maxRpCell},${netPrevSum})*${benefitCell},100),1)`;
  }

  /**
   * Formula prorata Diskon Alat Bayar per PLU pada tabel SALES.
   * Mendukung balancing item (misal AN73 di Result Refference: =AM70-SUM(AN70:AN72,AN74:AN88))
   * agar total prorata DAB selalu 100% sama dengan total Diskon Alat Bayar.
   */
  buildSalesProrateFormula(isBalancingItem, netPrevCell, netPrevRangeAbs, totalDabCellAbs, balancingSumRange = '', totalDabClean = '') {
    if (isBalancingItem && balancingSumRange && totalDabClean) {
      return `=${totalDabClean}-SUM(${balancingSumRange})`;
    }
    return `=ROUND(${netPrevCell}/SUM(${netPrevRangeAbs})*${totalDabCellAbs},0)`;
  }

  /**
   * Formula total Diskon Alat Bayar pada tabel Fulfillment.
   */
  buildFulfillmentTotalFormula(fulfillmentNetPrevSum, minRpCell, maxRpCell, salesNetPrevSum, salesDabTotalCell) {
    return `=MIN(CEILING((${fulfillmentNetPrevSum}/(MIN(ROUNDDOWN(${salesNetPrevSum}/${minRpCell},0),${maxRpCell}/${minRpCell})*${minRpCell}))*${salesDabTotalCell},100),${salesDabTotalCell})`;
  }

  /**
   * Formula prorata Diskon Alat Bayar pada tabel Fulfillment.
   */
  buildFulfillmentProrateFormula(isBalancingItem, netPrevCell, netPrevRangeAbs, totalFulfillmentDabAbs, balancingSumRange, totalFulfillmentDabClean) {
    if (isBalancingItem) {
      return `=${totalFulfillmentDabClean}-SUM(${balancingSumRange})`;
    }
    return `=IFERROR(ROUND(${netPrevCell}/SUM(${netPrevRangeAbs})*${totalFulfillmentDabAbs},0),0)`;
  }

  /**
   * Formula Net Sales After DAB.
   */
  buildNetAfterFormula(netPrevCell, dabPluCell) {
    return `=${netPrevCell}-${dabPluCell}`;
  }

  /**
   * Formula total Diskon Alat Bayar pada tabel Refund: Sales Total DAB - Fulfillment Total DAB.
   */
  buildRefundTotalFormula(salesDabTotalCell, fulfillDabTotalCell) {
    return `=${salesDabTotalCell}-${fulfillDabTotalCell}`;
  }

  /**
   * Formula prorata Diskon Alat Bayar pada tabel Refund.
   * Di Result Refference (AK137), baris pertama menjadi penyeimbang: =AJ137-SUM(AK138:AK155),
   * sedangkan baris lainnya: =IFERROR(ROUND(AI138/SUM($AI$137:$AI$155)*$AJ$137,0),0).
   */
  buildRefundProrateFormula(isBalancingItem, netPrevCell, refundNetPrevRangeAbs, refundDabTotalCellAbs, balancingSumRange = '', refundDabTotalClean = '') {
    if (isBalancingItem && balancingSumRange && refundDabTotalClean) {
      return `=${refundDabTotalClean}-SUM(${balancingSumRange})`;
    }
    return `=IFERROR(ROUND(${netPrevCell}/SUM(${refundNetPrevRangeAbs})*${refundDabTotalCellAbs},0),0)`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DABService };
}
