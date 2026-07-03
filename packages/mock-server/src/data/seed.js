export const DARKSTORE_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const productNames = [
  { uz_cyrillic: 'Олма', uz_latin: 'Olma', ru: 'Яблоко', en: 'Apple', zone: 'A', price: 12900, halal: false },
  { uz_cyrillic: 'Банан', uz_latin: 'Banan', ru: 'Банан', en: 'Banana', zone: 'A', price: 18900, halal: false },
  { uz_cyrillic: 'Сут', uz_latin: 'Sut', ru: 'Молоко', en: 'Milk', zone: 'A', price: 11900, halal: true },
  { uz_cyrillic: 'Гўшт', uz_latin: 'Go\'sht', ru: 'Мясо', en: 'Meat', zone: 'A', price: 85000, halal: true },
  { uz_cyrillic: 'Гуруч', uz_latin: 'Guruch', ru: 'Рис', en: 'Rice', zone: 'B', price: 15900, halal: false },
  { uz_cyrillic: 'Макaron', uz_latin: 'Makaron', ru: 'Макароны', en: 'Pasta', zone: 'B', price: 8900, halal: false },
  { uz_cyrillic: 'Сuv', uz_latin: 'Suv', ru: 'Вода', en: 'Water', zone: 'E', price: 3900, halal: false },
  { uz_cyrillic: 'Cola', uz_latin: 'Cola', ru: 'Кола', en: 'Cola', zone: 'E', price: 7900, halal: false },
  { uz_cyrillic: 'Pelmеni', uz_latin: 'Pelmeni', ru: 'Пельмени', en: 'Dumplings', zone: 'C', price: 24900, halal: true },
  { uz_cyrillic: 'Shokolad', uz_latin: 'Shokolad', ru: 'Шоколад', en: 'Chocolate', zone: 'B', price: 14900, halal: false },
  { uz_cyrillic: 'Non', uz_latin: 'Non', ru: 'Хлеб', en: 'Bread', zone: 'F', price: 4500, halal: false },
  { uz_cyrillic: 'Sabun', uz_latin: 'Sabun', ru: 'Мыло', en: 'Soap', zone: 'D', price: 6900, halal: false },
];

function uuid(i) {
  return `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
}

export const categories = [
  { id: uuid(100), name: { ru: 'Свежие продукты', en: 'Fresh', uz_latin: 'Yangi mahsulotlar' }, parent_id: null },
  { id: uuid(101), name: { ru: 'Бакалея', en: 'Grocery', uz_latin: 'Bakaleya' }, parent_id: null },
  { id: uuid(102), name: { ru: 'Напитки', en: 'Drinks', uz_latin: 'Ichimliklar' }, parent_id: null },
  { id: uuid(103), name: { ru: 'Заморозка', en: 'Frozen', uz_latin: 'Muzlatilgan' }, parent_id: null },
  { id: uuid(104), name: { ru: 'Хлеб', en: 'Bakery', uz_latin: 'Non' }, parent_id: null },
  { id: uuid(105), name: { ru: 'Бытовая химия', en: 'Household', uz_latin: 'Maishiy kimyo' }, parent_id: null },
];

export const products = Array.from({ length: 3900 }, (_, i) => {
  const base = productNames[i % productNames.length];
  return {
    id: uuid(i + 1),
    darkstore_id: DARKSTORE_ID,
    name: {
      uz_cyrillic: base.uz_cyrillic,
      uz_latin: base.uz_latin,
      ru: base.ru,
      en: base.en,
    },
    price: base.price + (i % 5) * 500,
    weight_g: 500 + (i % 10) * 100,
    is_halal: base.halal,
    images: [`https://picsum.photos/seed/jl${i}/400/400`],
    stock: 20 + (i % 30),
    zone: base.zone,
    category: categories[i % categories.length].id,
    brand: `Brand ${(i % 8) + 1}`,
    barcode: `8600000000${String(i).padStart(3, '0')}`,
    active: true,
  };
});

export const orders = [
  {
    id: uuid(1001),
    status: 'ACCEPTED',
    items: [{ product_id: products[0].id, name: products[0].name.ru, quantity: 2, price: products[0].price, zone: 'A' }],
    total_amount: products[0].price * 2 + 15000,
    delivery_fee: 15000,
    subtotal: products[0].price * 2,
    darkstore_id: DARKSTORE_ID,
    delivery_address: { coordinates: { lat: 41.311, lng: 69.279 }, mahalla_id: 'm1', landmark: 'вход со двора, синие ворота' },
    customer_id: 'cust-dilshod',
    courier: null,
    eta_minutes: 18,
    created_at: new Date().toISOString(),
  },
  {
    id: uuid(1002),
    status: 'ASSEMBLY',
    items: [
      { product_id: products[4].id, name: products[4].name.ru, quantity: 1, price: products[4].price, zone: 'B' },
      { product_id: products[10].id, name: products[10].name.ru, quantity: 2, price: products[10].price, zone: 'F' },
    ],
    total_amount: products[4].price + products[10].price * 2,
    delivery_fee: 0,
    subtotal: products[4].price + products[10].price * 2,
    darkstore_id: DARKSTORE_ID,
    delivery_address: { coordinates: { lat: 41.315, lng: 69.285 }, mahalla_id: 'm2', landmark: 'рядом с мечетью, 3-й подъезд' },
    customer_id: 'cust-madina',
    courier: null,
    eta_minutes: 15,
    created_at: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: uuid(1003),
    status: 'READY',
    items: [{ product_id: products[6].id, name: products[6].name.ru, quantity: 6, price: products[6].price, zone: 'E' }],
    total_amount: products[6].price * 6,
    delivery_fee: 0,
    subtotal: products[6].price * 6,
    darkstore_id: DARKSTORE_ID,
    delivery_address: { coordinates: { lat: 41.308, lng: 69.270 }, mahalla_id: 'm3', landmark: 'напротив школы №45' },
    customer_id: 'cust-dilshod',
    courier: null,
    eta_minutes: 12,
    created_at: new Date(Date.now() - 1200000).toISOString(),
  },
  {
    id: uuid(1004),
    status: 'IN_DELIVERY',
    items: [{ product_id: products[2].id, name: products[2].name.ru, quantity: 3, price: products[2].price, zone: 'A' }],
    total_amount: products[2].price * 3,
    delivery_fee: 0,
    subtotal: products[2].price * 3,
    darkstore_id: DARKSTORE_ID,
    delivery_address: { coordinates: { lat: 41.320, lng: 69.290 }, mahalla_id: 'm4', landmark: 'белый 5-этажный дом' },
    customer_id: 'cust-madina',
    courier: { id: 'c1', name: 'Алишер', phone_masked: '+998 ** *** 45 67' },
    eta_minutes: 8,
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: uuid(1005),
    status: 'DELIVERED',
    items: [{ product_id: products[1].id, name: products[1].name.ru, quantity: 1, price: products[1].price, zone: 'A' }],
    total_amount: products[1].price,
    delivery_fee: 0,
    subtotal: products[1].price,
    darkstore_id: DARKSTORE_ID,
    delivery_address: { coordinates: { lat: 41.305, lng: 69.265 }, mahalla_id: 'm5', landmark: 'за магазином Uzum' },
    customer_id: 'cust-dilshod',
    courier: { id: 'c1', name: 'Алишер', phone_masked: '+998 ** *** 45 67' },
    eta_minutes: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const tickets = [
  {
    id: uuid(2001),
    order_id: orders[4].id,
    status: 'new',
    priority: 'high',
    type: 'wrong_item',
    description: 'Привезли не тот товар',
    customer_name: 'Дилшод',
    customer_id: 'cust-dilshod',
    created_at: new Date(Date.now() - 300000).toISOString(),
    sla_deadline: new Date(Date.now() + 1800000).toISOString(),
  },
  {
    id: uuid(2002),
    order_id: orders[3].id,
    status: 'in_progress',
    priority: 'critical',
    type: 'not_delivered',
    description: 'Заказ не доставлен более 30 минут',
    customer_name: 'Мадина',
    customer_id: 'cust-madina',
    created_at: new Date(Date.now() - 600000).toISOString(),
    sla_deadline: new Date(Date.now() + 900000).toISOString(),
  },
  {
    id: uuid(2003),
    order_id: orders[0].id,
    status: 'new',
    priority: 'normal',
    type: 'wrong_item',
    description: 'Неверный товар в заказе — небольшая сумма',
    customer_name: 'Азиз',
    customer_id: 'cust-dilshod',
    created_at: new Date(Date.now() - 120000).toISOString(),
    sla_deadline: new Date(Date.now() + 7200000).toISOString(),
  },
];

export const staff = [
  { id: 'p1', name: 'Жасур', role: 'picker', online: true, rating: 4.8, darkstore_id: DARKSTORE_ID, zone_certifications: ['A', 'B', 'C', 'D', 'E', 'F'], shift_started_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 'p2', name: 'Нодира', role: 'picker', online: true, rating: 4.6, darkstore_id: DARKSTORE_ID, zone_certifications: ['A', 'B', 'D', 'E', 'F'], shift_started_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'c1', name: 'Алишер', role: 'courier', online: true, rating: 4.9, darkstore_id: DARKSTORE_ID, zone_certifications: [], shift_started_at: new Date(Date.now() - 5400000).toISOString() },
  { id: 'c2', name: 'Бахром', role: 'courier', online: false, rating: 4.5, darkstore_id: DARKSTORE_ID, zone_certifications: [], shift_started_at: null },
];

export const pickerTask = {
  order_id: orders[1].id,
  sla_deadline: new Date(Date.now() + 900000).toISOString(),
  items: orders[1].items.map((item, idx) => ({
    product_id: item.product_id,
    name: item.name,
    zone: item.zone,
    shelf: `${item.zone}-${idx + 1}`,
    photo_url: products.find((p) => p.id === item.product_id)?.images[0] ?? '',
    quantity: item.quantity,
    barcode: products.find((p) => p.id === item.product_id)?.barcode ?? '',
    is_weighted: false,
    is_marked: idx === 0,
  })),
};

export const courierOffer = {
  order_id: orders[2].id,
  address_masked: 'Чиланзар, ***',
  amount: orders[2].total_amount,
  earnings: 11000,
  distance_km: 1.8,
  weight_kg: 3.5,
  expires_at: new Date(Date.now() + 30000).toISOString(),
};

export function seedData() {
  return { DARKSTORE_ID, products, categories, orders, tickets, staff, pickerTask, courierOffer };
}
