const { Product, PromoRule, TransactionItem, EditOrderRow } = require('../Models.gs');
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
const { ResultSheetBuilder } = require('../ResultSheetBuilder.gs');

global.Product = Product;
global.PromoRule = PromoRule;
global.TransactionItem = TransactionItem;
global.EditOrderRow = EditOrderRow;

class MockRange {
  constructor(name) { this.name = name; }
  setValue() { return this; }
  setValues() { return this; }
  setFormula() { return this; }
  setFormulas(f) { 
    this.formulas = f;
    return this; 
  }
  setFontWeight() { return this; }
  setFontColor() { return this; }
  setBackground() { return this; }
  setNumberFormat() { return this; }
  setBorder() { return this; }
}

class MockSheet {
  constructor(name) { this.name = name; }
  getName() { return this.name; }
  getRange(r, c, nr, nc) { return new MockRange(`${this.name}!R${r}C${c}`); }
}

class MockSpreadsheet {
  constructor() {
    this.sheets = [new MockSheet("Input"), new MockSheet("PLU Master")];
  }
  getSheets() { return this.sheets; }
  insertSheet(name) {
    const s = new MockSheet(name);
    this.sheets.push(s);
    return s;
  }
}

// Full promo list with Fair TMH
const promos = [
  new PromoRule({ type: 'Harga Coret', code: 'PLFCRT22', rpBenefit: 500, qtyMin: 1, qtyMax: 12, pluSyarat: '10008825' }),
  new PromoRule({ type: 'Harga Coret', code: 'PLFCRT21', pctBenefit: 0.05, qtyMin: 1, qtyMax: 16, pluSyarat: '20087542' }),
  new PromoRule({ type: 'Upsell', code: 'PLFUPS14', rpBenefit: 2000, campur: 'N', qtyMin: 2, qtyMax: 1000, pluSyarat: '10008825\n20087542' }),
  new PromoRule({ type: 'Upsell', code: 'PLFUPS12', pctBenefit: 0.05, campur: 'N', qtyMin: 2, qtyMax: 1000, pluSyarat: '10008825\n20087542' }),
  new PromoRule({ type: 'Upsell', code: 'PLFUPS15', rpBenefit: 1000, campur: 'Y', qtyMin: 2, qtyMax: 9, pluSyarat: '10008825\n20087542\n20085988' }),
  new PromoRule({ type: 'Upsell', code: 'PLFUPS13', pctBenefit: 0.1, campur: 'Y', qtyMin: 2, qtyMax: 9, pluSyarat: '10008825\n20087542\n20085988' }),
  new PromoRule({ type: 'Bundling', code: 'PLFBDL04', pctBenefit: 0.25, pluSyarat: '10008095\n20085988\n10008825' }),
  new PromoRule({ type: 'Bundling', code: 'PLFBDL05', rpBenefit: 3500, pluSyarat: '20085988\n10008825\n20087542' }),
  new PromoRule({ type: 'PHG', code: 'PLFPHD01', targetItem: '10008825', pluSyarat: '10008825' }),
  new PromoRule({ type: 'PHG', code: 'PLFPHD17', targetItem: '20087542', pluSyarat: '10008825\n20087542' }),
  new PromoRule({ type: 'Fair - Potal', code: 'PLFPOT03', rpMin: 40000, rpBenefit: 4000, rpMax: 80000, pluSyarat: '10008825\n20087542' }),
  new PromoRule({ type: 'Fair - Potal', code: 'PLFPOT07', rpMin: 50000, pctBenefit: 0.05, rpMax: 150000, pluSyarat: '10008095\n20085988\n10008825\n20087542' }),
  new PromoRule({ type: 'Fair TMH', code: 'PLFFTM01', rpMin: 30000, rpBenefit: 2000, targetItem: '10008825', pluSyarat: '10008825\n20087542' }),
  new PromoRule({ type: 'Fair TMH', code: 'PLFFTM07', rpMin: 50000, rpBenefit: 3000, targetItem: '20087542', pluSyarat: '10008095\n20085988\n10008825' }),
  new PromoRule({ type: 'Fair Hadiah', code: 'PLFFTH02', targetItem: '10008825' }),
  new PromoRule({ type: 'Fair Hadiah', code: 'PLFFTH05', targetItem: '20087542' }),
  new PromoRule({ type: 'Fair - DAB', code: 'PLFDAB02', rpMin: 40000, pctBenefit: 0.25, rpMax: 400000, pluSyarat: '10008095\n20085988\n10008825\n20087542' })
];

const tx = [
  new TransactionItem(1, "Non-Paket", "10008095", 50, 24, false),
  new TransactionItem(2, "Non-Paket", "20085988", 12, 12, true),
  new TransactionItem(3, "Non-Paket", "10008825", 55, 40, false),
  new TransactionItem(4, "Non-Paket", "20087542", 25, 24, true),
  new TransactionItem(5, "Bundling - PLFBDL04", "10008095", 1, 1, false),
  new TransactionItem(6, "Bundling - PLFBDL04", "20085988", 1, 1, false),
  new TransactionItem(7, "Bundling - PLFBDL04", "10008825", 1, 1, false),
  new TransactionItem(8, "Bundling - PLFBDL05", "20085988", 1, 1, false),
  new TransactionItem(9, "Bundling - PLFBDL05", "10008825", 1, 1, false),
  new TransactionItem(10, "Bundling - PLFBDL05", "20087542", 1, 1, false),
  new TransactionItem(11, "Hadiah PHG - PLFPHD01", "10008825", 3, 3, false),
  new TransactionItem(12, "Hadiah PHG - PLFPHD17", "10008825", 3, 3, false),
  new TransactionItem(13, "Hadiah PHG - PLFPHD17", "20087542", 3, 0, false),
  new TransactionItem(14, "Fair Hadiah - PLFFTH02", "10008825", 3, 0, false),
  new TransactionItem(15, "Fair Hadiah - PLFFTH05", "20087542", 4, 0, false),
  new TransactionItem(16, "Fair Tebus Murah - PLFFTM01", "10008825", 3, 0, false),
  new TransactionItem(17, "Fair Tebus Murah - PLFFTM07", "20087542", 10, 0, false)
];

const editOrderSummary = [
  new EditOrderRow("10008095", "Ultra Slim Straw 200", 51, 25, 26),
  new EditOrderRow("20085988", "Le Minerale 1500Ml", 14, 14, 0),
  new EditOrderRow("10008825", "Ultra Uht Coklat 125", 69, 48, 21),
  new EditOrderRow("20087542", "Golda Coff.Dolce 200", 43, 25, 18)
];

const mockSS = new MockSpreadsheet();
const tmhService = new FairTMHService();
const services = {
  kartonan: new KartonanService(),
  bundling: new BundlingService(),
  phg: new PHGService(),
  hargaCoret: new HargaCoretService(),
  upsell: new UpsellService(),
  fairPotal: new FairPotalService(),
  fairTMH: tmhService,
  fairTmh: tmhService,
  fairHadiah: new FairHadiahService(),
  dab: new DABService(),
  pointStamp: new PointStampService(),
  distribution: new QtyDistributionService()
};

console.log("Running ResultSheetBuilder with full realistic dataset...");
const builder = new ResultSheetBuilder(mockSS, services);
const newSheet = builder.build(promos, tx, editOrderSummary);
console.log("Successfully created sheet:", newSheet.getName());
console.log("TEST COMPLETED WITH ZERO ERRORS!");
