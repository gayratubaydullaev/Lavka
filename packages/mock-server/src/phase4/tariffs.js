export const DEFAULT_TARIFFS = {
  free_delivery_threshold: 100000,
  base_delivery_fee: 15000,
  distance_surcharge_per_km: 500,
  peak_surcharge_percent: 20,
  peak_hours: ['12:00-14:00', '18:00-20:00'],
  complex_mahalla_surcharge: 3000,
  weather_surcharge_percent: 30,
  status: 'published',
  published_at: new Date(Date.now() - 86400000).toISOString(),
};

export function createTariffState() {
  return {
    draft: { ...DEFAULT_TARIFFS },
    published: { ...DEFAULT_TARIFFS },
  };
}

export function calculateDeliveryFee(tariffs, cartTotal, options = {}) {
  const t = tariffs.published;
  let fee = cartTotal >= t.free_delivery_threshold ? 0 : t.base_delivery_fee;
  if (options.distance_km > 3) fee += Math.floor((options.distance_km - 3) * t.distance_surcharge_per_km);
  if (options.peak) fee = Math.floor(fee * (1 + t.peak_surcharge_percent / 100));
  if (options.complex_mahalla) fee += t.complex_mahalla_surcharge;
  if (options.weather === 'rain') fee = Math.floor(fee * (1 + t.weather_surcharge_percent / 100));
  return fee;
}

export function previewTariffImpact(tariffs, draft) {
  const oldThreshold = tariffs.published.free_delivery_threshold;
  const newThreshold = draft.free_delivery_threshold ?? oldThreshold;
  const affected = Math.abs(newThreshold - oldThreshold) > 0 ? 12.5 : 3.2;
  return {
    orders_affected_percent: affected,
    estimated_gmv_delta: Math.floor(affected * 45000),
    message: `~${affected}% заказов затронуто изменением порога бесплатной доставки`,
  };
}
