/**
 * ResultSheetBuilder.gs
 * Bertanggung jawab menyusun seluruh struktur tab Result baru ('Result - 1', 'Result - 2', dst.),
 * menuliskan formula Google Sheets aktif step-by-step, dan menerapkan styling tampilan
 * yang 100% selaras dengan tab 'Result Refference'.
 */

class ResultSheetBuilder {
  constructor(spreadsheet, services) {
    this.ss = spreadsheet || SpreadsheetApp.getActiveSpreadsheet();
    this.services = services || {};
    if (this.services.fairTmh && !this.services.fairTMH) {
      this.services.fairTMH = this.services.fairTmh;
    }
    if (this.services.fairTMH && !this.services.fairTmh) {
      this.services.fairTmh = this.services.fairTMH;
    }
  }

  static getColLetter(colIdx) {
    let temp = '';
    let letter = '';
    while (colIdx > 0) {
      temp = (colIdx - 1) % 26;
      letter = String.fromCharCode(temp + 65) + letter;
      colIdx = Math.floor((colIdx - temp - 1) / 26);
    }
    return letter;
  }

  getNextSheetName() {
    const sheets = this.ss.getSheets();
    let maxNum = 0;
    const regex = /^Result\s*-\s*(\d+)$/i;

    for (const sheet of sheets) {
      const name = sheet.getName();
      const match = name.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return `Result - ${maxNum + 1}`;
  }

  build(promoRules, transactions, editOrderSummary) {
    const newSheetName = this.getNextSheetName();
    const sheet = this.ss.insertSheet(newSheetName);

    // 1. Tulis Header Judul (Baris 2)
    sheet.getRange(2, 1).setValue("SIMULASI PERHITUNGAN ").setFontWeight("bold");
    sheet.getRange(2, 2).setValue("SO").setFontWeight("bold");
    sheet.getRange(3, 2).setValue("SOC");
    sheet.getRange(4, 2).setValue("BA Refund");

    // 2. Tulis Tabel Tipe Promo (Mulai Baris 6) dengan ekspansi sub-baris PLU Syarat
    const promoStartRow = 6;
    const currentPromoRow = this.buildPromoTable(sheet, promoStartRow, promoRules);

    // 3. Konfigurasi Kolom Promosi Dinamis & Column Map Tracker
    const promoColsDef = this.buildPromoColumnsDefinition(promoRules);
    const { headers: salesCols, colMap: salesColMap } = this.buildTableHeadersAndMap(promoColsDef, 'sales');
    const { headers: fulfillCols, colMap: fulfillColMap } = this.buildTableHeadersAndMap(promoColsDef, 'fulfillment');
    const { headers: refundCols, colMap: refundColMap } = this.buildTableHeadersAndMap(promoColsDef, 'refund');

    // 4. Hitung Posisi Baris Seluruh Tabel di Awal (agar rumus lintas tabel seperti Biaya Packaging B108 akurat)
    const txLen = transactions.length;
    const eoLen = editOrderSummary.length;

    const salesHeaderRow = currentPromoRow + 2;
    const salesStartRow = salesHeaderRow + 1;
    const salesEndRow = salesStartRow + txLen - 1;
    const salesTotalRow = salesEndRow + 1;

    const editOrderHeaderRow = salesTotalRow + 3;
    const editOrderStartRow = editOrderHeaderRow + 1;
    const editOrderEndRow = editOrderStartRow + Math.max(0, eoLen - 1);

    const detail1HeaderRow = editOrderEndRow + 3;
    const detail1PackagingRow = detail1HeaderRow + 8; // Baris "Biaya Plastik / Packaging"
    const detail1EndRow = detail1HeaderRow + 9;

    const fulfillHeaderRow = detail1EndRow + 3;
    const fulfillStartRow = fulfillHeaderRow + 1;
    const fulfillEndRow = fulfillStartRow + txLen - 1;
    const fulfillTotalRow = fulfillEndRow + 1;

    const refundHeaderRow = fulfillTotalRow + 3;
    const refundStartRow = refundHeaderRow + 1;
    const refundEndRow = refundStartRow + txLen - 1;
    const refundTotalRow = refundEndRow + 1;

    const detail2HeaderRow = refundTotalRow + 3;

    // 5. Bangun Tabel SALES (Order Awal)
    sheet.getRange(salesHeaderRow - 1, 1).setValue("SALES").setFontWeight("bold");
    sheet.getRange(salesHeaderRow, 1, 1, salesCols.length)
      .setValues([salesCols])
      .setBackground("#4A86E8")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold");

    const salesDataFormulas = this.buildSalesFormulas(
      transactions, promoColsDef, salesColMap, salesStartRow, salesEndRow, `B${detail1PackagingRow}`
    );
    this.writeMixedRows(sheet, salesStartRow, salesDataFormulas);
    this.buildSalesTotalRow(sheet, salesTotalRow, salesStartRow, salesEndRow, salesColMap, promoColsDef);

    // 6. Bangun Tabel EDIT ORDER
    sheet.getRange(editOrderHeaderRow - 1, 1).setValue("EDIT ORDER").setFontWeight("bold");
    const editOrderHeaders = ["PLU", "Judul Produk", "Qty Beli", "Qty Stok", "Qty Refund"];
    sheet.getRange(editOrderHeaderRow, 1, 1, editOrderHeaders.length)
      .setValues([editOrderHeaders])
      .setBackground("#E06666")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold");

    if (eoLen > 0) {
      sheet.getRange(editOrderStartRow, 1, eoLen, 1).setValues(editOrderSummary.map(it => [Number(it.plu) || it.plu]));
      sheet.getRange(editOrderStartRow, 2, eoLen, 1).setFormulas(editOrderSummary.map((it, i) => [`=IFERROR(VLOOKUP(A${editOrderStartRow + i},'PLU Master'!$B:$C, 2, FALSE),"")`]));
      sheet.getRange(editOrderStartRow, 3, eoLen, 1).setFormulas(editOrderSummary.map((it, i) => [`=SUMIF($B$${salesStartRow}:$B$${salesEndRow},A${editOrderStartRow + i},$E$${salesStartRow}:$E$${salesEndRow})`]));
      sheet.getRange(editOrderStartRow, 4, eoLen, 1).setValues(editOrderSummary.map(it => [it.qtyStok]));
      sheet.getRange(editOrderStartRow, 5, eoLen, 1).setFormulas(editOrderSummary.map((it, i) => [`=C${editOrderStartRow + i}-D${editOrderStartRow + i}`]));
    }

    // 7. Bangun Tabel Detail Transaksi (Order Awal)
    this.buildDetailTransaksi1(sheet, detail1HeaderRow, salesTotalRow, salesStartRow, salesEndRow, promoColsDef, salesColMap, transactions);

    // 8. Bangun Tabel FULFILLMENT SALES
    sheet.getRange(fulfillHeaderRow - 1, 1).setValue("FULFILLMENT SALES").setFontWeight("bold");
    sheet.getRange(fulfillHeaderRow, 1, 1, fulfillCols.length)
      .setValues([fulfillCols])
      .setBackground("#6AA84F")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold");

    const fulfillDataFormulas = this.buildFulfillmentFormulas(
      transactions, promoColsDef, salesColMap, fulfillColMap, fulfillStartRow, fulfillEndRow, salesStartRow, salesEndRow, `B${detail1PackagingRow}`
    );
    this.writeMixedRows(sheet, fulfillStartRow, fulfillDataFormulas);
    this.buildFulfillmentTotalRow(sheet, fulfillTotalRow, fulfillStartRow, fulfillEndRow, fulfillColMap, promoColsDef);

    // 9. Bangun Tabel REFUND
    sheet.getRange(refundHeaderRow - 1, 1).setValue("REFUND").setFontWeight("bold");
    sheet.getRange(refundHeaderRow, 1, 1, refundCols.length)
      .setValues([refundCols])
      .setBackground("#CC0000")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold");

    const refundDataFormulas = this.buildRefundFormulas(
      transactions, promoColsDef, salesColMap, fulfillColMap, refundColMap, refundStartRow, refundEndRow, salesStartRow, fulfillStartRow
    );
    this.writeMixedRows(sheet, refundStartRow, refundDataFormulas);
    this.buildRefundTotalRow(sheet, refundTotalRow, refundStartRow, refundEndRow, fulfillTotalRow, refundColMap, promoColsDef);

    // 10. Bangun Tabel Detail Transaksi (Pemenuhan & Refund)
    this.buildDetailTransaksi2(
      sheet, detail2HeaderRow, fulfillTotalRow, refundTotalRow, fulfillStartRow, fulfillEndRow,
      refundStartRow, refundEndRow, promoColsDef, fulfillColMap, refundColMap, detail1HeaderRow, transactions
    );

    // 11. Format Tampilan (Borders & Number Formats)
    this.applyFormatting(
      sheet, salesStartRow, salesEndRow, salesCols.length, salesColMap,
      fulfillStartRow, fulfillEndRow, fulfillCols.length, fulfillColMap,
      refundStartRow, refundEndRow, refundCols.length, refundColMap,
      detail1HeaderRow, detail2HeaderRow
    );

    return sheet;
  }

  /**
   * Menuliskan matriks 2D yang berisi campuran nilai statis dan formula tanpa saling menimpa.
   */
  writeMixedRows(sheet, startRow, rowsMatrix) {
    if (!rowsMatrix || rowsMatrix.length === 0) return;
    const numRows = rowsMatrix.length;
    const numCols = rowsMatrix[0].length;

    // Di Google Apps Script, setValues() pada Range menerima string yang diawali '=' sebagai formula aktif
    // maupun nilai statis (angka/teks) sekaligus dalam satu panggilan tanpa menghapus satu sama lain.
    sheet.getRange(startRow, 1, numRows, numCols).setValues(rowsMatrix);
  }

  /**
   * Membangun tabel referensi promosi di bagian atas Result sheet.
   * Setiap PLU Syarat pada promo multi-PLU dipecah menjadi sub-baris tersendiri seperti di Result Refference.
   */
  buildPromoTable(sheet, promoStartRow, promoRules) {
    const promoHeaders = [
      "Tipe Promo", "Kode Promo", "Mekanisme Beli", "% Benefit", "Rp Benefit",
      "Poin/Stamp Benefit", "Item Target", "PLU Syarat", "Nama Produk",
      "Campur", "Kelipatan", "Limitasi Max"
    ];

    sheet.getRange(promoStartRow, 1, 1, promoHeaders.length)
      .setValues([promoHeaders])
      .setBackground("#D9D9D9")
      .setFontWeight("bold");

    // Urutkan promo sesuai urutan standar Result Refference:
    // 1. Non Base - Bundling -> 2. Base - Poin -> 3. Base - Stamp -> 4. Base - Upsell ->
    // 5. Base - Harga Coret -> 6. Fair - Potal -> 7. Fair - DAB -> 8. Fair Hadiah ->
    // 9. Fair Tebus Murah -> 10. Non Base - Produk Hadiah -> 11. Fair - Poin ->
    // 12. Cart - Poin -> 13. Fair - Stamp -> 14. Cart - Stamp
    const typeOrder = [
      'Non Base - Bundling',
      'Base - Poin',
      'Base - Stamp',
      'Base - Upsell',
      'Base - Harga Coret',
      'Fair - Potal',
      'Fair - DAB',
      'Fair Hadiah',
      'Fair Tebus Murah',
      'Non Base - Produk Hadiah',
      'Fair - Poin',
      'Cart - Poin',
      'Fair - Stamp',
      'Cart - Stamp'
    ];
    const sortedPromoRules = promoRules.slice().sort((a, b) => {
      const idxA = typeOrder.indexOf(a.getDisplayType());
      const idxB = typeOrder.indexOf(b.getDisplayType());
      const rankA = idxA === -1 ? 99 : idxA;
      const rankB = idxB === -1 ? 99 : idxB;
      return rankA - rankB;
    });

    let currentPromoRow = promoStartRow + 1;
    let lastDisplayedType = '';

    for (const rule of sortedPromoRules) {
      rule.resultRow = currentPromoRow;
      const plus = rule.getPluSyaratList();
      const displayType = rule.getDisplayType();
      const showType = displayType !== lastDisplayedType ? displayType : '';
      lastDisplayedType = displayType;

      const hasQtyMin = rule.qtyMin !== null && !isNaN(rule.qtyMin);
      const hasRpMin = rule.rpMin !== null && !isNaN(rule.rpMin);
      const minVal = hasQtyMin ? rule.qtyMin : (hasRpMin ? rule.rpMin : '-');

      const pctVal = rule.pctBenefit !== null && !isNaN(rule.pctBenefit) ? rule.pctBenefit : '-';
      const rpVal = rule.rpBenefit !== null && !isNaN(rule.rpBenefit) ? rule.rpBenefit : '-';
      const ptVal = rule.ptBenefit !== null && !isNaN(rule.ptBenefit) ? rule.ptBenefit : '-';

      const hasQtyMax = rule.qtyMax !== null && !isNaN(rule.qtyMax);
      const hasRpMax = rule.rpMax !== null && !isNaN(rule.rpMax);
      const maxVal = hasQtyMax ? rule.qtyMax : (hasRpMax ? rule.rpMax : '-');

      const targetVal = rule.targetItem && rule.targetItem !== '-'
        ? (!isNaN(Number(rule.targetItem)) ? Number(rule.targetItem) : rule.targetItem)
        : '-';

      // Daftar PLU yang akan dirender per sub-baris
      const pluRows = rule.isAllPlu() ? ['All PLU'] : (plus.length > 0 ? plus : ['-']);

      for (let idx = 0; idx < pluRows.length; idx++) {
        const singlePlu = pluRows[idx];
        const numericPlu = !isNaN(Number(singlePlu)) ? Number(singlePlu) : singlePlu;

        let prodNameFormulaOrVal = '-';
        if (rule.isAllPlu() || singlePlu === 'All PLU') {
          prodNameFormulaOrVal = 'All Produk';
        } else if (singlePlu !== '-') {
          prodNameFormulaOrVal = `=IFERROR(VLOOKUP(H${currentPromoRow},'PLU Master'!$B:$C, 2, FALSE),"-")`;
        }

        if (idx === 0) {
          const rowVal = [
            showType,
            rule.code || '',
            minVal,
            pctVal,
            rpVal,
            ptVal,
            targetVal,
            numericPlu,
            prodNameFormulaOrVal,
            rule.campur || '-',
            rule.kelipatan || '-',
            maxVal
          ];
          sheet.getRange(currentPromoRow, 1, 1, rowVal.length).setValues([rowVal]);

          // Format sel promo numerik
          if (pctVal !== '-') sheet.getRange(currentPromoRow, 4).setNumberFormat("0%");
          if (rpVal !== '-') sheet.getRange(currentPromoRow, 5).setNumberFormat("Rp#,##0");
          if (hasRpMin) sheet.getRange(currentPromoRow, 3).setNumberFormat("Rp#,##0");
          if (hasRpMax) sheet.getRange(currentPromoRow, 12).setNumberFormat("Rp#,##0");
          if (ptVal !== '-') sheet.getRange(currentPromoRow, 6).setNumberFormat("#,##0");
        } else {
          // Sub-baris untuk PLU ke-2, ke-3, dst.
          const subRowVal = [
            '', '', '', '', '', '', '',
            numericPlu,
            prodNameFormulaOrVal,
            '', '', ''
          ];
          sheet.getRange(currentPromoRow, 1, 1, subRowVal.length).setValues([subRowVal]);
        }

        currentPromoRow++;
      }
      rule.resultEndRow = currentPromoRow - 1;
    }

    return currentPromoRow;
  }

  buildPromoColumnsDefinition(promoRules) {
    return {
      bundling: promoRules.filter(r => r.type.toLowerCase().includes('bundling')),
      phg: promoRules.filter(r => r.type.toLowerCase().includes('phg') || r.type.toLowerCase().includes('produk hadiah')),
      coret: promoRules.filter(r => r.type.toLowerCase().includes('coret')),
      upsell: promoRules.filter(r => r.type.toLowerCase().includes('upsell')),
      fairPotal: promoRules.filter(r => r.type.toLowerCase().includes('potal')),
      fairHadiah: promoRules.filter(r => r.type.toLowerCase().includes('fair') && r.type.toLowerCase().includes('hadiah')),
      fairTmh: promoRules.filter(r => r.type.toLowerCase().includes('tebus murah') || r.type.toLowerCase().includes('tmh')),
      dab: promoRules.filter(r => r.type.toLowerCase().includes('dab') || r.type.toLowerCase().includes('alat bayar')),
      points: promoRules.filter(r => r.type.toLowerCase().includes('poin')),
      stamps: promoRules.filter(r => r.type.toLowerCase().includes('stamp'))
    };
  }

  /**
   * Membangun daftar header sekaligus objek peta huruf kolom dinamis (colMap) untuk masing-masing tabel:
   * mode: 'sales' | 'fulfillment' | 'refund'
   */
  buildTableHeadersAndMap(promoColsDef, mode) {
    const isSales = mode === 'sales';
    const isFulfill = mode === 'fulfillment';
    const isRefund = mode === 'refund';

    const headers = [];
    const colMap = {
      upsell: {},
      fairPotal: {},
      dab: {},
      points: {},
      stamps: {}
    };

    const pushCol = (title, keyPath = null) => {
      headers.push(title);
      const colIdx = headers.length;
      const letter = ResultSheetBuilder.getColLetter(colIdx);
      if (keyPath) {
        colMap[keyPath] = { idx: colIdx, letter };
      }
      return { idx: colIdx, letter };
    };

    pushCol("Paket", "paket");
    pushCol("PLU", "plu");
    pushCol("Judul Produk", "judul");
    pushCol("Harga", "harga");
    pushCol("Qty", "qty");

    if (isFulfill) {
      pushCol("Qty Aktual", "qtyAktual");
    } else if (isRefund) {
      pushCol("Qty Refund", "qtyRefund");
    }

    pushCol("Gross Sales", "gross");
    pushCol("Diskon Karton", "karton");
    pushCol("Net Sales After Karton", "netKarton");

    if (promoColsDef.bundling.length > 0) {
      if (isSales) pushCol("Bundling", "bundlingTotal");
      pushCol("Bundling / PLU", "bundlingPlu");
      pushCol("Net Sales After Bundling", "netBundling");
    }

    if (promoColsDef.phg.length > 0) {
      if (isSales) pushCol("PHG", "phgTotal");
      pushCol("PHG/PLU", "phgPlu");
      pushCol("Net Sales After  PHG", "netPhg");
    }

    if (promoColsDef.coret.length > 0) {
      if (isSales) {
        const coretCodes = promoColsDef.coret.map(r => r.code).slice().reverse().join(', ');
        pushCol(`Harga Coret ${coretCodes}`, "coretTotal");
      }
      pushCol("Harga Coret / PLU", "coretPlu");
      pushCol("Nett Sales After Harga Coret", "netCoret");
    }

    for (const up of promoColsDef.upsell) {
      const total = pushCol(`Upsell ${up.code}`);
      const plu = pushCol("Upsell / PLU");
      const net = pushCol("Net Sales After Upsell");
      colMap.upsell[up.code] = { total, plu, net };
    }

    for (let i = 0; i < promoColsDef.fairPotal.length; i++) {
      const pot = promoColsDef.fairPotal[i];
      const total = pushCol(`Fair Potal ${pot.code}`);
      const plu = pushCol(i === 0 ? "Fair Potal / PLU" : (isSales ? "Fair Potal / PLU" : "Fair Potal/PLU"));
      const net = pushCol(i === 0 || isSales ? "Net Sales After Fair Potal" : `Net Sales After Fair Potal ${i + 1}`);
      colMap.fairPotal[pot.code] = { total, plu, net };
    }

    if (promoColsDef.fairTmh.length > 0 || promoColsDef.fairHadiah.length > 0) {
      if (isSales) pushCol("Fair TMH", "tmhTotal");
      pushCol("Fair TMH/PLU ", "tmhPlu");
      pushCol("Net Sales After Fair TMH", "netTmh");
    }

    for (const d of promoColsDef.dab) {
      const total = pushCol(`Diskon Alat Bayar ${d.code}`);
      const plu = pushCol("Diskon Alat Bayar/PLU");
      const net = pushCol("Net Sales After Diskon Alat Bayar");
      colMap.dab[d.code] = { total, plu, net };
    }

    // Track kolom Net Sales terakhir sebelum Point/Stamp
    colMap.finalNet = {
      idx: headers.length,
      letter: ResultSheetBuilder.getColLetter(headers.length)
    };

    for (const pt of promoColsDef.points) {
      const prefix = pt.type.toLowerCase().includes('fair') ? 'Fair ' : (pt.type.toLowerCase().includes('cart') ? 'Cart ' : '');
      colMap.points[pt.code] = pushCol(`Point Received\n${prefix}${pt.code}`);
    }

    for (const st of promoColsDef.stamps) {
      const prefix = st.type.toLowerCase().includes('fair') ? 'Fair ' : (st.type.toLowerCase().includes('cart') ? 'Cart ' : '');
      colMap.stamps[st.code] = pushCol(`Stamp Received\n${prefix}${st.code}`);
    }

    return { headers, colMap };
  }

  /**
   * Membangun matriks formula untuk tabel SALES (Order Awal).
   */
  buildSalesFormulas(transactions, promoColsDef, salesColMap, startRow, endRow, packagingFeeCell) {
    const formulas = [];
    let lastShownPacket = '';

    for (let i = 0; i < transactions.length; i++) {
      const r = startRow + i;
      const item = transactions[i];
      const rowFormulas = [];

      // Tampilkan nama Paket hanya pada baris pertama untuk Non-Paket dan Bundling yang sama,
      // sedangkan untuk Hadiah PHG, Fair Hadiah, dan Fair Tebus Murah ditampilkan di setiap baris seperti Result Refference
      let pktLabel = item.packet;
      if ((item.isNonPaket() || item.isBundling()) && item.packet === lastShownPacket) {
        pktLabel = '';
      } else {
        lastShownPacket = item.packet;
      }

      // Col A: Paket, Col B: PLU
      rowFormulas.push(pktLabel);
      rowFormulas.push(Number(item.plu) || item.plu);
      // Col C: Judul Produk
      rowFormulas.push(`=IFERROR(VLOOKUP(B${r},'PLU Master'!$B:$C, 2, FALSE),"")`);
      // Col D: Harga
      rowFormulas.push(`=IFERROR(VLOOKUP(B${r},'PLU Master'!$B:$D, 3, FALSE),0)`);
      // Col E: Qty
      rowFormulas.push(item.qtyBeli);
      // Col F: Gross Sales
      rowFormulas.push(`=D${r}*E${r}`);
      // Col G: Diskon Karton
      rowFormulas.push(this.services.kartonan.buildDiskonKartonFormula(`B${r}`, `E${r}`, item.isKarton));
      // Col H: Net After Karton
      rowFormulas.push(this.services.kartonan.buildNetAfterKartonFormula(`F${r}`, `G${r}`));

      let lastNetCol = salesColMap.netKarton.letter;

      // 1. Bundling
      if (promoColsDef.bundling.length > 0) {
        const bundlingTotalCol = salesColMap.bundlingTotal.letter;
        const bundlingPluCol = salesColMap.bundlingPlu.letter;
        const netBundlingCol = salesColMap.netBundling.letter;

        if (item.isBundling()) {
          const pkgRows = [];
          for (let j = 0; j < transactions.length; j++) {
            if (transactions[j].packet === item.packet) pkgRows.push(startRow + j);
          }
          const pkgFirstRow = pkgRows[0];
          const pkgLastRow = pkgRows[pkgRows.length - 1];
          const matchedRule = promoColsDef.bundling.find(b => item.packet.includes(b.code)) || promoColsDef.bundling[0];
          const benefitRef = matchedRule.pctBenefit ? `D${matchedRule.resultRow}` : `E${matchedRule.resultRow}`;

          if (r === pkgFirstRow) {
            rowFormulas.push(this.services.bundling.buildTotalDiscountFormula(matchedRule, benefitRef, `F${pkgFirstRow}:F${pkgLastRow}`));
          } else {
            rowFormulas.push(0);
          }

          const isLast = (r === pkgLastRow);
          const prevRange = `${bundlingPluCol}${pkgFirstRow}:${bundlingPluCol}${r - 1}`;
          rowFormulas.push(this.services.bundling.buildProrateFormula(
            isLast,
            `F${r}`,
            `$F$${pkgFirstRow}:$F$${pkgLastRow}`,
            `$${bundlingTotalCol}$${pkgFirstRow}`,
            prevRange
          ));
        } else {
          rowFormulas.push(0);
          rowFormulas.push(0);
        }
        rowFormulas.push(this.services.bundling.buildNetAfterBundlingFormula(`${lastNetCol}${r}`, `${bundlingPluCol}${r}`));
        lastNetCol = netBundlingCol;
      }

      // 2. PHG
      if (promoColsDef.phg.length > 0) {
        const phgTotalCol = salesColMap.phgTotal.letter;
        const phgPluCol = salesColMap.phgPlu.letter;
        const netPhgCol = salesColMap.netPhg.letter;

        if (item.isPHG()) {
          rowFormulas.push(this.services.phg.buildSalesPHGFormula(`F${r}`));
          rowFormulas.push(`=${phgTotalCol}${r}`);
        } else {
          rowFormulas.push(0);
          rowFormulas.push(0);
        }
        rowFormulas.push(this.services.phg.buildNetAfterPHGFormula(`${lastNetCol}${r}`, `${phgPluCol}${r}`));
        lastNetCol = netPhgCol;
      }

      // 3. Harga Coret (Hanya untuk baris Non-Paket yang PLU-nya terdaftar di Harga Coret)
      if (promoColsDef.coret.length > 0) {
        const coretTotalCol = salesColMap.coretTotal.letter;
        const coretPluCol = salesColMap.coretPlu.letter;
        const netCoretCol = salesColMap.netCoret.letter;

        const matchedCoret = item.isNonPaket()
          ? promoColsDef.coret.find(c => c.getPluSyaratList().includes(item.plu))
          : null;

        if (matchedCoret) {
          const benefitRef = matchedCoret.rpBenefit ? `E${matchedCoret.resultRow}` : `D${matchedCoret.resultRow}`;
          rowFormulas.push(this.services.hargaCoret.buildSalesFormula(
            matchedCoret,
            `E${r}`,
            `F${r}`,
            `C${matchedCoret.resultRow}`,
            benefitRef,
            `L${matchedCoret.resultRow}`
          ));
          rowFormulas.push(`=${coretTotalCol}${r}`);
        } else {
          rowFormulas.push(0);
          rowFormulas.push(item.isNonPaket() || item.isBundling() ? `=${coretTotalCol}${r}` : 0);
        }
        rowFormulas.push(this.services.hargaCoret.buildNetAfterFormula(`${lastNetCol}${r}`, `${coretPluCol}${r}`, false));
        lastNetCol = netCoretCol;
      }

      // 4. Upsell (Hanya untuk baris Non-Paket yang PLU-nya terdaftar di Upsell)
      for (const up of promoColsDef.upsell) {
        const upCols = salesColMap.upsell[up.code];
        const upTotalCol = upCols.total.letter;
        const upPluCol = upCols.plu.letter;
        const netUpCol = upCols.net.letter;

        const isEligible = item.isNonPaket() && up.getPluSyaratList().includes(item.plu);
        const benefitRef = up.rpBenefit ? `E${up.resultRow}` : `D${up.resultRow}`;

        if (up.campur === 'Y') {
          const eligRows = [];
          for (let j = 0; j < transactions.length; j++) {
            if (transactions[j].isNonPaket() && up.getPluSyaratList().includes(transactions[j].plu)) {
              eligRows.push(startRow + j);
            }
          }
          const firstEligRow = eligRows[0];
          const lastEligRow = eligRows[eligRows.length - 1];

          if (r === firstEligRow) {
            rowFormulas.push(this.services.upsell.buildCampurSalesTotalFormula(
              up,
              `E${firstEligRow}:E${lastEligRow}`,
              `${lastNetCol}${firstEligRow}:${lastNetCol}${lastEligRow}`,
              `C${up.resultRow}`,
              benefitRef,
              `L${up.resultRow}`
            ));
          } else {
            rowFormulas.push(0);
          }

          if (isEligible) {
            const isLast = (r === lastEligRow);
            const prevRange = `${upPluCol}${firstEligRow}:${upPluCol}${r - 1}`;
            rowFormulas.push(this.services.upsell.buildCampurProrateFormula(
              isLast,
              `${lastNetCol}${r}`,
              `$${lastNetCol}$${firstEligRow}:$${lastNetCol}$${lastEligRow}`,
              `$${upTotalCol}$${firstEligRow}`,
              prevRange,
              `${upTotalCol}${firstEligRow}`
            ));
          } else {
            rowFormulas.push(0);
          }
        } else {
          // Campur = N
          if (isEligible) {
            rowFormulas.push(this.services.upsell.buildNonCampurSalesTotalFormula(
              up,
              `E${r}`,
              `${lastNetCol}${r}`,
              `C${up.resultRow}`,
              benefitRef,
              `L${up.resultRow}`
            ));
            rowFormulas.push(`=${upTotalCol}${r}`);
          } else {
            rowFormulas.push(0);
            rowFormulas.push(item.isNonPaket() ? `=${upTotalCol}${r}` : 0);
          }
        }

        rowFormulas.push(item.isPHG() ? 0 : this.services.upsell.buildNetAfterFormula(`${lastNetCol}${r}`, `${upPluCol}${r}`, false));
        lastNetCol = netUpCol;
      }

      // 5. Fair Potal (Hanya untuk baris Non-Paket & Bundling yang PLU-nya terdaftar di Fair Potal)
      for (const pot of promoColsDef.fairPotal) {
        const potCols = salesColMap.fairPotal[pot.code];
        const potTotalCol = potCols.total.letter;
        const potPluCol = potCols.plu.letter;
        const netPotCol = potCols.net.letter;

        const eligRows = [];
        for (let j = 0; j < transactions.length; j++) {
          const tx = transactions[j];
          if (tx.isEligibleForFairPotal() && (pot.isAllPlu() || pot.getPluSyaratList().includes(tx.plu))) {
            eligRows.push(startRow + j);
          }
        }
        const firstEligRow = eligRows[0];
        const isEligible = item.isEligibleForFairPotal() && (pot.isAllPlu() || pot.getPluSyaratList().includes(item.plu));
        const benefitRef = pot.rpBenefit ? `E${pot.resultRow}` : `D${pot.resultRow}`;

        if (r === firstEligRow) {
          const eligSum = `SUM(${eligRows.map(idx => `${lastNetCol}${idx}`).join(',')})`;
          rowFormulas.push(this.services.fairPotal.buildSalesTotalFormula(
            pot,
            eligSum,
            `C${pot.resultRow}`,
            benefitRef,
            `L${pot.resultRow}`
          ));
        } else {
          rowFormulas.push(0);
        }

        if (isEligible) {
          const isBalancing = (r === firstEligRow);
          const otherEligRows = eligRows.filter(idx => idx !== firstEligRow);
          const balancingRange = otherEligRows.map(idx => `${potPluCol}${idx}`).join(',');
          const eligSumAbs = `SUM(${eligRows.map(idx => `$${lastNetCol}$${idx}`).join(',')})`;

          rowFormulas.push(this.services.fairPotal.buildProrateFormula(
            isBalancing,
            `${lastNetCol}${r}`,
            eligSumAbs,
            `$${potTotalCol}$${firstEligRow}`,
            balancingRange,
            `${potTotalCol}${firstEligRow}`
          ));
        } else {
          rowFormulas.push(0);
        }

        rowFormulas.push(this.services.fairPotal.buildNetAfterFormula(`${lastNetCol}${r}`, `${potPluCol}${r}`));
        lastNetCol = netPotCol;
      }

      // 6. Fair TMH / Fair Hadiah
      if (promoColsDef.fairTmh.length > 0 || promoColsDef.fairHadiah.length > 0) {
        const tmhTotalCol = salesColMap.tmhTotal.letter;
        const tmhPluCol = salesColMap.tmhPlu.letter;
        const netTmhCol = salesColMap.netTmh.letter;

        if (item.isFairHadiah()) {
          rowFormulas.push(this.services.fairHadiah.buildSalesFormula(`F${r}`));
          rowFormulas.push(`=${tmhTotalCol}${r}`);
        } else if (item.isFairTMH()) {
          const matchedTmh = promoColsDef.fairTmh.find(t => item.packet.includes(t.code) || t.getTargetItemList().includes(item.plu)) || promoColsDef.fairTmh[0];
          rowFormulas.push(this.services.fairTMH.buildSalesFormula(`E${matchedTmh.resultRow}`, `E${r}`, `${lastNetCol}${r}`));
          rowFormulas.push(`=${tmhTotalCol}${r}`);
        } else {
          rowFormulas.push(0);
          rowFormulas.push(0);
        }
        rowFormulas.push(this.services.fairTMH.buildNetAfterFormula(`${lastNetCol}${r}`, `${tmhPluCol}${r}`));
        lastNetCol = netTmhCol;
      }

      // 7. DAB (Diskon Alat Bayar)
      for (const d of promoColsDef.dab) {
        const dabCols = salesColMap.dab[d.code];
        const dabTotalCol = dabCols.total.letter;
        const dabPluCol = dabCols.plu.letter;
        const netDabCol = dabCols.net.letter;

        if (r === startRow) {
          rowFormulas.push(this.services.dab.buildSalesTotalFormula(
            `SUM(${lastNetCol}${startRow}:${lastNetCol}${endRow})`,
            `L${d.resultRow}`,
            `D${d.resultRow}`
          ));
        } else {
          rowFormulas.push(0);
        }

        // Cari baris Non-Paket terakhir sebagai balancing item (seperti AN73 di Result Refference)
        const nonPaketRows = [];
        for (let j = 0; j < transactions.length; j++) {
          if (transactions[j].isNonPaket()) nonPaketRows.push(startRow + j);
        }
        const balancingRow = nonPaketRows.length > 0 ? nonPaketRows[nonPaketRows.length - 1] : startRow;
        const isBalancing = (r === balancingRow);
        let balancingRange = '';
        if (isBalancing) {
          const parts = [];
          if (balancingRow > startRow) parts.push(`${dabPluCol}${startRow}:${dabPluCol}${balancingRow - 1}`);
          if (balancingRow < endRow) parts.push(`${dabPluCol}${balancingRow + 1}:${dabPluCol}${endRow}`);
          balancingRange = parts.join(',');
        }

        rowFormulas.push(this.services.dab.buildSalesProrateFormula(
          isBalancing,
          `${lastNetCol}${r}`,
          `$${lastNetCol}$${startRow}:$${lastNetCol}$${endRow}`,
          `$${dabTotalCol}$${startRow}`,
          balancingRange,
          `${dabTotalCol}${startRow}`
        ));

        rowFormulas.push(this.services.dab.buildNetAfterFormula(`${lastNetCol}${r}`, `${dabPluCol}${r}`));
        lastNetCol = netDabCol;
      }

      const netBeforeDabCol = promoColsDef.fairTmh.length > 0 || promoColsDef.fairHadiah.length > 0
        ? salesColMap.netTmh.letter
        : lastNetCol;

      // 8. Point Received
      for (const pt of promoColsDef.points) {
        const ptType = pt.type.toLowerCase();
        if (ptType.includes('fair')) {
          // Cari baris Non-Paket pertama yang eligible untuk Fair Poin (baris 71 di Result Refference)
          const eligRows = [];
          for (let j = 0; j < transactions.length; j++) {
            if (transactions[j].isNonPaket() && (pt.isAllPlu() || pt.getPluSyaratList().includes(transactions[j].plu))) {
              eligRows.push(startRow + j);
            }
          }
          const firstFairRow = eligRows.length > 0 ? eligRows[0] : startRow;
          if (r === firstFairRow) {
            rowFormulas.push(this.services.pointStamp.buildFairSalesFormula(
              `SUM(${netBeforeDabCol}${firstFairRow}:${netBeforeDabCol}${endRow})`,
              `C${pt.resultRow}`,
              `F${pt.resultRow}`,
              `L${pt.resultRow}`
            ));
          } else {
            rowFormulas.push(0);
          }
        } else if (ptType.includes('cart')) {
          if (r === startRow) {
            rowFormulas.push(this.services.pointStamp.buildCartSalesFormula(
              `SUM(${lastNetCol}${startRow}:${lastNetCol}${endRow})`,
              `C${pt.resultRow}`,
              `F${pt.resultRow}`,
              `L${pt.resultRow}`,
              packagingFeeCell
            ));
          } else {
            rowFormulas.push(0);
          }
        } else {
          // Base Poin (hanya pada baris Non-Paket)
          if (pt.campur === 'Y') {
            const eligRows = [];
            for (let j = 0; j < transactions.length; j++) {
              if (transactions[j].isNonPaket() && pt.getPluSyaratList().includes(transactions[j].plu)) {
                eligRows.push(startRow + j);
              }
            }
            if (eligRows.length > 0 && r === eligRows[0]) {
              rowFormulas.push(this.services.pointStamp.buildBaseCampurSalesFormula(
                `E${eligRows[0]}:E${eligRows[eligRows.length - 1]}`,
                `C${pt.resultRow}`,
                `F${pt.resultRow}`,
                `L${pt.resultRow}`
              ));
            } else {
              rowFormulas.push(0);
            }
          } else {
            if (item.isNonPaket() && pt.getPluSyaratList().includes(item.plu)) {
              rowFormulas.push(this.services.pointStamp.buildBaseNonCampurSalesFormula(
                `E${r}`,
                `C${pt.resultRow}`,
                `F${pt.resultRow}`,
                `L${pt.resultRow}`
              ));
            } else {
              rowFormulas.push(0);
            }
          }
        }
      }

      // 9. Stamp Received
      for (const st of promoColsDef.stamps) {
        const stType = st.type.toLowerCase();
        if (stType.includes('fair')) {
          const eligRows = [];
          for (let j = 0; j < transactions.length; j++) {
            if (transactions[j].isNonPaket() && (st.isAllPlu() || st.getPluSyaratList().includes(transactions[j].plu))) {
              eligRows.push(startRow + j);
            }
          }
          const firstFairRow = eligRows.length > 0 ? eligRows[0] : startRow;
          if (r === firstFairRow) {
            rowFormulas.push(this.services.pointStamp.buildFairSalesFormula(
              `SUM(${netBeforeDabCol}${firstFairRow}:${netBeforeDabCol}${endRow})`,
              `C${st.resultRow}`,
              `F${st.resultRow}`,
              `L${st.resultRow}`
            ));
          } else {
            rowFormulas.push(0);
          }
        } else if (stType.includes('cart')) {
          if (r === startRow) {
            rowFormulas.push(this.services.pointStamp.buildCartSalesFormula(
              `SUM(${lastNetCol}${startRow}:${lastNetCol}${endRow})`,
              `C${st.resultRow}`,
              `F${st.resultRow}`,
              `L${st.resultRow}`,
              packagingFeeCell
            ));
          } else {
            rowFormulas.push(0);
          }
        } else {
          // Base Stamp (hanya pada baris Non-Paket)
          if (st.campur === 'Y') {
            const eligRows = [];
            for (let j = 0; j < transactions.length; j++) {
              if (transactions[j].isNonPaket() && st.getPluSyaratList().includes(transactions[j].plu)) {
                eligRows.push(startRow + j);
              }
            }
            if (eligRows.length > 0 && r === eligRows[0]) {
              rowFormulas.push(this.services.pointStamp.buildBaseCampurSalesFormula(
                `E${eligRows[0]}:E${eligRows[eligRows.length - 1]}`,
                `C${st.resultRow}`,
                `F${st.resultRow}`,
                `L${st.resultRow}`
              ));
            } else {
              rowFormulas.push(0);
            }
          } else {
            if (item.isNonPaket() && st.getPluSyaratList().includes(item.plu)) {
              rowFormulas.push(this.services.pointStamp.buildBaseNonCampurSalesFormula(
                `E${r}`,
                `C${st.resultRow}`,
                `F${st.resultRow}`,
                `L${st.resultRow}`
              ));
            } else {
              rowFormulas.push(0);
            }
          }
        }
      }

      formulas.push(rowFormulas);
    }

    return formulas;
  }

  buildSalesTotalRow(sheet, totalRow, startRow, endRow, salesColMap, promoColsDef) {
    const grossCol = salesColMap.gross.letter;
    sheet.getRange(totalRow, salesColMap.qty.idx).setValue("Total Gross Sales").setFontWeight("bold");
    sheet.getRange(totalRow, salesColMap.gross.idx).setFormula(`=SUM(${grossCol}${startRow}:${grossCol}${endRow})`).setFontWeight("bold");

    const finalNetIdx = salesColMap.finalNet.idx;
    const finalNetLetter = salesColMap.finalNet.letter;

    sheet.getRange(totalRow, finalNetIdx - 1).setValue("Total Net Sales").setFontWeight("bold");
    sheet.getRange(totalRow, finalNetIdx).setFormula(`=SUM(${finalNetLetter}${startRow}:${finalNetLetter}${endRow})`).setFontWeight("bold");

    // Sel kontrol jumlah Net Sales Fair Poin di baris totalRow + 1 (seperti AR90 di Result Refference)
    const fairPt = promoColsDef.points.find(p => p.type.toLowerCase().includes('fair'));
    if (fairPt && salesColMap.points[fairPt.code] && salesColMap.netTmh) {
      const netTmhLetter = salesColMap.netTmh.letter;
      sheet.getRange(totalRow + 1, salesColMap.points[fairPt.code].idx)
        .setFormula(`=SUM(${netTmhLetter}${startRow + 1}:${netTmhLetter}${endRow})`);
    }
  }

  buildDetailTransaksi1(sheet, startRow, salesTotalRow, salesStartRow, salesEndRow, promoColsDef, salesColMap, transactions) {
    sheet.getRange(startRow, 1).setValue("Detail Transaksi ").setFontWeight("bold");
    const grossTotalCell = `${salesColMap.gross.letter}${salesTotalRow}`;

    // Cari batas baris Non-Paket + Bundling vs Hadiah + Tebus Murah
    let baseEndRow = salesEndRow;
    let giftStartRow = salesStartRow;
    for (let j = 0; j < transactions.length; j++) {
      if (transactions[j].isEligibleForFairPotal()) {
        baseEndRow = salesStartRow + j;
      }
      if ((transactions[j].isPHG() || transactions[j].isFairHadiah() || transactions[j].isFairTMH()) && giftStartRow === salesStartRow) {
        giftStartRow = salesStartRow + j;
      }
    }

    // Diskon Base: Bundling/PLU + Harga Coret/PLU + Upsell/PLU + Diskon Karton
    const baseDiscounts = [];
    if (promoColsDef.bundling.length > 0) {
      const col = salesColMap.bundlingPlu.letter;
      baseDiscounts.push(`SUM(${col}${salesStartRow}:${col}${baseEndRow})`);
    }
    if (promoColsDef.coret.length > 0) {
      const col = salesColMap.coretPlu.letter;
      baseDiscounts.push(`SUM(${col}${salesStartRow}:${col}${baseEndRow})`);
    }
    for (const up of promoColsDef.upsell) {
      const col = salesColMap.upsell[up.code].plu.letter;
      baseDiscounts.push(`SUM(${col}${salesStartRow}:${col}${baseEndRow})`);
    }
    const kartonCol = salesColMap.karton.letter;
    baseDiscounts.push(`SUM(${kartonCol}${salesStartRow}:${kartonCol}${baseEndRow})`);

    // Fair Potal: menjumlahkan sel total masing-masing Fair Potal pada baris eligible pertamanya
    const potalDiscounts = [];
    for (const pot of promoColsDef.fairPotal) {
      const potCol = salesColMap.fairPotal[pot.code].total.letter;
      let firstEligRow = salesStartRow;
      for (let j = 0; j < transactions.length; j++) {
        if (transactions[j].isEligibleForFairPotal() && (pot.isAllPlu() || pot.getPluSyaratList().includes(transactions[j].plu))) {
          firstEligRow = salesStartRow + j;
          break;
        }
      }
      potalDiscounts.push(`${potCol}${firstEligRow}`);
    }

    // Diskon Hadiah & Tebus Murah: PHG/PLU + Fair TMH/PLU
    const tmhDiscounts = [];
    if (promoColsDef.phg.length > 0) {
      const col = salesColMap.phgPlu.letter;
      tmhDiscounts.push(`SUM(${col}${giftStartRow}:${col}${salesEndRow})`);
    }
    if (promoColsDef.fairTmh.length > 0 || promoColsDef.fairHadiah.length > 0) {
      const col = salesColMap.tmhPlu.letter;
      tmhDiscounts.push(`SUM(${col}${giftStartRow}:${col}${salesEndRow})`);
    }

    const dabFirstCode = promoColsDef.dab.length > 0 ? promoColsDef.dab[0].code : null;
    const dabCell = dabFirstCode ? `${salesColMap.dab[dabFirstCode].total.letter}${salesStartRow}` : '0';

    const details = [
      ["Total Harga", `=${grossTotalCell}`],
      ["Diskon Base", baseDiscounts.length > 0 ? `=${baseDiscounts.join('+')}` : '=0'],
      ["Fair Potal", potalDiscounts.length > 0 ? `=${potalDiscounts.join('+')}` : '=0'],
      ["Diskon Hadiah & Tebus Murah", tmhDiscounts.length > 0 ? `=${tmhDiscounts.join('+')}` : '=0'],
      ["Total Sebelum DIskon Alat Bayar", `=B${startRow + 1}-B${startRow + 2}-B${startRow + 3}-B${startRow + 4}`],
      ["Diskon Alat Bayar", `=${dabCell}`],
      ["Biaya Pengiriman", 0],
      ["Biaya Plastik / Packaging", 0],
      ["Total Pembayaran", `=B${startRow + 5}-B${startRow + 6}+B${startRow + 7}+B${startRow + 8}`]
    ];

    sheet.getRange(startRow + 1, 1, details.length, 2).setValues(details);
    sheet.getRange(startRow + details.length, 1, 1, 2).setFontWeight("bold");
    return startRow + details.length;
  }

  /**
   * Membangun matriks formula untuk tabel FULFILLMENT SALES (Order Aktual).
   */
  buildFulfillmentFormulas(transactions, promoColsDef, salesColMap, fulfillColMap, fulfillStartRow, fulfillEndRow, salesStartRow, salesEndRow, packagingFeeCell) {
    const formulas = [];
    let lastShownPacket = '';

    for (let i = 0; i < transactions.length; i++) {
      const fr = fulfillStartRow + i;
      const sr = salesStartRow + i;
      const item = transactions[i];
      const rowFormulas = [];

      let pktLabel = item.isBundling() ? 'Bundling' : item.packet;
      if ((item.isNonPaket() || item.isBundling()) && item.packet === lastShownPacket) {
        pktLabel = '';
      } else {
        lastShownPacket = item.packet;
      }

      // Col A: Paket, Col B: PLU (=B70), Col C: Judul (=C70), Col D: Harga (=D70), Col E: Qty (=E70), Col F: Qty Aktual
      rowFormulas.push(pktLabel);
      rowFormulas.push(`=B${sr}`);
      rowFormulas.push(`=C${sr}`);
      rowFormulas.push(`=D${sr}`);
      rowFormulas.push(`=E${sr}`);
      rowFormulas.push(item.qtyAktual);
      // Col G: Gross Sales (=D114*F114)
      rowFormulas.push(`=D${fr}*F${fr}`);
      // Col H: Diskon Karton
      rowFormulas.push(this.services.kartonan.buildDiskonKartonFormula(`B${fr}`, `F${fr}`, item.isKarton));
      // Col I: Net Sales After Karton (=G114-H114)
      rowFormulas.push(this.services.kartonan.buildNetAfterKartonFormula(`G${fr}`, `H${fr}`));

      let lastNetCol = fulfillColMap.netKarton.letter;

      // 1. Bundling / PLU
      if (promoColsDef.bundling.length > 0) {
        const sBundlingPluCol = salesColMap.bundlingPlu.letter;
        const fBundlingPluCol = fulfillColMap.bundlingPlu.letter;
        const fNetBundlingCol = fulfillColMap.netBundling.letter;

        if (item.isBundling()) {
          rowFormulas.push(this.services.bundling.buildFulfillmentBundlingFormula(`F${fr}`, `E${sr}`, `${sBundlingPluCol}${sr}`, true));
        } else if (item.isNonPaket()) {
          rowFormulas.push(this.services.bundling.buildFulfillmentBundlingFormula(`F${fr}`, `E${sr}`, `${sBundlingPluCol}${sr}`, false));
        } else {
          rowFormulas.push(0);
        }
        rowFormulas.push(this.services.bundling.buildNetAfterBundlingFormula(`${lastNetCol}${fr}`, `${fBundlingPluCol}${fr}`));
        lastNetCol = fNetBundlingCol;
      }

      // 2. PHG / PLU
      if (promoColsDef.phg.length > 0) {
        const sPhgPluCol = salesColMap.phgPlu.letter;
        const fPhgPluCol = fulfillColMap.phgPlu.letter;
        const fNetPhgCol = fulfillColMap.netPhg.letter;

        if (item.isPHG()) {
          rowFormulas.push(this.services.phg.buildFulfillmentPHGFormula(`G${fr}`, `${sPhgPluCol}${sr}`, true));
        } else if (item.isEligibleForFairPotal()) {
          rowFormulas.push(this.services.phg.buildFulfillmentPHGFormula(`G${fr}`, `${sPhgPluCol}${sr}`, false));
        } else {
          rowFormulas.push(0);
        }
        rowFormulas.push(this.services.phg.buildNetAfterPHGFormula(`${lastNetCol}${fr}`, `${fPhgPluCol}${fr}`));
        lastNetCol = fNetPhgCol;
      }

      // 3. Harga Coret / PLU
      if (promoColsDef.coret.length > 0) {
        const sCoretPluCol = salesColMap.coretPlu.letter;
        const fCoretPluCol = fulfillColMap.coretPlu.letter;
        const fNetCoretCol = fulfillColMap.netCoret.letter;

        const matchedCoret = item.isNonPaket()
          ? promoColsDef.coret.find(c => c.getPluSyaratList().includes(item.plu))
          : null;

        if (matchedCoret) {
          const benefitRef = matchedCoret.rpBenefit ? `E${matchedCoret.resultRow}` : `D${matchedCoret.resultRow}`;
          rowFormulas.push(this.services.hargaCoret.buildFulfillmentFormula(
            matchedCoret, `F${fr}`, `G${fr}`, `C${matchedCoret.resultRow}`, benefitRef, `L${matchedCoret.resultRow}`
          ));
        } else if (item.isNonPaket() || item.isFairTMH()) {
          rowFormulas.push(this.services.hargaCoret.buildFulfillmentProportionalFormula(`F${fr}`, `${sCoretPluCol}${sr}`, `E${sr}`, false));
        } else if (item.isBundling()) {
          rowFormulas.push(this.services.hargaCoret.buildFulfillmentProportionalFormula(`F${fr}`, `${sCoretPluCol}${sr}`, `E${sr}`, true));
        } else {
          rowFormulas.push(0);
        }

        const useMaxZero = item.isEligibleForFairPotal();
        rowFormulas.push(this.services.hargaCoret.buildNetAfterFormula(`${lastNetCol}${fr}`, `${fCoretPluCol}${fr}`, useMaxZero));
        lastNetCol = fNetCoretCol;
      }

      // 4. Upsell
      for (const up of promoColsDef.upsell) {
        const sUpCols = salesColMap.upsell[up.code];
        const fUpCols = fulfillColMap.upsell[up.code];
        const fUpTotalCol = fUpCols.total.letter;
        const fUpPluCol = fUpCols.plu.letter;
        const fNetUpCol = fUpCols.net.letter;

        const isEligible = item.isNonPaket() && up.getPluSyaratList().includes(item.plu);

        if (up.campur === 'Y') {
          const eligRowsF = [];
          const eligRowsS = [];
          for (let j = 0; j < transactions.length; j++) {
            if (transactions[j].isNonPaket() && up.getPluSyaratList().includes(transactions[j].plu)) {
              eligRowsF.push(fulfillStartRow + j);
              eligRowsS.push(salesStartRow + j);
            }
          }
          const firstEligF = eligRowsF[0];
          const lastEligF = eligRowsF[eligRowsF.length - 1];
          const firstEligS = eligRowsS[0];
          const lastEligS = eligRowsS[eligRowsS.length - 1];

          if (fr === firstEligF) {
            rowFormulas.push(this.services.upsell.buildCampurFulfillmentTotalFormula(
              `F${firstEligF}:F${lastEligF}`,
              `E${firstEligS}:E${lastEligS}`,
              `${sUpCols.total.letter}${firstEligS}`,
              `C${up.resultRow}`,
              `L${up.resultRow}`
            ));
          } else {
            rowFormulas.push(0);
          }

          if (isEligible) {
            const isLast = (fr === lastEligF);
            const prevRange = `${fUpPluCol}${firstEligF}:${fUpPluCol}${fr - 1}`;
            rowFormulas.push(this.services.upsell.buildCampurProrateFormula(
              isLast,
              `${lastNetCol}${fr}`,
              `$${lastNetCol}$${firstEligF}:$${lastNetCol}$${lastEligF}`,
              `$${fUpTotalCol}$${firstEligF}`,
              prevRange,
              `${fUpTotalCol}${firstEligF}`
            ));
          } else {
            rowFormulas.push(0);
          }
        } else {
          // Campur = N
          if (isEligible) {
            rowFormulas.push(this.services.upsell.buildNonCampurFulfillmentFormula(
              `F${fr}`, `E${sr}`, `${sUpCols.total.letter}${sr}`, `C${up.resultRow}`, `L${up.resultRow}`
            ));
            rowFormulas.push(`=${fUpTotalCol}${fr}`);
          } else {
            rowFormulas.push(0);
            rowFormulas.push(item.isNonPaket() ? `=${fUpTotalCol}${fr}` : 0);
          }
        }

        const useMaxZero = item.isEligibleForFairPotal();
        rowFormulas.push(item.isPHG() ? 0 : this.services.upsell.buildNetAfterFormula(`${lastNetCol}${fr}`, `${fUpPluCol}${fr}`, useMaxZero));
        lastNetCol = fNetUpCol;
      }

      // 5. Fair Potal
      for (const pot of promoColsDef.fairPotal) {
        const sPotCols = salesColMap.fairPotal[pot.code];
        const fPotCols = fulfillColMap.fairPotal[pot.code];
        const fPotTotalCol = fPotCols.total.letter;
        const fPotPluCol = fPotCols.plu.letter;
        const fNetPotCol = fPotCols.net.letter;

        const eligRowsF = [];
        const eligRowsS = [];
        for (let j = 0; j < transactions.length; j++) {
          const tx = transactions[j];
          if (tx.isEligibleForFairPotal() && (pot.isAllPlu() || pot.getPluSyaratList().includes(tx.plu))) {
            eligRowsF.push(fulfillStartRow + j);
            eligRowsS.push(salesStartRow + j);
          }
        }
        const firstEligF = eligRowsF[0];
        const firstEligS = eligRowsS[0];
        const isEligible = item.isEligibleForFairPotal() && (pot.isAllPlu() || pot.getPluSyaratList().includes(item.plu));

        // Di Result Refference, setiap Fair Potal menghitung kelayakan dari Net Sales After Upsell terakhir
        const netAfterUpsellCol = promoColsDef.upsell.length > 0
          ? fulfillColMap.upsell[promoColsDef.upsell[promoColsDef.upsell.length - 1].code].net.letter
          : lastNetCol;

        if (fr === firstEligF) {
          const eligSumF = `SUM(${eligRowsF.map(idx => `${netAfterUpsellCol}${idx}`).join(',')})`;
          rowFormulas.push(this.services.fairPotal.buildFulfillmentTotalFormula(
            eligSumF,
            `L${pot.resultRow}`,
            `${sPotCols.total.letter}${firstEligS}`
          ));
        } else {
          rowFormulas.push(0);
        }

        if (isEligible) {
          const isBalancing = (fr === firstEligF);
          const otherEligRows = eligRowsF.filter(idx => idx !== firstEligF);
          const balancingRange = otherEligRows.map(idx => `${fPotPluCol}${idx}`).join(',');
          const eligSumAbs = `SUM(${eligRowsF.map(idx => `$${netAfterUpsellCol}$${idx}`).join(',')})`;

          rowFormulas.push(this.services.fairPotal.buildFulfillmentProrateFormula(
            isBalancing,
            `${netAfterUpsellCol}${fr}`,
            eligSumAbs,
            `$${fPotTotalCol}$${firstEligF}`,
            balancingRange,
            `${fPotTotalCol}${firstEligF}`
          ));
        } else {
          rowFormulas.push(0);
        }

        rowFormulas.push(this.services.fairPotal.buildNetAfterFormula(`${lastNetCol}${fr}`, `${fPotPluCol}${fr}`));
        lastNetCol = fNetPotCol;
      }

      // 6. Fair TMH / Fair Hadiah
      if (promoColsDef.fairTmh.length > 0 || promoColsDef.fairHadiah.length > 0) {
        const sTmhPluCol = salesColMap.tmhPlu.letter;
        const fTmhPluCol = fulfillColMap.tmhPlu.letter;
        const fNetTmhCol = fulfillColMap.netTmh.letter;

        if (item.isFairHadiah()) {
          rowFormulas.push(this.services.fairHadiah.buildFulfillmentFormula(`${lastNetCol}${fr}`));
        } else {
          rowFormulas.push(this.services.fairTMH.buildFulfillmentFormula(`F${fr}`, `${sTmhPluCol}${sr}`, `E${sr}`, item.isBundling()));
        }
        rowFormulas.push(this.services.fairTMH.buildNetAfterFormula(`${lastNetCol}${fr}`, `${fTmhPluCol}${fr}`));
        lastNetCol = fNetTmhCol;
      }

      // 7. DAB
      for (const d of promoColsDef.dab) {
        const sDabCols = salesColMap.dab[d.code];
        const fDabCols = fulfillColMap.dab[d.code];
        const fDabTotalCol = fDabCols.total.letter;
        const fDabPluCol = fDabCols.plu.letter;
        const fNetDabCol = fDabCols.net.letter;
        const sNetBeforeDabCol = salesColMap.netTmh ? salesColMap.netTmh.letter : salesColMap.finalNet.letter;

        if (fr === fulfillStartRow) {
          rowFormulas.push(this.services.dab.buildFulfillmentTotalFormula(
            `SUM(${lastNetCol}${fulfillStartRow}:${lastNetCol}${fulfillEndRow})`,
            `C${d.resultRow}`,
            `L${d.resultRow}`,
            `SUM(${sNetBeforeDabCol}${salesStartRow}:${sNetBeforeDabCol}${salesEndRow})`,
            `${sDabCols.total.letter}${salesStartRow}`
          ));
        } else {
          rowFormulas.push(0);
        }

        const isBalancing = (fr === fulfillStartRow);
        const balancingRange = `${fDabPluCol}${fulfillStartRow + 1}:${fDabPluCol}${fulfillEndRow}`;

        rowFormulas.push(this.services.dab.buildFulfillmentProrateFormula(
          isBalancing,
          `${lastNetCol}${fr}`,
          `$${lastNetCol}$${fulfillStartRow}:$${lastNetCol}$${fulfillEndRow}`,
          `$${fDabTotalCol}$${fulfillStartRow}`,
          balancingRange,
          `${fDabTotalCol}${fulfillStartRow}`
        ));

        rowFormulas.push(this.services.dab.buildNetAfterFormula(`${lastNetCol}${fr}`, `${fDabPluCol}${fr}`));
        lastNetCol = fNetDabCol;
      }

      const fNetBeforeDabCol = promoColsDef.fairTmh.length > 0 || promoColsDef.fairHadiah.length > 0
        ? fulfillColMap.netTmh.letter
        : lastNetCol;

      // 8. Point Received (Fulfillment)
      for (const pt of promoColsDef.points) {
        const ptType = pt.type.toLowerCase();
        const sPtCol = salesColMap.points[pt.code].letter;

        if (ptType.includes('fair')) {
          const eligRowsF = [];
          for (let j = 0; j < transactions.length; j++) {
            if (transactions[j].isNonPaket() && (pt.isAllPlu() || pt.getPluSyaratList().includes(transactions[j].plu))) {
              eligRowsF.push(fulfillStartRow + j);
            }
          }
          const firstFairF = eligRowsF.length > 0 ? eligRowsF[0] : fulfillStartRow;
          if (fr === firstFairF) {
            rowFormulas.push(this.services.pointStamp.buildFairFulfillmentFormula(
              `SUM(${fNetBeforeDabCol}${firstFairF}:${fNetBeforeDabCol}${fulfillEndRow})`,
              `C${pt.resultRow}`,
              `F${pt.resultRow}`,
              `L${pt.resultRow}`
            ));
          } else {
            rowFormulas.push(0);
          }
        } else if (ptType.includes('cart')) {
          if (fr === fulfillStartRow) {
            rowFormulas.push(this.services.pointStamp.buildCartFulfillmentFormula(
              `SUM(${lastNetCol}${fulfillStartRow}:${lastNetCol}${fulfillEndRow})`,
              `C${pt.resultRow}`,
              `F${pt.resultRow}`,
              `L${pt.resultRow}`,
              packagingFeeCell
            ));
          } else {
            rowFormulas.push(0);
          }
        } else {
          // Base Poin
          if (pt.campur === 'Y') {
            const eligRowsF = [];
            const eligRowsS = [];
            for (let j = 0; j < transactions.length; j++) {
              if (transactions[j].isNonPaket() && pt.getPluSyaratList().includes(transactions[j].plu)) {
                eligRowsF.push(fulfillStartRow + j);
                eligRowsS.push(salesStartRow + j);
              }
            }
            if (eligRowsF.length > 0 && fr === eligRowsF[0]) {
              rowFormulas.push(this.services.pointStamp.buildBaseCampurFulfillmentFormula(
                `F${eligRowsF[0]}:F${eligRowsF[eligRowsF.length - 1]}`,
                `E${eligRowsS[0]}:E${eligRowsS[eligRowsS.length - 1]}`,
                `C${pt.resultRow}`,
                `L${pt.resultRow}`,
                `${sPtCol}${eligRowsS[0]}`
              ));
            } else {
              rowFormulas.push(0);
            }
          } else {
            if (item.isNonPaket() && pt.getPluSyaratList().includes(item.plu)) {
              rowFormulas.push(this.services.pointStamp.buildBaseNonCampurFulfillmentFormula(
                `F${fr}`, `E${sr}`, `C${pt.resultRow}`, `L${pt.resultRow}`, `${sPtCol}${sr}`
              ));
            } else {
              rowFormulas.push(0);
            }
          }
        }
      }

      // 9. Stamp Received (Fulfillment)
      for (const st of promoColsDef.stamps) {
        const stType = st.type.toLowerCase();

        if (stType.includes('fair')) {
          const eligRowsF = [];
          for (let j = 0; j < transactions.length; j++) {
            if (transactions[j].isNonPaket() && (st.isAllPlu() || st.getPluSyaratList().includes(transactions[j].plu))) {
              eligRowsF.push(fulfillStartRow + j);
            }
          }
          const firstFairF = eligRowsF.length > 0 ? eligRowsF[0] : fulfillStartRow;
          if (fr === firstFairF) {
            rowFormulas.push(this.services.pointStamp.buildFairFulfillmentFormula(
              `SUM(${fNetBeforeDabCol}${firstFairF}:${fNetBeforeDabCol}${fulfillEndRow})`,
              `C${st.resultRow}`,
              `F${st.resultRow}`,
              `L${st.resultRow}`
            ));
          } else {
            rowFormulas.push(0);
          }
        } else if (stType.includes('cart')) {
          if (fr === fulfillStartRow) {
            rowFormulas.push(this.services.pointStamp.buildCartFulfillmentFormula(
              `SUM(${lastNetCol}${fulfillStartRow}:${lastNetCol}${fulfillEndRow})`,
              `C${st.resultRow}`,
              `F${st.resultRow}`,
              `L${st.resultRow}`
            ));
          } else {
            rowFormulas.push(0);
          }
        } else {
          // Base Stamp
          if (st.campur === 'Y') {
            const eligRowsF = [];
            for (let j = 0; j < transactions.length; j++) {
              if (transactions[j].isNonPaket() && st.getPluSyaratList().includes(transactions[j].plu)) {
                eligRowsF.push(fulfillStartRow + j);
              }
            }
            if (eligRowsF.length > 0 && fr === eligRowsF[0]) {
              rowFormulas.push(this.services.pointStamp.buildBaseStampFulfillmentFormula(
                `F${eligRowsF[0]}:F${eligRowsF[eligRowsF.length - 1]}`,
                `C${st.resultRow}`,
                `F${st.resultRow}`,
                `L${st.resultRow}`
              ));
            } else {
              rowFormulas.push(0);
            }
          } else {
            if (item.isNonPaket() && st.getPluSyaratList().includes(item.plu)) {
              rowFormulas.push(this.services.pointStamp.buildBaseStampFulfillmentFormula(
                `F${fr}`, `C${st.resultRow}`, `F${st.resultRow}`, `L${st.resultRow}`
              ));
            } else {
              rowFormulas.push(0);
            }
          }
        }
      }

      formulas.push(rowFormulas);
    }

    return formulas;
  }

  buildFulfillmentTotalRow(sheet, totalRow, startRow, endRow, fulfillColMap, promoColsDef) {
    const grossCol = fulfillColMap.gross.letter;
    sheet.getRange(totalRow, fulfillColMap.qtyAktual.idx).setValue("Total Gross Sales").setFontWeight("bold");
    sheet.getRange(totalRow, fulfillColMap.gross.idx).setFormula(`=SUM(${grossCol}${startRow}:${grossCol}${endRow})`).setFontWeight("bold");

    const finalNetIdx = fulfillColMap.finalNet.idx;
    const finalNetLetter = fulfillColMap.finalNet.letter;

    sheet.getRange(totalRow, finalNetIdx - 1).setValue("Total Net Sales").setFontWeight("bold");
    sheet.getRange(totalRow, finalNetIdx).setFormula(`=SUM(${finalNetLetter}${startRow}:${finalNetLetter}${endRow})`).setFontWeight("bold");

    // Jumlahkan seluruh kolom Point Received & Stamp Received di baris Total Fulfillment (baris 133 di Result Refference)
    for (const pt of promoColsDef.points) {
      const colObj = fulfillColMap.points[pt.code];
      sheet.getRange(totalRow, colObj.idx).setFormula(`=SUM(${colObj.letter}${startRow}:${colObj.letter}${endRow})`).setFontWeight("bold");
    }
    for (const st of promoColsDef.stamps) {
      const colObj = fulfillColMap.stamps[st.code];
      sheet.getRange(totalRow, colObj.idx).setFormula(`=SUM(${colObj.letter}${startRow}:${colObj.letter}${endRow})`).setFontWeight("bold");
    }

    // Sel kontrol jumlah Net Sales Fair Poin di baris totalRow + 1 (seperti AO134 di Result Refference)
    const fairPt = promoColsDef.points.find(p => p.type.toLowerCase().includes('fair'));
    if (fairPt && fulfillColMap.points[fairPt.code] && fulfillColMap.netTmh) {
      const netTmhLetter = fulfillColMap.netTmh.letter;
      sheet.getRange(totalRow + 1, fulfillColMap.points[fairPt.code].idx)
        .setFormula(`=SUM(${netTmhLetter}${startRow + 1}:${netTmhLetter}${endRow})`);
    }
  }

  /**
   * Membangun matriks formula untuk tabel REFUND (Selisih Order Awal - Pemenuhan).
   */
  buildRefundFormulas(transactions, promoColsDef, salesColMap, fulfillColMap, refundColMap, refundStartRow, refundEndRow, salesStartRow, fulfillStartRow) {
    const formulas = [];
    let lastShownPacket = '';

    for (let i = 0; i < transactions.length; i++) {
      const rr = refundStartRow + i;
      const sr = salesStartRow + i;
      const fr = fulfillStartRow + i;
      const item = transactions[i];
      const rowFormulas = [];

      let pktLabel = item.isBundling() ? 'Bundling' : item.packet;
      if ((item.isNonPaket() || item.isBundling()) && item.packet === lastShownPacket) {
        pktLabel = '';
      } else {
        lastShownPacket = item.packet;
      }

      // Col A: Paket, Col B: PLU, Col C: Judul, Col D: Harga, Col E: Qty, Col F: Qty Refund
      rowFormulas.push(pktLabel);
      rowFormulas.push(`=B${sr}`);
      rowFormulas.push(`=C${sr}`);
      rowFormulas.push(`=D${sr}`);
      rowFormulas.push(`=E${sr}`);
      rowFormulas.push(`=E${rr}-F${fr}`);
      // Col G: Gross Sales (=D137*F137)
      rowFormulas.push(`=D${rr}*F${rr}`);
      // Col H: Diskon Karton (=G70-H114)
      rowFormulas.push(this.services.kartonan.buildRefundKartonFormula(`${salesColMap.karton.letter}${sr}`, `${fulfillColMap.karton.letter}${fr}`));
      // Col I: Net Sales After Karton (=G137-H137)
      rowFormulas.push(this.services.kartonan.buildNetAfterKartonFormula(`G${rr}`, `H${rr}`));

      let lastNetCol = refundColMap.netKarton.letter;

      // 1. Bundling / PLU
      if (promoColsDef.bundling.length > 0) {
        const sCol = salesColMap.bundlingPlu.letter;
        const fCol = fulfillColMap.bundlingPlu.letter;
        const rCol = refundColMap.bundlingPlu.letter;
        const rNetCol = refundColMap.netBundling.letter;

        rowFormulas.push(this.services.bundling.buildRefundBundlingFormula(`${sCol}${sr}`, `${fCol}${fr}`));
        rowFormulas.push(this.services.bundling.buildNetAfterBundlingFormula(`${lastNetCol}${rr}`, `${rCol}${rr}`));
        lastNetCol = rNetCol;
      }

      // 2. PHG / PLU
      if (promoColsDef.phg.length > 0) {
        const sCol = salesColMap.phgPlu.letter;
        const fCol = fulfillColMap.phgPlu.letter;
        const rCol = refundColMap.phgPlu.letter;
        const rNetCol = refundColMap.netPhg.letter;

        rowFormulas.push(this.services.phg.buildRefundPHGFormula(`${sCol}${sr}`, `${fCol}${fr}`));
        rowFormulas.push(this.services.phg.buildNetAfterPHGFormula(`${lastNetCol}${rr}`, `${rCol}${rr}`));
        lastNetCol = rNetCol;
      }

      // 3. Harga Coret / PLU
      if (promoColsDef.coret.length > 0) {
        const sCol = salesColMap.coretTotal.letter;
        const fCol = fulfillColMap.coretPlu.letter;
        const rCol = refundColMap.coretPlu.letter;
        const rNetCol = refundColMap.netCoret.letter;

        rowFormulas.push(this.services.hargaCoret.buildRefundFormula(`${sCol}${sr}`, `${fCol}${fr}`));
        rowFormulas.push(this.services.hargaCoret.buildNetAfterFormula(`${lastNetCol}${rr}`, `${rCol}${rr}`, true));
        lastNetCol = rNetCol;
      }

      // 4. Upsell
      for (const up of promoColsDef.upsell) {
        const sUpCols = salesColMap.upsell[up.code];
        const fUpCols = fulfillColMap.upsell[up.code];
        const rUpCols = refundColMap.upsell[up.code];
        const rUpTotalCol = rUpCols.total.letter;
        const rUpPluCol = rUpCols.plu.letter;
        const rNetUpCol = rUpCols.net.letter;

        // Kolom Total Upsell di Refund: =SalesUpsellTotal - FulfillUpsellTotal
        rowFormulas.push(this.services.upsell.buildRefundTotalFormula(`${sUpCols.total.letter}${sr}`, `${fUpCols.total.letter}${fr}`));

        const isEligible = item.isNonPaket() && up.getPluSyaratList().includes(item.plu);
        if (up.campur === 'Y') {
          const eligRowsR = [];
          for (let j = 0; j < transactions.length; j++) {
            if (transactions[j].isNonPaket() && up.getPluSyaratList().includes(transactions[j].plu)) {
              eligRowsR.push(refundStartRow + j);
            }
          }
          const firstEligR = eligRowsR[0];
          const lastEligR = eligRowsR[eligRowsR.length - 1];

          if (isEligible) {
            const isLast = (rr === lastEligR);
            const prevRange = `${rUpPluCol}${firstEligR}:${rUpPluCol}${rr - 1}`;
            rowFormulas.push(this.services.upsell.buildRefundCampurProrateFormula(
              isLast,
              `${lastNetCol}${rr}`,
              `$${lastNetCol}$${firstEligR}:$${lastNetCol}$${lastEligR}`,
              `$${rUpTotalCol}$${firstEligR}`,
              prevRange,
              `${rUpTotalCol}${firstEligR}`
            ));
          } else {
            rowFormulas.push(0);
          }
        } else {
          // Campur = N
          rowFormulas.push(item.isNonPaket() ? `=${rUpTotalCol}${rr}` : 0);
        }

        const useMaxZero = item.isEligibleForFairPotal();
        rowFormulas.push(this.services.upsell.buildNetAfterFormula(`${lastNetCol}${rr}`, `${rUpPluCol}${rr}`, useMaxZero));
        lastNetCol = rNetUpCol;
      }

      // 5. Fair Potal
      for (const pot of promoColsDef.fairPotal) {
        const sPotCols = salesColMap.fairPotal[pot.code];
        const fPotCols = fulfillColMap.fairPotal[pot.code];
        const rPotCols = refundColMap.fairPotal[pot.code];
        const rPotTotalCol = rPotCols.total.letter;
        const rPotPluCol = rPotCols.plu.letter;
        const rNetPotCol = rPotCols.net.letter;

        const eligRowsR = [];
        for (let j = 0; j < transactions.length; j++) {
          const tx = transactions[j];
          if (tx.isEligibleForFairPotal() && (pot.isAllPlu() || pot.getPluSyaratList().includes(tx.plu))) {
            eligRowsR.push(refundStartRow + j);
          }
        }
        const firstEligR = eligRowsR[0];
        const isEligible = item.isEligibleForFairPotal() && (pot.isAllPlu() || pot.getPluSyaratList().includes(item.plu));

        // Kolom Total Fair Potal di Refund: =SalesTotal - FulfillTotal
        rowFormulas.push(this.services.fairPotal.buildRefundTotalFormula(`${sPotCols.total.letter}${sr}`, `${fPotCols.total.letter}${fr}`));

        const netAfterUpsellCol = promoColsDef.upsell.length > 0
          ? refundColMap.upsell[promoColsDef.upsell[promoColsDef.upsell.length - 1].code].net.letter
          : lastNetCol;

        if (isEligible) {
          const isBalancing = (rr === firstEligR);
          const otherEligRows = eligRowsR.filter(idx => idx !== firstEligR);
          const balancingRange = otherEligRows.map(idx => `${rPotPluCol}${idx}`).join(',');
          const eligSumAbs = `SUM(${eligRowsR.map(idx => `$${netAfterUpsellCol}$${idx}`).join(',')})`;

          rowFormulas.push(this.services.fairPotal.buildRefundProrateFormula(
            isBalancing,
            `${netAfterUpsellCol}${rr}`,
            eligSumAbs,
            `$${rPotTotalCol}$${firstEligR}`,
            balancingRange,
            `${rPotTotalCol}${firstEligR}`
          ));
        } else {
          rowFormulas.push(0);
        }

        rowFormulas.push(this.services.fairPotal.buildNetAfterFormula(`${lastNetCol}${rr}`, `${rPotPluCol}${rr}`));
        lastNetCol = rNetPotCol;
      }

      // 6. Fair TMH / Fair Hadiah
      if (promoColsDef.fairTmh.length > 0 || promoColsDef.fairHadiah.length > 0) {
        const sTmhPluCol = salesColMap.tmhPlu.letter;
        const fTmhPluCol = fulfillColMap.tmhPlu.letter;
        const rTmhPluCol = refundColMap.tmhPlu.letter;
        const rNetTmhCol = refundColMap.netTmh.letter;

        rowFormulas.push(this.services.fairTMH.buildRefundFormula(`${sTmhPluCol}${sr}`, `${fTmhPluCol}${fr}`));
        rowFormulas.push(this.services.fairTMH.buildNetAfterFormula(`${lastNetCol}${rr}`, `${rTmhPluCol}${rr}`));
        lastNetCol = rNetTmhCol;
      }

      // 7. DAB
      for (const d of promoColsDef.dab) {
        const sDabCols = salesColMap.dab[d.code];
        const fDabCols = fulfillColMap.dab[d.code];
        const rDabCols = refundColMap.dab[d.code];
        const rDabTotalCol = rDabCols.total.letter;
        const rDabPluCol = rDabCols.plu.letter;
        const rNetDabCol = rDabCols.net.letter;

        if (rr === refundStartRow) {
          rowFormulas.push(this.services.dab.buildRefundTotalFormula(
            `${sDabCols.total.letter}${salesStartRow}`,
            `${fDabCols.total.letter}${fulfillStartRow}`
          ));
        } else {
          rowFormulas.push(0);
        }

        const isBalancing = (rr === refundStartRow);
        const balancingRange = `${rDabPluCol}${refundStartRow + 1}:${rDabPluCol}${refundEndRow}`;

        rowFormulas.push(this.services.dab.buildRefundProrateFormula(
          isBalancing,
          `${lastNetCol}${rr}`,
          `$${lastNetCol}$${refundStartRow}:$${lastNetCol}$${refundEndRow}`,
          `$${rDabTotalCol}$${refundStartRow}`,
          balancingRange,
          `${rDabTotalCol}${refundStartRow}`
        ));

        rowFormulas.push(this.services.dab.buildNetAfterFormula(`${lastNetCol}${rr}`, `${rDabPluCol}${rr}`));
        lastNetCol = rNetDabCol;
      }

      // 8. Point Received (Refund: Sales - Fulfillment)
      for (const pt of promoColsDef.points) {
        const sPtCol = salesColMap.points[pt.code].letter;
        const fPtCol = fulfillColMap.points[pt.code].letter;
        rowFormulas.push(this.services.pointStamp.buildRefundFormula(`${sPtCol}${sr}`, `${fPtCol}${fr}`));
      }

      // 9. Stamp Received (Refund: Sales - Fulfillment)
      for (const st of promoColsDef.stamps) {
        const sStCol = salesColMap.stamps[st.code].letter;
        const fStCol = fulfillColMap.stamps[st.code].letter;
        rowFormulas.push(this.services.pointStamp.buildRefundFormula(`${sStCol}${sr}`, `${fStCol}${fr}`));
      }

      formulas.push(rowFormulas);
    }

    return formulas;
  }

  buildRefundTotalRow(sheet, totalRow, startRow, endRow, fulfillTotalRow, refundColMap, promoColsDef) {
    const grossCol = refundColMap.gross.letter;
    sheet.getRange(totalRow, refundColMap.qtyRefund.idx).setValue("Total Gross Sales").setFontWeight("bold");
    sheet.getRange(totalRow, refundColMap.gross.idx).setFormula(`=SUM(${grossCol}${startRow}:${grossCol}${endRow})`).setFontWeight("bold");

    const finalNetIdx = refundColMap.finalNet.idx;
    const finalNetLetter = refundColMap.finalNet.letter;

    sheet.getRange(totalRow, finalNetIdx - 1).setValue("Total Net Sales").setFontWeight("bold");
    sheet.getRange(totalRow, finalNetIdx).setFormula(`=SUM(${finalNetLetter}${startRow}:${finalNetLetter}${endRow})`).setFontWeight("bold");

    for (const pt of promoColsDef.points) {
      const colObj = refundColMap.points[pt.code];
      sheet.getRange(totalRow, colObj.idx).setFormula(`=SUM(${colObj.letter}${startRow}:${colObj.letter}${endRow})`).setFontWeight("bold");
    }
    for (const st of promoColsDef.stamps) {
      const colObj = refundColMap.stamps[st.code];
      sheet.getRange(totalRow, colObj.idx).setFormula(`=SUM(${colObj.letter}${startRow}:${colObj.letter}${endRow})`).setFontWeight("bold");
    }

    // Sel kontrol Total Net Sales Fulfillment + Total Net Sales Refund (baris 158 di Result Refference)
    sheet.getRange(totalRow + 2, finalNetIdx + 1)
      .setFormula(`=${finalNetLetter}${fulfillTotalRow}+${finalNetLetter}${totalRow}`)
      .setFontWeight("bold");
  }

  buildDetailTransaksi2(
    sheet, startRow, fulfillTotalRow, refundTotalRow, fulfillStartRow, fulfillEndRow,
    refundStartRow, refundEndRow, promoColsDef, fulfillColMap, refundColMap, detail1StartRow, transactions
  ) {
    sheet.getRange(startRow, 1).setValue("Detail Transaksi ").setFontWeight("bold");

    const fulfillGross = `${fulfillColMap.gross.letter}${fulfillTotalRow}`;
    const refundGross = `${refundColMap.gross.letter}${refundTotalRow}`;

    // Cari batas baris Non-Paket + Bundling vs Hadiah + Tebus Murah
    let baseEndOffset = transactions.length - 1;
    let giftStartOffset = 0;
    for (let j = 0; j < transactions.length; j++) {
      if (transactions[j].isEligibleForFairPotal()) {
        baseEndOffset = j;
      }
      if ((transactions[j].isPHG() || transactions[j].isFairHadiah() || transactions[j].isFairTMH()) && giftStartOffset === 0) {
        giftStartOffset = j;
      }
    }

    const fBaseEnd = fulfillStartRow + baseEndOffset;
    const fGiftStart = fulfillStartRow + giftStartOffset;
    const rBaseEnd = refundStartRow + baseEndOffset;
    const rGiftStart = refundStartRow + giftStartOffset;

    // 1. Fulfillment Diskon & Refund Diskon (Base)
    const fBaseDiscounts = [];
    const rBaseDiscounts = [];
    if (promoColsDef.bundling.length > 0) {
      fBaseDiscounts.push(`SUM(${fulfillColMap.bundlingPlu.letter}${fulfillStartRow}:${fulfillColMap.bundlingPlu.letter}${fBaseEnd})`);
      rBaseDiscounts.push(`SUM(${refundColMap.bundlingPlu.letter}${refundStartRow}:${refundColMap.bundlingPlu.letter}${rBaseEnd})`);
    }
    if (promoColsDef.coret.length > 0) {
      fBaseDiscounts.push(`SUM(${fulfillColMap.coretPlu.letter}${fulfillStartRow}:${fulfillColMap.coretPlu.letter}${fBaseEnd})`);
      rBaseDiscounts.push(`SUM(${refundColMap.coretPlu.letter}${refundStartRow}:${refundColMap.coretPlu.letter}${rBaseEnd})`);
    }
    for (const up of promoColsDef.upsell) {
      const fCol = fulfillColMap.upsell[up.code].plu.letter;
      const rCol = refundColMap.upsell[up.code].plu.letter;
      fBaseDiscounts.push(`SUM(${fCol}${fulfillStartRow}:${fCol}${fBaseEnd})`);
      rBaseDiscounts.push(`SUM(${rCol}${refundStartRow}:${rCol}${rBaseEnd})`);
    }
    fBaseDiscounts.push(`SUM(${fulfillColMap.karton.letter}${fulfillStartRow}:${fulfillColMap.karton.letter}${fBaseEnd})`);
    rBaseDiscounts.push(`SUM(${refundColMap.karton.letter}${refundStartRow}:${refundColMap.karton.letter}${rBaseEnd})`);

    // 2. Fulfillment Promo Fair & Refund Promo Fair (Fair Potal)
    const fPotalDiscounts = [];
    const rPotalDiscounts = [];
    for (const pot of promoColsDef.fairPotal) {
      let firstEligOffset = 0;
      for (let j = 0; j < transactions.length; j++) {
        if (transactions[j].isEligibleForFairPotal() && (pot.isAllPlu() || pot.getPluSyaratList().includes(transactions[j].plu))) {
          firstEligOffset = j;
          break;
        }
      }
      fPotalDiscounts.push(`${fulfillColMap.fairPotal[pot.code].total.letter}${fulfillStartRow + firstEligOffset}`);
      rPotalDiscounts.push(`${refundColMap.fairPotal[pot.code].total.letter}${refundStartRow + firstEligOffset}`);
    }

    // 3. Fulfillment & Refund Fair Tebus Murah & Hadiah
    const fTmhDiscounts = [];
    const rTmhDiscounts = [];
    if (promoColsDef.phg.length > 0) {
      fTmhDiscounts.push(`SUM(${fulfillColMap.phgPlu.letter}${fGiftStart}:${fulfillColMap.phgPlu.letter}${fulfillEndRow})`);
      rTmhDiscounts.push(`SUM(${refundColMap.phgPlu.letter}${rGiftStart}:${refundColMap.phgPlu.letter}${refundEndRow})`);
    }
    if (promoColsDef.fairTmh.length > 0 || promoColsDef.fairHadiah.length > 0) {
      fTmhDiscounts.push(`SUM(${fulfillColMap.tmhPlu.letter}${fGiftStart}:${fulfillColMap.tmhPlu.letter}${fulfillEndRow})`);
      rTmhDiscounts.push(`SUM(${refundColMap.tmhPlu.letter}${rGiftStart}:${refundColMap.tmhPlu.letter}${refundEndRow})`);
    }

    // 4. DAB
    const dabFirstCode = promoColsDef.dab.length > 0 ? promoColsDef.dab[0].code : null;
    const fDabCell = dabFirstCode ? `${fulfillColMap.dab[dabFirstCode].total.letter}${fulfillStartRow}` : '0';
    const rDabCell = dabFirstCode ? `${refundColMap.dab[dabFirstCode].total.letter}${refundStartRow}` : '0';

    // 5. Point & Stamp Summary (merujuk ke baris fulfillTotalRow seperti baris 172–175 di Result Refference)
    const baseAndCartPts = promoColsDef.points
      .filter(p => !p.type.toLowerCase().includes('fair'))
      .map(p => `${fulfillColMap.points[p.code].letter}${fulfillTotalRow}`);
    const fairPts = promoColsDef.points
      .filter(p => p.type.toLowerCase().includes('fair'))
      .map(p => `${fulfillColMap.points[p.code].letter}${fulfillTotalRow}`);

    const baseAndCartSts = promoColsDef.stamps
      .filter(s => !s.type.toLowerCase().includes('fair'))
      .map(s => `${fulfillColMap.stamps[s.code].letter}${fulfillTotalRow}`);
    const fairSts = promoColsDef.stamps
      .filter(s => s.type.toLowerCase().includes('fair'))
      .map(s => `${fulfillColMap.stamps[s.code].letter}${fulfillTotalRow}`);

    const details = [
      ["Total Pemenuhan", `=${fulfillGross}`],
      ["Fulfillment Diskon", fBaseDiscounts.length > 0 ? `=${fBaseDiscounts.join('+')}` : '=0'],
      ["Fulfillment Promo Fair", fPotalDiscounts.length > 0 ? `=${fPotalDiscounts.join('+')}` : '=0'],
      ["Fulfillment Fair Tebus Murah & Hadiah", fTmhDiscounts.length > 0 ? `=${fTmhDiscounts.join('+')}` : '=0'],
      ["Fulfillment Diskon Alat Bayar", `=${fDabCell}`],
      ["Total Fulfillment", `=B${startRow + 1}-B${startRow + 2}-B${startRow + 3}-B${startRow + 4}-B${startRow + 5}+B${startRow + 17}+B${startRow + 18}`],
      ["Refund Amount", `=${refundGross}`],
      ["Refund Diskon", rBaseDiscounts.length > 0 ? `=${rBaseDiscounts.join('+')}` : '=0'],
      ["Refund Promo Fair", rPotalDiscounts.length > 0 ? `=${rPotalDiscounts.join('+')}` : '=0'],
      ["Refund Fair Tebus Murah & Hadiah", rTmhDiscounts.length > 0 ? `=${rTmhDiscounts.join('+')}` : '=0'],
      ["Refund Diskon Alat Bayar", `=${rDabCell}`],
      ["Total Refund Paid", `=B${startRow + 7}-B${startRow + 8}-B${startRow + 9}-B${startRow + 10}-B${startRow + 11}`],
      ["Point Received", baseAndCartPts.length > 0 ? `=${baseAndCartPts.join('+')}` : '=0'],
      ["Point Fair", fairPts.length > 0 ? `=${fairPts.join('+')}` : '=0'],
      ["Stamp Received", baseAndCartSts.length > 0 ? `=${baseAndCartSts.join('+')}` : '=0'],
      ["Stamp Fair", fairSts.length > 0 ? `=${fairSts.join('+')}` : '=0'],
      ["Biaya Pengiriman", `=B${detail1StartRow + 7}`],
      ["Biaya Plastik / Packaging", `=B${detail1StartRow + 8}`],
      ["Total Pembayaran", `=B${startRow + 6}+B${startRow + 12}`]
    ];

    sheet.getRange(startRow + 1, 1, details.length, 2).setValues(details);

    // Sel kontrol di sebelah Total Fulfillment (C165 & D165 di Result Refference)
    const totalFulfillRow = startRow + 6;
    sheet.getRange(totalFulfillRow, 3).setFormula(`=B${startRow + 1}-B${startRow + 2}-B${startRow + 3}-B${startRow + 4}-B${startRow + 5}`);
    sheet.getRange(totalFulfillRow, 4).setFormula(`=B${totalFulfillRow}-C${totalFulfillRow}`);

    sheet.getRange(startRow + 6, 1, 1, 2).setFontWeight("bold");
    sheet.getRange(startRow + 12, 1, 1, 2).setFontWeight("bold");
    sheet.getRange(startRow + details.length, 1, 1, 2).setFontWeight("bold");
  }

  applyFormatting(
    sheet, salesStart, salesEnd, salesNumCols, salesColMap,
    fulfillStart, fulfillEnd, fulfillNumCols, fulfillColMap,
    refundStart, refundEnd, refundNumCols, refundColMap,
    detail1Start, detail2Start
  ) {
    const moneyFormat = 'Rp#,##0';
    const numberFormat = '#,##0';

    const salesLastNetLetter = salesColMap.finalNet.letter;
    const salesLastColLetter = ResultSheetBuilder.getColLetter(salesNumCols);
    const fulfillLastNetLetter = fulfillColMap.finalNet.letter;
    const fulfillLastColLetter = ResultSheetBuilder.getColLetter(fulfillNumCols);
    const refundLastNetLetter = refundColMap.finalNet.letter;
    const refundLastColLetter = ResultSheetBuilder.getColLetter(refundNumCols);

    // Format mata uang pada kolom harga dan sales s/d Net Sales terakhir
    sheet.getRange(`D${salesStart}:D${salesEnd}`).setNumberFormat(moneyFormat);
    sheet.getRange(`F${salesStart}:${salesLastNetLetter}${salesEnd + 1}`).setNumberFormat(moneyFormat);

    sheet.getRange(`D${fulfillStart}:D${fulfillEnd}`).setNumberFormat(moneyFormat);
    sheet.getRange(`G${fulfillStart}:${fulfillLastNetLetter}${fulfillEnd + 1}`).setNumberFormat(moneyFormat);

    sheet.getRange(`D${refundStart}:D${refundEnd}`).setNumberFormat(moneyFormat);
    sheet.getRange(`G${refundStart}:${refundLastNetLetter}${refundEnd + 1}`).setNumberFormat(moneyFormat);

    // Format angka pada kolom Point & Stamp
    if (salesNumCols > salesColMap.finalNet.idx) {
      const firstPtSales = ResultSheetBuilder.getColLetter(salesColMap.finalNet.idx + 1);
      sheet.getRange(`${firstPtSales}${salesStart}:${salesLastColLetter}${salesEnd}`).setNumberFormat(numberFormat);
    }
    if (fulfillNumCols > fulfillColMap.finalNet.idx) {
      const firstPtFulfill = ResultSheetBuilder.getColLetter(fulfillColMap.finalNet.idx + 1);
      sheet.getRange(`${firstPtFulfill}${fulfillStart}:${fulfillLastColLetter}${fulfillEnd + 1}`).setNumberFormat(numberFormat);
    }
    if (refundNumCols > refundColMap.finalNet.idx) {
      const firstPtRefund = ResultSheetBuilder.getColLetter(refundColMap.finalNet.idx + 1);
      sheet.getRange(`${firstPtRefund}${refundStart}:${refundLastColLetter}${refundEnd + 1}`).setNumberFormat(numberFormat);
    }

    // Format angka pada Detail Transaksi
    sheet.getRange(`B${detail1Start + 1}:B${detail1Start + 9}`).setNumberFormat(numberFormat);
    sheet.getRange(`B${detail2Start + 1}:B${detail2Start + 19}`).setNumberFormat(numberFormat);

    // Border grid halus
    const borderStyle = (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.BorderStyle) ? SpreadsheetApp.BorderStyle.SOLID : null;
    sheet.getRange(`A${salesStart - 1}:${salesLastColLetter}${salesEnd + 1}`).setBorder(true, true, true, true, true, true, "#D3D3D3", borderStyle);
    sheet.getRange(`A${fulfillStart - 1}:${fulfillLastColLetter}${fulfillEnd + 1}`).setBorder(true, true, true, true, true, true, "#D3D3D3", borderStyle);
    sheet.getRange(`A${refundStart - 1}:${refundLastColLetter}${refundEnd + 1}`).setBorder(true, true, true, true, true, true, "#D3D3D3", borderStyle);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ResultSheetBuilder };
}
