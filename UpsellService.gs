/**
 * UpsellService.gs
 * Menghasilkan formula perhitungan diskon Upsell (Campur = Y atau N, Fixed Rp atau % Benefit).
 */

class UpsellService {
  constructor() {}

  /**
   * Formula total Upsell Campur = N pada tabel SALES.
   */
  buildNonCampurSalesTotalFormula(promoRule, qtyCell, netPrevCell, minQtyCell, benefitCell, maxQtyCell) {
    if (promoRule.rpBenefit) {
      return `=CEILING(MIN(ROUNDDOWN(SUM(${qtyCell})/${minQtyCell},0),${maxQtyCell})*${benefitCell},100)`;
    } else if (promoRule.pctBenefit) {
      return `=CEILING(MIN(ROUNDDOWN(SUM(${qtyCell})/${minQtyCell},0)*${minQtyCell},${minQtyCell}*${maxQtyCell})/SUM(${qtyCell})*SUM(${netPrevCell})*${benefitCell},100)`;
    }
    return '=0';
  }

  /**
   * Formula total Upsell Campur = Y pada tabel SALES (diletakkan pada baris pertama grup PLU eligible).
   */
  buildCampurSalesTotalFormula(promoRule, qtyRange, netPrevRange, minQtyCell, benefitCell, maxQtyCell) {
    if (promoRule.rpBenefit) {
      return `=CEILING(MIN(ROUNDDOWN(SUM(${qtyRange})/${minQtyCell},0),${maxQtyCell})*${benefitCell},100)`;
    } else if (promoRule.pctBenefit) {
      return `=CEILING(MIN(ROUNDDOWN(SUM(${qtyRange})/${minQtyCell},0)*${minQtyCell},${minQtyCell}*${maxQtyCell})/SUM(${qtyRange})*SUM(${netPrevRange})*${benefitCell},100)`;
    }
    return '=0';
  }

  /**
   * Formula prorata Upsell Campur = Y per PLU.
   * @param {boolean} isBalancingItem - Apakah baris ini menjadi penyeimbang selisih (=Total - SUM(lainnya))
   * @param {string} netPrevCell - Misal 'W71'
   * @param {string} groupNetPrevRangeAbs - Misal '$W$71:$W$73'
   * @param {string} totalUpsellCellAbs - Misal '$X$71'
   * @param {string} balancingSumRange - Misal 'Y71:Y72' atau 'W116:W117'
   * @param {string} totalUpsellCellClean - Misal 'X71'
   */
  buildCampurProrateFormula(isBalancingItem, netPrevCell, groupNetPrevRangeAbs, totalUpsellCellAbs, balancingSumRange, totalUpsellCellClean) {
    if (isBalancingItem) {
      return `=${totalUpsellCellClean}-SUM(${balancingSumRange})`;
    }
    return `=IFERROR(ROUND(${netPrevCell}/SUM(${groupNetPrevRangeAbs})*${totalUpsellCellAbs},0),0)`;
  }

  /**
   * Formula Upsell Campur = N pada tabel Fulfillment.
   */
  buildNonCampurFulfillmentFormula(qtyAktualCell, qtyBeliCell, salesTotalCell, minQtyCell, maxQtyCell) {
    return `=MIN(CEILING(MIN(SUM(${qtyAktualCell}),(ROUNDDOWN(SUM(${qtyBeliCell})/${minQtyCell},0)*${minQtyCell}))/MIN(ROUNDDOWN(SUM(${qtyBeliCell})/${minQtyCell},0)*${minQtyCell},(${minQtyCell}*${maxQtyCell}))*${salesTotalCell},100),${salesTotalCell})`;
  }

  /**
   * Formula total Upsell Campur = Y pada tabel Fulfillment (baris pertama grup eligible).
   */
  buildCampurFulfillmentTotalFormula(qtyAktualRange, qtyBeliRange, salesTotalCell, minQtyCell, maxQtyCell) {
    return `=MIN(CEILING(MIN(SUM(${qtyAktualRange}),(ROUNDDOWN(SUM(${qtyBeliRange})/${minQtyCell},0)*${minQtyCell}))/MIN(ROUNDDOWN(SUM(${qtyBeliRange})/${minQtyCell},0)*${minQtyCell},(${minQtyCell}*${maxQtyCell}))*${salesTotalCell},100),${salesTotalCell})`;
  }

  /**
   * Formula Net Sales After Upsell:
   * Di SALES: =Q70-S70
   * Di FULFILLMENT & REFUND: =MAX(0, O114-Q114)
   */
  buildNetAfterFormula(netPrevCell, upsellPluCell, useMaxZero = false) {
    if (useMaxZero) {
      return `=MAX(0,${netPrevCell}-${upsellPluCell})`;
    }
    return `=${netPrevCell}-${upsellPluCell}`;
  }

  /**
   * Formula total Upsell pada tabel Refund: Sales Upsell Total - Fulfillment Upsell Total.
   */
  buildRefundTotalFormula(salesUpsellTotalCell, fulfillUpsellTotalCell) {
    return `=${salesUpsellTotalCell}-${fulfillUpsellTotalCell}`;
  }

  /**
   * Formula prorata Upsell Campur = Y pada tabel Refund.
   */
  buildRefundCampurProrateFormula(isBalancingItem, refundNetPrevCell, refundGroupNetPrevRangeAbs, refundTotalUpsellCellAbs, prevProrateSumRange, refundTotalUpsellCellClean) {
    if (isBalancingItem) {
      return `=${refundTotalUpsellCellClean}-SUM(${prevProrateSumRange})`;
    }
    return `=IFERROR(ROUND(${refundNetPrevCell}/SUM(${refundGroupNetPrevRangeAbs})*${refundTotalUpsellCellAbs},0),0)`;
  }

  /**
   * Formula Upsell / PLU pada tabel Refund (untuk Campur = N atau selisih langsung).
   */
  buildRefundFormula(salesUpsellPluCell, fulfillmentUpsellPluCell) {
    return `=${salesUpsellPluCell}-${fulfillmentUpsellPluCell}`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UpsellService };
}
