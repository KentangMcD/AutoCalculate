const fs = require('fs');
const { PromoRule, parseNumber } = require('../Models.gs');

const data = JSON.parse(fs.readFileSync('scratch/input_dump.json', 'utf8'));

// Exact code from DataLoader.gs lines 71-140:
let promoHeaderRow = -1;
let promoColMap = {};

for (let r = 0; r < data.length; r++) {
  for (let c = 0; c < data[r].length; c++) {
    const cell = String(data[r][c] || '').trim().toLowerCase();
    if (cell === 'kode promo') {
      promoHeaderRow = r;
      break;
    }
  }
  if (promoHeaderRow !== -1) break;
}

console.log('promoHeaderRow:', promoHeaderRow);

if (promoHeaderRow !== -1) {
  const headerRowVals = data[promoHeaderRow];
  for (let c = 0; c < headerRowVals.length; c++) {
    const h = String(headerRowVals[c] || '').trim().toLowerCase();
    if (h.includes('tipe promo')) promoColMap.tipe = c;
    else if (h.includes('kode promo')) promoColMap.kode = c;
    else if (h.includes('qty min')) promoColMap.qtyMin = c;
    else if (h.includes('rp min')) promoColMap.rpMin = c;
    else if (h.includes('% benefit')) promoColMap.pctBenefit = c;
    else if (h.includes('rp benefit')) promoColMap.rpBenefit = c;
    else if (h.includes('poin') || h.includes('stamp benefit')) promoColMap.ptBenefit = c;
    else if (h.includes('item target')) promoColMap.targetItem = c;
    else if (h.includes('plu syarat')) promoColMap.pluSyarat = c;
    else if (h.includes('campur')) promoColMap.campur = c;
    else if (h.includes('kelipatan')) promoColMap.kelipatan = c;
    else if (h.includes('qty  max') || h.includes('qty max')) promoColMap.qtyMax = c;
    else if (h.includes('rp  max') || h.includes('rp max')) promoColMap.rpMax = c;
  }
  if (promoColMap.tipe === undefined && promoColMap.kode > 0) {
    promoColMap.tipe = promoColMap.kode - 1;
  }
}

console.log('promoColMap:', promoColMap);

const promoRules = [];
let currentTipe = '';
for (let r = promoHeaderRow + 1; r < data.length; r++) {
  const row = data[r];
  const rowText = row.join(' ').toLowerCase();
  if (rowText.includes('transaction & refund input') || rowText.includes('transaction input')) {
    break;
  }

  const kodeVal = promoColMap.kode !== undefined ? String(row[promoColMap.kode] || '').trim() : '';
  const tipeVal = promoColMap.tipe !== undefined ? String(row[promoColMap.tipe] || '').trim() : '';
  if (tipeVal && tipeVal !== 'None' && tipeVal !== 'null') currentTipe = tipeVal;

  if (kodeVal && kodeVal !== 'None' && kodeVal !== 'null') {
    const promoRule = new PromoRule({
      type: currentTipe,
      code: kodeVal,
      qtyMin: promoColMap.qtyMin !== undefined ? row[promoColMap.qtyMin] : null,
      rpMin: promoColMap.rpMin !== undefined ? row[promoColMap.rpMin] : null,
      pctBenefit: promoColMap.pctBenefit !== undefined ? row[promoColMap.pctBenefit] : null,
      rpBenefit: promoColMap.rpBenefit !== undefined ? row[promoColMap.rpBenefit] : null,
      ptBenefit: promoColMap.ptBenefit !== undefined ? row[promoColMap.ptBenefit] : null,
      targetItem: promoColMap.targetItem !== undefined ? row[promoColMap.targetItem] : '',
      pluSyarat: promoColMap.pluSyarat !== undefined ? row[promoColMap.pluSyarat] : '',
      campur: promoColMap.campur !== undefined ? row[promoColMap.campur] : 'N',
      kelipatan: promoColMap.kelipatan !== undefined ? row[promoColMap.kelipatan] : 'Y',
      qtyMax: promoColMap.qtyMax !== undefined ? row[promoColMap.qtyMax] : null,
      rpMax: promoColMap.rpMax !== undefined ? row[promoColMap.rpMax] : null,
      sourceRow: r + 1
    });
    promoRules.push(promoRule);
  }
}

console.log(`Parsed ${promoRules.length} promo rules:`);
promoRules.forEach((p, idx) => {
  console.log(`${idx + 1}. [${p.type}] Code=${p.code}`);
});
