export const DARKSTORE_TASHKENT = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
export const DARKSTORE_SAMARKAND = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

export const DARKSTORES = [
  {
    id: DARKSTORE_TASHKENT,
    city: 'Tashkent',
    city_ru: 'Ташкент',
    name: 'Tashkent Center',
    radius_km: 3,
    sku_count: 3900,
    coordinates: { lat: 41.311, lng: 69.279 },
  },
  {
    id: DARKSTORE_SAMARKAND,
    city: 'Samarkand',
    city_ru: 'Самарканд',
    name: 'Samarkand Registan',
    radius_km: 2.5,
    sku_count: 2500,
    coordinates: { lat: 39.654, lng: 66.959 },
  },
];

export function getDarkstore(id) {
  return DARKSTORES.find((d) => d.id === id);
}

export function filterByDarkstore(items, darkstoreId) {
  if (!darkstoreId) return items;
  return items.filter((i) => i.darkstore_id === darkstoreId || !i.darkstore_id);
}
