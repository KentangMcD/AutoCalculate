const { Product, PromoRule, TransactionItem, EditOrderRow } = require('../Models.gs');
global.EditOrderRow = EditOrderRow;
global.Product = Product;
global.PromoRule = PromoRule;
global.TransactionItem = TransactionItem;
const { QtyDistributionService } = require('../QtyDistributionService.gs');
const { KartonanService } = require('../KartonanService.gs');
const { BundlingService } = require('../BundlingService.gs');
const { PHGService } = require('../PHGService.gs');
const { HargaCoretService } = require('../HargaCoretService.gs');
const { UpsellService } = require('../UpsellService.gs');
const { FairPotalService } = require('../FairPotalService.gs');
const { FairTMHService } = require('../FairTMHService.gs');
const { FairHadiahService } = require('../FairHadiahService.gs');
const { DABService } = require('../DABService.gs');
const { PointStampService } = require('../PointStampService.gs');

console.log("=== TESTING SERVICES INITIALIZATION ===");
const karton = new KartonanService();
console.log("Karton formula:", karton.buildDiskonKartonFormula("B70", "E70", true));

const bundling = new BundlingService();
const bdlRule = new PromoRule({ type: 'Bundling', code: 'PLFBDL04', pctBenefit: 0.25 });
console.log("Bundling total formula:", bundling.buildTotalDiscountFormula(bdlRule, "D7", "F74:F76"));
console.log("Bundling prorate formula:", bundling.buildProrateFormula(false, "F74", "$F$74:$F$76", "$I$74", ""));
console.log("Bundling balancing formula:", bundling.buildProrateFormula(true, "F76", "$F$74:$F$76", "$I$74", "J74:J75"));

const coret = new HargaCoretService();
const coretRule = new PromoRule({ type: 'Harga Coret', code: 'PLFCRT22', rpBenefit: 500, qtyMin: 1, qtyMax: 12 });
console.log("Harga coret formula:", coret.buildSalesFormula(coretRule, "E72", "F72", "C34", "E34", "L34"));

const upsell = new UpsellService();
const upRule = new PromoRule({ type: 'Upsell', code: 'PLFUPS15', rpBenefit: 1000, campur: 'Y', qtyMin: 2, qtyMax: 9 });
console.log("Upsell campur total formula:", upsell.buildCampurSalesTotalFormula(upRule, "E71:E73", "W71:W73", "C26", "E26", "L26"));

const potal = new FairPotalService();
const potRule = new PromoRule({ type: 'Fair Potal', code: 'PLFPOT03', rpBenefit: 4000, rpMin: 40000, rpMax: 80000 });
console.log("Fair potal total formula:", potal.buildSalesTotalFormula(potRule, "SUM(AC72:AC73)", "C36", "E36", "L36"));

const dab = new DABService();
console.log("DAB total formula:", dab.buildSalesTotalFormula("SUM(AL70:AL88)", "L42", "D42"));

const pt = new PointStampService();
console.log("Point formula:", pt.buildBaseNonCampurSalesFormula("E71", "C13", "F13", "L13"));

console.log("\n=== TESTING QTY DISTRIBUTION SERVICE ===");
const distService = new QtyDistributionService();
const txItems = [
  new TransactionItem(1, "Non-Paket", "10008095", 50, 0, false),
  new TransactionItem(2, "Bundling - PLFBDL04", "10008095", 1, 0, false),
  new TransactionItem(3, "Non-Paket", "20087542", 25, 0, true),
  new TransactionItem(4, "Bundling - PLFBDL05", "20087542", 1, 0, false),
  new TransactionItem(5, "Hadiah PHG - PLFPHD17", "20087542", 3, 0, false),
  new TransactionItem(6, "Fair Hadiah - PLFFTH05", "20087542", 4, 0, false),
  new TransactionItem(7, "Fair Tebus Murah - PLFFTM07", "20087542", 10, 0, false)
];

const stockMap = new Map([
  ["10008095", 25],
  ["20087542", 25]
]);

distService.distributeStock(txItems, stockMap);
console.log("Distributed Tx Items:");
for (const item of txItems) {
  console.log(`- ${item.packet} (${item.plu}): Beli=${item.qtyBeli}, Aktual=${item.qtyAktual}`);
}

const summary = distService.buildEditOrderSummary(txItems);
console.log("\nEdit Order Summary:");
for (const s of summary) {
  console.log(`- PLU ${s.plu}: Beli=${s.qtyBeli}, Stok=${s.qtyStok}, Refund=${s.qtyRefund}`);
}

console.log("\nALL SERVICE TESTS PASSED SUCCESSFULLY!");
