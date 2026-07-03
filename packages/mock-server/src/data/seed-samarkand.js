import { categories } from './seed.js';
import { DARKSTORE_SAMARKAND } from '../phase4/darkstores.js';

const samarkandNames = [
  { uz_latin: 'Anor', ru: 'Гранат', en: 'Pomegranate', zone: 'A', price: 15900, halal: false },
  { uz_latin: 'Non', ru: 'Лепёшка самаркандская', en: 'Samarkand bread', zone: 'F', price: 3500, halal: false },
  { uz_latin: 'Qovun', ru: 'Дыня', en: 'Melon', zone: 'A', price: 22000, halal: false },
  { uz_latin: 'Go\'sht', ru: 'Баранина', en: 'Lamb', zone: 'A', price: 92000, halal: true },
  { uz_latin: 'Choy', ru: 'Чай зелёный', en: 'Green tea', zone: 'B', price: 12900, halal: false },
  { uz_latin: 'Suv', ru: 'Вода', en: 'Water', zone: 'E', price: 3500, halal: false },
];

function uuid(i) {
  return `00000000-0000-4000-9000-${String(i).padStart(12, '0')}`;
}

export const samarkandProducts = Array.from({ length: 500 }, (_, i) => {
  const base = samarkandNames[i % samarkandNames.length];
  return {
    id: uuid(i + 1),
    darkstore_id: DARKSTORE_SAMARKAND,
    name: { uz_latin: base.uz_latin, ru: base.ru, en: base.en, uz_cyrillic: base.ru },
    price: base.price + (i % 4) * 400,
    weight_g: 400 + (i % 8) * 100,
    is_halal: base.halal,
    images: [`https://picsum.photos/seed/sm${i}/400/400`],
    stock: 15 + (i % 25),
    zone: base.zone,
    category: categories[i % categories.length].id,
    brand: `Samarkand ${(i % 5) + 1}`,
    barcode: `8700000000${String(i).padStart(3, '0')}`,
    active: true,
  };
});

export const samarkandOrders = [
  {
    id: uuid(3001),
    status: 'DELIVERED',
    items: [{ product_id: samarkandProducts[0].id, name: samarkandProducts[0].name.ru, quantity: 2, price: samarkandProducts[0].price, zone: 'A' }],
    total_amount: samarkandProducts[0].price * 2,
    delivery_fee: 0,
    subtotal: samarkandProducts[0].price * 2,
    darkstore_id: DARKSTORE_SAMARKAND,
    delivery_address: { coordinates: { lat: 39.654, lng: 66.959 }, mahalla_id: 'sm1', landmark: 'Регистан, 2-й поворот' },
    customer_id: 'cust-dilshod',
    courier: { id: 'sm-c1', name: 'Фарход', phone_masked: '+998 ** *** 12 34' },
    eta_minutes: null,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: uuid(3002),
    status: 'ASSEMBLY',
    items: [{ product_id: samarkandProducts[2].id, name: samarkandProducts[2].name.ru, quantity: 1, price: samarkandProducts[2].price, zone: 'A' }],
    total_amount: samarkandProducts[2].price + 12000,
    delivery_fee: 12000,
    subtotal: samarkandProducts[2].price,
    darkstore_id: DARKSTORE_SAMARKAND,
    delivery_address: { coordinates: { lat: 39.660, lng: 66.965 }, mahalla_id: 'sm2', landmark: 'ул. Амира Темура' },
    customer_id: 'cust-madina',
    courier: null,
    eta_minutes: 20,
    created_at: new Date(Date.now() - 900000).toISOString(),
  },
];

export const samarkandStaff = [
  { id: 'sm-p1', name: 'Шахзод', role: 'picker', online: true, rating: 4.7, darkstore_id: DARKSTORE_SAMARKAND, zone_certifications: ['A', 'B', 'F'], shift_started_at: new Date(Date.now() - 5400000).toISOString() },
  { id: 'sm-c1', name: 'Фарход', role: 'courier', online: true, rating: 4.8, darkstore_id: DARKSTORE_SAMARKAND, zone_certifications: [], shift_started_at: new Date(Date.now() - 7200000).toISOString() },
];
