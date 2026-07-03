export interface Darkstore {
  id: string;
  city: string;
  city_ru: string;
  name: string;
  radius_km: number;
  sku_count: number;
  orders_today?: number;
  gmv_today?: number;
  active_orders?: number;
}

export interface CohortReport {
  darkstore_id: string;
  label: string;
  weeks: string[];
  cohorts: Array<{ cohort: string; size: number; retention: (number | null)[] }>;
}

export interface FunnelStep {
  step: string;
  count: number;
  label: string;
}

export interface BiSummary {
  darkstore_id: string;
  ltv_uzs: number;
  cac_uzs: number;
  retention_d30: number;
  nps: number;
  orders_per_day: number;
}

export interface TariffConfig {
  free_delivery_threshold: number;
  base_delivery_fee: number;
  distance_surcharge_per_km: number;
  peak_surcharge_percent: number;
  complex_mahalla_surcharge: number;
  weather_surcharge_percent: number;
  status?: string;
  published_at?: string;
}

export interface AuditEntry {
  id: string;
  user_id: string;
  action: string;
  payload: Record<string, unknown>;
  ip: string;
  timestamp: string;
}

export interface FraudStats {
  blocked_count: number;
  flagged_count: number;
  false_positive_rate: number;
  fraud_loss_gmv_pct: number;
  confirmed_fraud_count?: number;
}

export interface BlockedOrder {
  id: string;
  order_id: string;
  customer_id: string;
  reason: string;
  amount: number;
  darkstore_id: string;
  status: string;
  created_at: string;
}

export const DARKSTORE_TASHKENT = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
export const DARKSTORE_SAMARKAND = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
