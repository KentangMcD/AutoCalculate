/**
 * BundlingService.gs
 * Menghasilkan formula perhitungan diskon paket bundling dan prorata pembagian nilai ke tiap PLU.
 */

class BundlingService {
  constructor() {}

  /**
   * Menghasilkan formula nilai total diskon bundling pada baris pertama paket.
   * @param {PromoRule} promoRule
   * @param {string} promoRefCell - Sel benefit pada tabel Tipe Promo (misal 'D7' untuk % atau 'E10' untuk Rp)
   * @param {string} grossRange - Range gross sales paket, misal 'F74:F76'
   * @returns {string}
   */
  buildTotalDiscountFormula(promoRule, promoRefCell, grossRange) {
    if (promoRule.pctBenefit) {
      return `=CEILING(${promoRefCell}*SUM(${grossRange}),100)`;
    } else if (promoRule.rpBenefit) {
      return `=${promoRefCell}`;
    }
    return '=0';
  }

  /**
   * Menghasilkan formula prorata diskon bundling per PLU.
   * @param {boolean} isLastItemInPackage - Apakah item ini item terakhir dalam paket
   * @param {string} currentGrossCell - Misal 'F74'
   * @param {string} packageGrossRangeAbsolute - Misal '$F$74:$F$76'
   * @param {string} totalBundlingCellAbsolute - Misal '$I$74'
   * @param {string} prevProrateSumRange - Misal 'J74:J75' untuk item terakhir
   * @returns {string}
   */
  buildProrateFormula(isLastItemInPackage, currentGrossCell, packageGrossRangeAbsolute, totalBundlingCellAbsolute, prevProrateSumRange) {
    if (isLastItemInPackage) {
      const cleanTotalCell = totalBundlingCellAbsolute.replace(/\$/g, '');
      return `=${cleanTotalCell}-SUM(${prevProrateSumRange})`;
    }
    return `=IFERROR(ROUND(${currentGrossCell}/SUM(${packageGrossRangeAbsolute})*${totalBundlingCellAbsolute},0),0)`;
  }

  /**
   * Formula Net Sales After Bundling: Net After Karton - Bundling / PLU.
   */
  buildNetAfterBundlingFormula(netKartonCell, bundlingPluCell) {
    return `=${netKartonCell}-${bundlingPluCell}`;
  }

  /**
   * Formula Bundling / PLU pada tabel Fulfillment.
   * Untuk baris paket Bundling: =IFERROR(F118*(J74/E74),0).
   * Untuk baris Non-Bundling (seperti Non-Paket): merujuk langsung ke sel Sales (=J70) atau =0.
   */
  buildFulfillmentBundlingFormula(qtyAktualCell, qtyBeliCell, salesBundlingPluCell, isBundlingRow = true) {
    if (!isBundlingRow) {
      return `=${salesBundlingPluCell}`;
    }
    return `=IFERROR(${qtyAktualCell}*(${salesBundlingPluCell}/${qtyBeliCell}),0)`;
  }

  /**
   * Formula Bundling / PLU pada tabel Refund.
   */
  buildRefundBundlingFormula(salesBundlingPluCell, fulfillmentBundlingPluCell) {
    return `=${salesBundlingPluCell}-${fulfillmentBundlingPluCell}`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BundlingService };
}
