/**
 * InputTemplateBuilder.gs
 * Bertanggung jawab membuat atau mereset tampilan template tab 'Input' dan 'PLU Master'
 * lengkap dengan tata letak header, data contoh, format angka/mata uang, dan styling visual.
 */

class InputTemplateBuilder {
  constructor(spreadsheet) {
    this.ss = spreadsheet || SpreadsheetApp.getActiveSpreadsheet();
  }

  /**
   * Membuat atau menimpa tab 'Input' dengan format dan data contoh yang siap pakai.
   */
  generateInputSheet() {
    let sheet = this.ss.getSheetByName("Input");
    if (!sheet) {
      sheet = this.ss.insertSheet("Input");
    } else {
      sheet.clear();
    }

    // 1. Bagian Atas: KODE PROMOSI INPUT
    sheet.getRange("A1").setValue("KODE PROMOSI INPUT").setFontWeight("bold").setFontSize(11);

    const promoHeaders = [
      "Tipe Promo", "Kode Promo", "Qty min", "Rp Min", "% Benefit", "Rp Benefit",
      "Poin/Stamp Benefit", "Item Target", "PLU Syarat", "Campur", "Kelipatan",
      "QTY Max", "RP Max"
    ];

    sheet.getRange(2, 1, 1, promoHeaders.length)
      .setValues([promoHeaders])
      .setBackground("#D9D9D9")
      .setFontWeight("bold");

    const promoData = [
      // Harga Coret
      ["Harga Coret", "PLFCRT22", 1, "-", "-", 500, "-", "-", "10008825", "N", "Y", 12, "-"],
      ["", "PLFCRT21", 1, "-", 0.05, "-", "-", "-", "20087542", "N", "Y", 16, "-"],
      // Upsell
      ["Upsell", "PLFUPS14", 2, "-", "-", 2000, "-", "-", "10008825\n20087542", "N", "Y", 1000, "-"],
      ["", "PLFUPS12", 2, "-", 0.05, "-", "-", "-", "10008825\n20087542", "N", "Y", 1000, "-"],
      ["", "PLFUPS15", 2, "-", "-", 1000, "-", "-", "10008825\n20087542\n20085988", "Y", "Y", 9, "-"],
      ["", "PLFUPS13", 2, "-", 0.1, "-", "-", "-", "10008825\n20087542\n20085988", "Y", "Y", 9, "-"],
      // Bundling
      ["Bundling", "PLFBDL04", 3, "-", 0.25, "-", "-", "-", "10008095\n20085988\n10008825", "-", "-", "-", "-"],
      ["", "PLFBDL05", 3, "-", "-", 3500, "-", "-", "20085988\n10008825\n20087542", "-", "-", "-", "-"],
      // PHG
      ["PHG", "PLFPHD01", 2, "-", "-", "-", "-", "10008825", "10008825\n20087542", "Y", "Y", 3, "-"],
      ["", "PLFPHD17", 3, "-", "-", "-", "-", "10008825/20087542", "10008825\n20087542", "N", "Y", 3, "-"],
      // Fair Potal
      ["FAIR POTAL", "PLFPOT03", "-", 40000, "-", 4000, "-", "-", "10008825\n20087542", "Y", "Y", "-", 80000],
      ["", "PLFPOT07", "-", 50000, 0.05, "-", "-", "-", "10008095\n20085988\n10008825\n20087542", "Y", "Y", "-", 150000],
      // Fair TMH
      ["FAIR TMH", "PLFFTM01", "-", 30000, "-", 2000, "-", "10008825", "10008825\n20087542", "Y", "Y", "-", 90000],
      ["", "PLFFTM07", "-", 50000, "-", 3000, "-", "20087542", "10008095\n20085988\n10008825", "Y", "Y", "-", 600000],
      // Fair Hadiah
      ["FAIR HADIAH GRATIS", "PLFFTH02", "-", 30000, "-", "-", "-", "10008825", "10008825\n20087542", "Y", "Y", "-", 90000],
      ["", "PLFFTH05", "-", 50000, "-", "-", "-", "20087542", "20085988\n10008825", "Y", "Y", "-", 300000],
      // Fair DAB
      ["FAIR DAB", "PLFDAB02", "-", 40000, 0.25, "-", "-", "-", "10008095\n20085988\n10008825\n20087542", "Y", "Y", "-", 400000],
      // Base Poin & Stamp
      ["Base Poin", "HOKA090C", 2, "-", "-", "-", 150, "-", "20085988\n10008825\n20087542", "N", "Y", 1, "-"],
      ["", "HOKA090E", 2, "-", "-", "-", 100, "-", "20085988\n10008095", "Y", "Y", 5, "-"],
      ["Base STAMP", "HOKA090J", 2, "-", "-", "-", 150, "-", "20085988\n10008825\n20087542", "N", "Y", 1, "-"],
      ["", "HOKA090L", 2, "-", "-", "-", 150, "-", "20085988\n10008825\n20087542", "Y", "Y", 6, "-"],
      // Fair Poin & Stamp
      ["FAIR Poin", "HOKA0905", "-", 45000, "-", "-", 200, "-", "20085988\n10008825\n20087542", "Y", "Y", "-", 225000],
      ["FAIR STAMP", "HOKA090M", "-", 20000, "-", "-", 1, "-", "20085988\n10008825\n20087542", "Y", "Y", "-", 100000],
      // Cart Poin & Stamp
      ["CART Poin", "HOKA090F", "-", 1000, "-", "-", 1, "-", "All PLU", "Y", "Y", "-", 200000],
      ["CART STAMP", "HOKA0908", "-", 45000, "-", "-", 4, "-", "All PLU", "Y", "Y", "-", 225000]
    ];

    const promoTotalRows = promoData.length + 10;
    sheet.getRange(3, 1, promoData.length, promoHeaders.length).setValues(promoData);

    // Format kolom persentase
    sheet.getRange(3, 5, promoTotalRows, 1).setNumberFormat("0%");
    // Format kolom Rupiah
    sheet.getRange(3, 4, promoTotalRows, 1).setNumberFormat("Rp#,##0");
    sheet.getRange(3, 6, promoTotalRows, 1).setNumberFormat("Rp#,##0");
    sheet.getRange(3, 13, promoTotalRows, 1).setNumberFormat("Rp#,##0");

    // Terapkan Dropdown (Data Validation) untuk Tipe Promo, Campur, dan Kelipatan
    this.applyDropdown(sheet.getRange(3, 1, promoTotalRows, 1), [
      "Harga Coret", "Upsell", "Bundling", "PHG", "FAIR POTAL", "FAIR TMH",
      "FAIR HADIAH GRATIS", "FAIR DAB", "Base Poin", "Base STAMP",
      "FAIR Poin", "FAIR STAMP", "CART Poin", "CART STAMP"
    ]);
    this.applyDropdown(sheet.getRange(3, 10, promoTotalRows, 2), ["Y", "N", "-"]);

    // 2. Bagian Bawah: TRANSACTION & REFUND INPUT
    const txStartRow = 3 + promoTotalRows + 2;
    sheet.getRange(txStartRow, 2).setValue("TRANSACTION & REFUND INPUT").setFontWeight("bold").setFontSize(11);

    const txHeaders = ["Paket", "PLU", "Qty Beli", "Qty Aktual", "Kartonan Only"];
    sheet.getRange(txStartRow + 2, 2, 1, txHeaders.length)
      .setValues([txHeaders])
      .setBackground("#6AA84F")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold");

    const txData = [
      ["Non-Paket", "10008095", 50, 24, "N"],
      ["", "20085988", 12, 12, "Y"],
      ["", "10008825", 55, 40, "N"],
      ["", "20087542", 25, 24, "Y"],
      ["Bundling - PLFBDL04", "10008095", 1, 1, "N"],
      ["", "20085988", 1, 1, "N"],
      ["", "10008825", 1, 1, "N"],
      ["Bundling - PLFBDL05", "20085988", 1, 1, "N"],
      ["", "10008825", 1, 1, "N"],
      ["", "20087542", 1, 1, "N"],
      ["Hadiah PHG - PLFPHD01", "10008825", 3, 3, "N"],
      ["Hadiah PHG - PLFPHD17", "10008825", 3, 3, "N"],
      ["", "20087542", 3, 0, "N"],
      ["Fair Hadiah - PLFFTH02", "10008825", 3, 0, "N"],
      ["Fair Hadiah - PLFFTH05", "20087542", 4, 0, "N"],
      ["Fair Tebus Murah - PLFFTM01", "10008825", 3, 0, "N"],
      ["Fair Tebus Murah - PLFFTM07", "20087542", 10, 0, "N"]
    ];

    const txTotalRows = txData.length + 10;
    sheet.getRange(txStartRow + 3, 2, txData.length, txHeaders.length).setValues(txData);

    // Format Qty Beli & Qty Aktual
    sheet.getRange(txStartRow + 3, 4, txTotalRows, 2).setNumberFormat("#,##0");

    // Terapkan Dropdown (Data Validation) untuk Kartonan Only
    this.applyDropdown(sheet.getRange(txStartRow + 3, 6, txTotalRows, 1), ["Y", "N"]);

    // Border grid
    const borderStyle = (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.BorderStyle) ? SpreadsheetApp.BorderStyle.SOLID : null;
    sheet.getRange(2, 1, promoTotalRows + 1, promoHeaders.length).setBorder(true, true, true, true, true, true, "#D3D3D3", borderStyle);
    sheet.getRange(txStartRow + 2, 2, txTotalRows + 1, txHeaders.length).setBorder(true, true, true, true, true, true, "#D3D3D3", borderStyle);

    // Auto-fit kolom
    for (let c = 1; c <= promoHeaders.length; c++) {
      sheet.autoResizeColumn(c);
    }

    return sheet;
  }

  /**
   * Menerapkan Data Validation dropdown secara aman ke suatu range Google Sheets.
   */
  applyDropdown(range, options) {
    if (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.newDataValidation && range.setDataValidation) {
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(options, true)
        .setAllowInvalid(true)
        .build();
      range.setDataValidation(rule);
    }
  }

  /**
   * Membuat atau menimpa tab 'PLU Master' dengan daftar produk master dan formula karton.
   */
  generatePluMasterSheet() {
    let sheet = this.ss.getSheetByName("PLU Master");
    if (!sheet) {
      sheet = this.ss.insertSheet("PLU Master");
    } else {
      sheet.clear();
    }

    const headers = ["No", "PLU", "Nama Produk", "Harga", "FRAC_KRT", "PRICE_KRT", "Harga per pcs", "Benefit Rp", "Benefit %"];
    sheet.getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setBackground("#3D85C6")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold");

    const sampleProducts = [
      [1, "10008095", "Ultra Slim Straw 200", 5900, 24, 133400],
      [2, "20085988", "Le Minerale 1500Ml", 6800, 12, 67000],
      [3, "10008825", "Ultra Uht Coklat 125", 4100, 40, 141600],
      [4, "20087542", "Golda Coff.Dolce 200", 4000, 24, 82800],
      [5, "10003814", "Aqua Air Mineral 600", 4000, 24, 77900],
      [6, "20090527", "Crystalin Btl 600Ml", 3000, 24, 64800],
      [7, "10000652", "Indomi Ayam Bwng 69G", 3100, 40, 124000]
    ];

    const staticRows = [];
    const formulaRows = [];
    for (let i = 0; i < sampleProducts.length; i++) {
      const r = i + 2;
      const [no, plu, name, price, frac, priceKrt] = sampleProducts[i];
      staticRows.push([no, plu, name, price, frac, priceKrt]);
      formulaRows.push([
        `=F${r}/E${r}`,
        `=(D${r}*E${r})-F${r}`,
        `=(D${r}-G${r})/D${r}`
      ]);
    }

    // Tulis kolom statis A-F (kolom 1 s/d 6) dan kolom formula G-I (kolom 7 s/d 9) secara terpisah
    sheet.getRange(2, 1, staticRows.length, 6).setValues(staticRows);
    sheet.getRange(2, 7, formulaRows.length, 3).setFormulas(formulaRows);

    // Number formats
    sheet.getRange(2, 4, sampleProducts.length, 1).setNumberFormat("Rp#,##0"); // Harga
    sheet.getRange(2, 5, sampleProducts.length, 1).setNumberFormat("#,##0");   // FRAC
    sheet.getRange(2, 6, sampleProducts.length, 1).setNumberFormat("Rp#,##0"); // PRICE_KRT
    sheet.getRange(2, 7, sampleProducts.length, 1).setNumberFormat("Rp#,##0"); // Harga per pcs
    sheet.getRange(2, 8, sampleProducts.length, 1).setNumberFormat("Rp#,##0"); // Benefit Rp
    sheet.getRange(2, 9, sampleProducts.length, 1).setNumberFormat("0.00%");   // Benefit %

    const borderStyle = (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.BorderStyle) ? SpreadsheetApp.BorderStyle.SOLID : null;
    sheet.getRange(1, 1, sampleProducts.length + 1, headers.length).setBorder(true, true, true, true, true, true, "#D3D3D3", borderStyle);

    for (let c = 1; c <= headers.length; c++) {
      sheet.autoResizeColumn(c);
    }

    return sheet;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { InputTemplateBuilder };
}
