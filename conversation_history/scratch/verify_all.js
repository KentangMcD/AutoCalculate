const fs = require('fs');
const path = require('path');

// Load all .gs files into global context to verify no duplicate declarations in V8
const gsFiles = [
  'Models.gs',
  'InputTemplateBuilder.gs',
  'DataLoader.gs',
  'QtyDistributionService.gs',
  'KartonanService.gs',
  'BundlingService.gs',
  'PHGService.gs',
  'HargaCoretService.gs',
  'UpsellService.gs',
  'FairPotalService.gs',
  'FairHadiahService.gs',
  'FairTMHService.gs',
  'DABService.gs',
  'PointStampService.gs',
  'ResultSheetBuilder.gs',
  'Main.gs'
];

const dir = 'c:/Users/Muhammad Andreansyah/Documents/Project/Calculate';
let combinedCode = '';
for (const file of gsFiles) {
  combinedCode += `\n// === ${file} ===\n` + fs.readFileSync(path.join(dir, file), 'utf8');
}

// Mock SpreadsheetApp
class MockRange {
  constructor(sheet, row, col, numRows = 1, numCols = 1) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
    this.numRows = numRows;
    this.numCols = numCols;
  }
  setValue(val) {
    this.sheet.setCell(this.row, this.col, val);
    return this;
  }
  setFormula(f) {
    this.sheet.setCell(this.row, this.col, f);
    return this;
  }
  setValues(matrix) {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        this.sheet.setCell(this.row + r, this.col + c, matrix[r][c]);
      }
    }
    return this;
  }
  setFormulas(matrix) {
    return this.setValues(matrix);
  }
  getValues() {
    const res = [];
    for (let r = 0; r < this.numRows; r++) {
      const rowArr = [];
      for (let c = 0; c < this.numCols; c++) {
        rowArr.push(this.sheet.getCell(this.row + r, this.col + c));
      }
      res.push(rowArr);
    }
    return res;
  }
  getValue() {
    return this.sheet.getCell(this.row, this.col);
  }
  setBackground() { return this; }
  setFontWeight() { return this; }
  setFontSize() { return this; }
  setFontColor() { return this; }
  setNumberFormat() { return this; }
  setBorder() { return this; }
}

class MockSheet {
  constructor(name) {
    this.name = name;
    this.cells = new Map();
    this.maxR = 0;
    this.maxC = 0;
  }
  getName() { return this.name; }
  clear() { this.cells.clear(); this.maxR = 0; this.maxC = 0; }
  setCell(r, c, val) {
    this.cells.set(`${r},${c}`, val);
    if (r > this.maxR) this.maxR = r;
    if (c > this.maxC) this.maxC = c;
  }
  getCell(r, c) {
    return this.cells.has(`${r},${c}`) ? this.cells.get(`${r},${c}`) : '';
  }
  getLastRow() { return this.maxR; }
  getLastColumn() { return this.maxC; }
  autoResizeColumn() {}
  getRange(arg1, arg2, arg3, arg4) {
    if (typeof arg1 === 'string') {
      return new MockRange(this, 1, 1, 1, 1);
    }
    return new MockRange(this, arg1, arg2, arg3 || 1, arg4 || 1);
  }
}

class MockSpreadsheet {
  constructor() {
    this.sheets = new Map();
  }
  getSheetByName(name) { return this.sheets.get(name) || null; }
  insertSheet(name) {
    const s = new MockSheet(name);
    this.sheets.set(name, s);
    return s;
  }
  getSheets() { return Array.from(this.sheets.values()); }
  setActiveSheet() {}
}

global.SpreadsheetApp = {
  BorderStyle: { SOLID: 'SOLID' },
  getActiveSpreadsheet: () => global.mockSs,
  getUi: () => ({
    Button: { YES: 'YES', NO: 'NO' },
    ButtonSet: { OK: 'OK', YES_NO: 'YES_NO' },
    alert: (title, msg) => {
      console.log(`[UI ALERT] ${title}: ${msg}`);
      return 'YES';
    }
  })
};

// Evaluate combined code in single scope
const vm = require('vm');
vm.runInThisContext(combinedCode);

global.mockSs = new MockSpreadsheet();
generatePluMasterTemplate();
generateInputTemplate();
calculateAndGenerateResult();

const resSheet = global.mockSs.getSheetByName('Result - 1');
console.log('Result - 1 maxRow:', resSheet.getLastRow(), 'maxCol:', resSheet.getLastColumn());

// Print Promo Table rows (6..65)
console.log('\n--- TABEL TIPE PROMO ---');
for (let r = 6; r <= 66; r++) {
  const rowVals = [];
  for (let c = 1; c <= 12; c++) {
    rowVals.push(resSheet.getCell(r, c));
  }
  if (rowVals.some(v => v !== '')) {
    console.log(`R${r}:`, JSON.stringify(rowVals));
  }
}

// Print key rows in SALES, EDIT ORDER, Detail Transaksi 1, FULFILLMENT, REFUND, Detail Transaksi 2
console.log('\n--- SAMPEL BARIS SALES & DETAIL ---');
for (let r = 67; r <= resSheet.getLastRow(); r++) {
  const c1 = resSheet.getCell(r, 1);
  const c2 = resSheet.getCell(r, 2);
  const c5 = resSheet.getCell(r, 5);
  const c6 = resSheet.getCell(r, 6);
  if (c1 || c2 || c5 || c6) {
    console.log(`R${r}: A=${JSON.stringify(c1)} | B=${JSON.stringify(c2)} | E=${JSON.stringify(c5)} | F=${JSON.stringify(c6)} | J=${JSON.stringify(resSheet.getCell(r,10))} | O=${JSON.stringify(resSheet.getCell(r,15))} | R=${JSON.stringify(resSheet.getCell(r,18))} | AD=${JSON.stringify(resSheet.getCell(r,30))} | AM=${JSON.stringify(resSheet.getCell(r,39))} | AP=${JSON.stringify(resSheet.getCell(r,42))}`);
  }
}
