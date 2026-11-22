export type Item = { id: string; name: string; buy: number; sell: number; cook: number; drink?: boolean; adult?: boolean };

export const ITEMS: Item[] = [
  { id: 'mg', name: 'Mie Goreng', buy: 6000, sell: 12000, cook: 1800 },
  { id: 'ng', name: 'Nasi Goreng', buy: 7000, sell: 15000, cook: 2000 },
  { id: 'bk', name: 'Bakso', buy: 8000, sell: 15000, cook: 1500 },
  { id: 'sb', name: 'Seblak', buy: 6000, sell: 13000, cook: 1800 },
  { id: 'sa', name: 'Soto Ayam', buy: 8000, sell: 16000, cook: 1500 },
  { id: 'st', name: 'Sate Ayam', buy: 9000, sell: 18000, cook: 2000 },
  { id: 'gr', name: 'Gorengan', buy: 500, sell: 1500, cook: 300 },
  { id: 'et', name: 'Es Teh Manis', buy: 1000, sell: 4000, cook: 600, drink: true },
  { id: 'ej', name: 'Es Jeruk', buy: 2000, sell: 5000, cook: 700, drink: true },
  { id: 'kp', name: 'Kopi Sachet', buy: 1000, sell: 4000, cook: 700, drink: true },
  { id: 'im', name: 'Indomie Rebus', buy: 3000, sell: 9000, cook: 1500 },
  { id: 'kr', name: 'Kerupuk', buy: 500, sell: 2000, cook: 0 },
  { id: 'rk', name: 'Rokok (batang)', buy: 2000, sell: 3000, cook: 0, adult: true },
  { id: 'am', name: 'Air Mineral', buy: 1500, sell: 4000, cook: 0, drink: true },
  { id: 'ss', name: 'Susu Sachet', buy: 1500, sell: 4000, cook: 300, drink: true },
  { id: 'jj', name: 'Jajanan Warung', buy: 800, sell: 2000, cook: 0 },
];

export const UPS = [
  { id: 'kursi', name: 'Kursi Plastik', desc: '+1 tempat antre pelanggan', base: 40000, ic: 'ic_home' },
  { id: 'spanduk', name: 'Spanduk Baru', desc: 'Pelanggan datang lebih sering', base: 60000, ic: 'ic_gift' },
  { id: 'kompor', name: 'Kompor Gas', desc: 'Masak & racik lebih cepat', base: 50000, ic: 'ic_box' },
  { id: 'etalase', name: 'Etalase Kaca', desc: 'Pelanggan lebih sabar menunggu', base: 45000, ic: 'ic_chart' },
];

export type CType = { n: string; s: string; adult?: boolean };
export const TYPES: CType[] = [
  { n: 'Adik Sekolah', s: 'c_boy' },
  { n: 'Mbak Sekolah', s: 'c_girl' },
  { n: 'Mas Ojol', s: 'c_green', adult: true },
  { n: 'Mbak Hijab', s: 'c_hijab' },
  { n: 'Mas Kaos Hitam', s: 'c_cap', adult: true },
  { n: 'Bu Tejo', s: 'c_pink' },
  { n: 'Pak Haji', s: 'c_haji', adult: true },
  { n: 'Mbah Putri', s: 'c_nenek' },
  { n: 'Adik Kuning', s: 'c_yellow' },
];

export const SPRITES = [
  'warung', 'gerobak', 'tree', 'flag', 'lamp', 'pole', 'motor', 'seller', 'coin', 'star', 'heart',
  ...ITEMS.map((i) => i.id), ...TYPES.map((t) => t.s),
];
