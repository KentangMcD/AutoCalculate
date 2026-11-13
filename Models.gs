/**
 * Models.gs
 * Definisi kelas data model untuk sistem simulasi perhitungan promosi dan refund.
 */

/**
 * Helper untuk mem-parsing angka numerik secara aman dari sel spreadsheet.
 * Mengembalikan null jika sel berisi null, undefined, string kosong '', atau tanda strip '-' / '–' / '—'.
 * Mengkonversi format persentase (misal "25%") dan format mata uang (misal "Rp40,000" / "40.000").
 */
function parseNumber(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    return isNaN(val) ? null : val;
  }
  const s = String(val).trim();
  if (s === '' || s === '-' || s === '–' || s === '—' || s.toLowerCase() === 'null') {
    return null;
  }
  if (s.endsWith('%')) {
    const num = parseFloat(s.slice(0, -1).replace(/,/g, '.'));
    return isNaN(num) ? null : num / 100;
  }
  // Bersihkan format Rp dan pemisah ribuan
  const cleanStr = s.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
  const num = Number(cleanStr);
  return isNaN(num) ? null : num;
}

class Product {
  constructor(plu, name, price, fracKrt, priceKrt, benefitRp, benefitPct) {
    this.plu = String(plu).trim();
    this.name = name || '';
    this.price = parseNumber(price) || 0;
    this.fracKrt = parseNumber(fracKrt) || 0;
    this.priceKrt = parseNumber(priceKrt) || 0;
    this.benefitRp = parseNumber(benefitRp) || 0;
    this.benefitPct = parseNumber(benefitPct) || 0;
  }
}

class PromoRule {
  constructor(data) {
    this.type = (data.type || '').trim();
    this.code = (data.code || '').trim();
    this.qtyMin = parseNumber(data.qtyMin);
    this.rpMin = parseNumber(data.rpMin);
    this.pctBenefit = parseNumber(data.pctBenefit);
    this.rpBenefit = parseNumber(data.rpBenefit);
    this.ptBenefit = parseNumber(data.ptBenefit);
    this.targetItem = (data.targetItem || '').toString().trim();
    this.pluSyarat = (data.pluSyarat || '').toString().trim();
    this.campur = (data.campur || 'N').toString().trim().toUpperCase();
    this.kelipatan = (data.kelipatan || 'Y').toString().trim().toUpperCase();
    this.qtyMax = parseNumber(data.qtyMax);
    this.rpMax = parseNumber(data.rpMax);
    this.sourceRow = data.sourceRow || 0;
    this.resultRow = 0; // Baris utama pada tabel Tipe Promo di Result tab
    this.resultEndRow = 0; // Baris sub-PLU terakhir pada tabel Tipe Promo di Result tab
  }

  /**
   * Mengembalikan daftar PLU Syarat sebagai array string bersih.
   */
  getPluSyaratList() {
    if (!this.pluSyarat || this.pluSyarat === '-' || this.pluSyarat.toLowerCase() === 'all plu') {
      return [];
    }
    return this.pluSyarat
      .split(/[\n,\/]+/)
      .map(p => p.trim())
      .filter(p => p !== '' && p !== '-');
  }

  /**
   * Mengembalikan daftar Item Target sebagai array string bersih.
   */
  getTargetItemList() {
    if (!this.targetItem || this.targetItem === '-') {
      return [];
    }
    return this.targetItem
      .split(/[\n,\/]+/)
      .map(p => p.trim())
      .filter(p => p !== '' && p !== '-');
  }

  /**
   * Mengecek apakah promo berlaku untuk semua PLU (All PLU).
   */
  isAllPlu() {
    return this.pluSyarat.toLowerCase().includes('all plu');
  }

  /**
   * Mengembalikan label Tipe Promo standar sesuai Result Refference.
   */
  getDisplayType() {
    const t = this.type.toLowerCase();
    if (t.includes('bundling')) return 'Non Base - Bundling';
    if (t.includes('base') && t.includes('poin')) return 'Base - Poin';
    if (t.includes('base') && t.includes('stamp')) return 'Base - Stamp';
    if (t.includes('upsell')) return 'Base - Upsell';
    if (t.includes('coret')) return 'Base - Harga Coret';
    if (t.includes('potal')) return 'Fair - Potal';
    if (t.includes('dab') || t.includes('alat bayar')) return 'Fair - DAB';
    if (t.includes('fair') && t.includes('hadiah')) return 'Fair Hadiah';
    if (t.includes('tebus murah') || t.includes('tmh')) return 'Fair Tebus Murah';
    if (t.includes('phg') || t.includes('produk hadiah')) return 'Non Base - Produk Hadiah';
    if (t.includes('fair') && t.includes('poin')) return 'Fair - Poin';
    if (t.includes('cart') && t.includes('poin')) return 'Cart - Poin';
    if (t.includes('fair') && t.includes('stamp')) return 'Fair - Stamp';
    if (t.includes('cart') && t.includes('stamp')) return 'Cart - Stamp';
    return this.type;
  }
}

class TransactionItem {
  constructor(id, packet, plu, qtyBeli, qtyAktual, isKarton) {
    this.id = id;
    this.packet = (packet || '').trim();
    this.plu = String(plu).trim();
    this.name = '';
    this.price = 0;
    this.qtyBeli = parseNumber(qtyBeli) || 0;
    this.qtyAktual = parseNumber(qtyAktual) || 0;
    this.isKarton = (isKarton || 'N').toString().trim().toUpperCase() === 'Y';
  }

  /**
   * Mengecek apakah item transaksi ini adalah pembelian reguler (Non-Paket).
   */
  isNonPaket() {
    const p = this.packet.toLowerCase();
    return p === '' || p === 'non-paket' || p === 'non paket' || p.includes('upsell');
  }

  /**
   * Mengecek apakah item transaksi ini bagian dari paket Bundling.
   */
  isBundling() {
    return this.packet.toLowerCase().includes('bundling');
  }

  /**
   * Mengecek apakah item transaksi ini adalah Produk Hadiah Gratis (PHG).
   */
  isPHG() {
    const p = this.packet.toLowerCase();
    return p.includes('phg') || p.includes('produk hadiah');
  }

  /**
   * Mengecek apakah item transaksi ini adalah Fair Hadiah Gratis (FTH).
   */
  isFairHadiah() {
    return this.packet.toLowerCase().includes('fair hadiah') || this.packet.toLowerCase().includes('fth');
  }

  /**
   * Mengecek apakah item transaksi ini adalah Fair Tebus Murah (FTM / TMH).
   */
  isFairTMH() {
    const p = this.packet.toLowerCase();
    return p.includes('tebus murah') || p.includes('tmh') || p.includes('ftm');
  }

  /**
   * Mengecek apakah item ini eligible untuk perhitungan Fair Potal (Non-Paket dan Bundling).
   */
  isEligibleForFairPotal() {
    return this.isNonPaket() || this.isBundling();
  }
}

class EditOrderRow {
  constructor(plu, name, qtyBeli, qtyStok, qtyRefund) {
    this.plu = String(plu).trim();
    this.name = name || '';
    this.qtyBeli = parseNumber(qtyBeli) || 0;
    this.qtyStok = parseNumber(qtyStok) || 0;
    this.qtyRefund = parseNumber(qtyRefund) || 0;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseNumber, Product, PromoRule, TransactionItem, EditOrderRow };
}
