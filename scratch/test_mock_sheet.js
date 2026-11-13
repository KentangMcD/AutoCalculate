const { Product, PromoRule, TransactionItem, EditOrderRow } = require('../Models.gs');
global.EditOrderRow = EditOrderRow;
global.Product = Product;
global.PromoRule = PromoRule;
global.TransactionItem = TransactionItem;
const { DataLoader } = require('../DataLoader.gs');
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

// Simple Mock for Google SpreadsheetApp
class MockRange {
  constructor(sheet, row, col, numRows = 1, numCols = 1) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
    this.numRows = numRows;
    this.numCols = numCols;
  }
  setValue(val) { return this; }
  setValues(vals) { return this; }
  setFormula(f) { return this; }
  setFormulas(formulas) { return this; }
  setFontWeight(fw) { return this; }
  setBackground(bg) { return this; }
  setFontColor(fc) { return this; }
  setNumberFormat(nf) { return this; }
  setBorder() { return this; }
}

class MockSheet {
  constructor(name) {
    this.name = name;
  }
  getName() { return this.name; }
  getRange(r, c, nr = 1, nc = 1) {
    return new MockRange(this, r, c, nr, nc);
  }
}

class MockSpreadsheet {
  constructor() {
    this.sheets = [new MockSheet("PLU Master"), new MockSheet("Input"), new MockSheet("Result - 1")];
  }
  getSheets() { return this.sheets; }
  insertSheet(name) {
    const s = new MockSheet(name);
    this.sheets.push(s);
    return s;
  }
}

console.log("=== TESTING RESULTSHEETBUILDER INITIALIZATION & NEXT SHEET NAME ===");
const mockSS = new MockSpreadsheet();
const services = {
  kartonan: new KartonanService(),
  bundling: new BundlingService(),
  phg: new PHGService(),
  hargaCoret: new HargaCoretService(),
  upsell: new UpsellService(),
  fairPotal: new FairPotalService(),
  fairTmh: new FairTMHService(),
  fairHadiah: new FairHadiahService(),
  dab: new DABService(),
  pointStamp: new PointStampService(),
  distribution: new QtyDistributionService()
};

const builder = new ResultSheetBuilder(mockSS, services);
const nextName = builder.getNextSheetName();
console.log("Next sheet name:", nextName);
if (nextName !== "Result - 2") {
  throw new Error(`Expected 'Result - 2', got '${nextName}'`);
}

const dummyPromos = [
  new PromoRule({ type: 'Bundling', code: 'PLFBDL04', pctBenefit: 0.25, pluSyarat: '10008095' }),
  new PromoRule({ type: 'Harga Coret', code: 'PLFCRT22', rpBenefit: 500, qtyMin: 1, qtyMax: 12, pluSyarat: '10008825' }),
  new PromoRule({ type: 'Upsell', code: 'PLFUPS14', rpBenefit: 2000, campur: 'N', qtyMin: 2, qtyMax: 1000, pluSyarat: '10008825' }),
  new PromoRule({ type: 'Fair Potal', code: 'PLFPOT03', rpBenefit: 4000, rpMin: 40000, rpMax: 80000, pluSyarat: '10008825' }),
  new PromoRule({ type: 'DAB', code: 'PLFDAB02', pctBenefit: 0.25, rpMin: 40000, rpMax: 400000, pluSyarat: 'All PLU' })
];

const dummyTx = [
  new TransactionItem(1, "Non-Paket", "10008095", 50, 24, false),
  new TransactionItem(2, "Bundling - PLFBDL04", "10008095", 1, 1, false)
];

const dummyEditOrder = [
  new EditOrderRow("10008095", "Ultra Slim Straw 200", 51, 25, 26)
];

console.log("Running builder.build()...");
const generatedSheet = builder.build(dummyPromos, dummyTx, dummyEditOrder);
console.log("Generated Sheet successfully:", generatedSheet.getName());
console.log("MOCK RUN COMPLETED WITHOUT ANY ERRORS!");
