const { InputTemplateBuilder } = require('../InputTemplateBuilder.gs');

class MockRange {
  constructor() {}
  setValue() { return this; }
  setValues() { return this; }
  setFormula() { return this; }
  setFormulas() { return this; }
  setFontWeight() { return this; }
  setFontSize() { return this; }
  setBackground() { return this; }
  setFontColor() { return this; }
  setNumberFormat() { return this; }
  setBorder() { return this; }
}

class MockSheet {
  constructor(name) { this.name = name; }
  getName() { return this.name; }
  clear() { return this; }
  getRange() { return new MockRange(); }
  autoResizeColumn() { return this; }
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
}

console.log("=== TESTING INPUT TEMPLATE BUILDER ===");
const ss = new MockSpreadsheet();
const builder = new InputTemplateBuilder(ss);

const inputSheet = builder.generateInputSheet();
console.log("Generated:", inputSheet.getName());

const pluSheet = builder.generatePluMasterSheet();
console.log("Generated:", pluSheet.getName());

console.log("INPUT TEMPLATE BUILDER TESTS PASSED SUCCESSFULLY!");
