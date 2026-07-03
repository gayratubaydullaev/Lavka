export const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:4010/api/v1';
export const DARKSTORE_ID = import.meta.env?.VITE_DARKSTORE_ID ?? 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('jomboy_token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    let message = `API ${res.status}: ${path}`;
    try {
      const body = (await res.json()) as { message?: string; code?: string };
      if (body.message) message = body.message;
    } catch {
      /* ignore non-JSON */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function formatUzs(amount: number): string {
  return `${amount.toLocaleString('ru-RU')} сум`;
}

export type OrderStatus =
  | 'NEW' | 'ACCEPTED' | 'AWAITING_PICKER' | 'ASSEMBLY' | 'READY'
  | 'AWAITING_COURIER' | 'IN_DELIVERY' | 'DELIVERED' | 'CANCELLED_BY_USER';

export interface Order {
  id: string;
  status: OrderStatus;
  total_amount: number;
  delivery_fee: number;
  subtotal: number;
  items: Array<{ product_id: string; name: string; quantity: number; price: number }>;
  created_at?: string;
  eta_minutes?: number;
}

export interface Ticket {
  id: string;
  order_id: string;
  status: string;
  priority: string;
  type: string;
  description: string;
  customer_name: string;
  customer_id?: string;
  created_at: string;
  sla_deadline: string;
  risk_score?: number;
  trust_score?: number;
  fraud_flags?: Array<{ code: string; message: string; severity: string }>;
  fraud_recommendation?: string;
  auto_refund?: boolean;
}

export interface DashboardData {
  active_orders: number;
  pickers_online: number;
  couriers_on_route: number;
  orders_today: number;
  avg_assembly_minutes: number;
  alerts: Array<{ id: string; type: string; message: string; severity: string }>;
}

export interface GmvReport {
  gmv: number;
  orders_count: number;
  avg_order_value: number;
  otd_percent: number;
  daily: Array<{ date: string; gmv: number; orders: number }>;
}
