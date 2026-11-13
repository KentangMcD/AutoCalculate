const fs = require('fs');
const { PromoRule, parseNumber } = require('../Models.gs');

const data = JSON.parse(fs.readFileSync('scratch/input_dump.json', 'utf8'));

// Load promo rules
const promoRules = [];
let currentTipe = '';
for (let r = 2; r < data.length; r++) {
  const row = data[r];
  const rowText = row.join(' ').toLowerCase();
  if (rowText.includes('transaction & refund input') || rowText.includes('transaction input')) break;

  const kodeVal = String(row[1] || '').trim();
  const tipeVal = String(row[0] || '').trim();
  if (tipeVal && tipeVal !== 'None' && tipeVal !== 'null') currentTipe = tipeVal;

  if (kodeVal && kodeVal !== 'None' && kodeVal !== 'null') {
    const promoRule = new PromoRule({
      type: currentTipe,
      code: kodeVal,
      qtyMin: row[2],
      rpMin: row[3],
      pctBenefit: row[4],
      rpBenefit: row[5],
      ptBenefit: row[6],
      targetItem: row[7],
      pluSyarat: row[8],
      campur: row[9],
      kelipatan: row[10],
      qtyMax: row[11],
      rpMax: row[12],
      sourceRow: r + 1
    });
    promoRules.push(promoRule);
  }
}

console.log('Loaded', promoRules.length, 'rules.');

let currentPromoRow = 7;
for (const rule of promoRules) {
  rule.resultRow = currentPromoRow;
  const plus = rule.getPluSyaratList();
  const mainPlu = plus.length > 0 ? plus[0] : (rule.targetItem || '');

  const hasQtyMin = rule.qtyMin !== null && !isNaN(rule.qtyMin);
  const hasRpMin = rule.rpMin !== null && !isNaN(rule.rpMin);
  const minVal = hasQtyMin ? rule.qtyMin : (hasRpMin ? rule.rpMin : '-');

  const pctVal = rule.pctBenefit !== null && !isNaN(rule.pctBenefit) ? rule.pctBenefit : '-';
  const rpVal = rule.rpBenefit !== null && !isNaN(rule.rpBenefit) ? rule.rpBenefit : '-';
  const ptVal = rule.ptBenefit !== null && !isNaN(rule.ptBenefit) ? rule.ptBenefit : '-';

  const hasQtyMax = rule.qtyMax !== null && !isNaN(rule.qtyMax);
  const hasRpMax = rule.rpMax !== null && !isNaN(rule.rpMax);
  const maxVal = hasQtyMax ? rule.qtyMax : (hasRpMax ? rule.rpMax : '-');

  let prodNameVal = '-';
  if (rule.isAllPlu()) {
    prodNameVal = 'All Produk';
  } else if (mainPlu && !isNaN(Number(mainPlu))) {
    prodNameVal = `=IFERROR(VLOOKUP("${mainPlu}",'PLU Master'!$B:$C, 2, FALSE),"-")`;
  }

  const rowVal = [
    rule.type || '',
    rule.code || '',
    minVal,
    pctVal,
    rpVal,
    ptVal,
    rule.targetItem || '-',
    rule.pluSyarat || '-',
    prodNameVal,
    rule.campur || '-',
    rule.kelipatan || '-',
    maxVal
  ];

  console.log(`R${currentPromoRow} [${rule.code}]: Tipe=${rowVal[0]} | Min=${rowVal[2]} | %=${rowVal[3]} | Rp=${rowVal[4]} | Pt=${rowVal[5]} | Target=${rowVal[6]} | Max=${rowVal[11]}`);
  currentPromoRow++;
}
