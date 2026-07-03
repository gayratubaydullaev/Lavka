import { iotAlerts } from '../wms/wms-data.js';

const STATUS_FLOW = [
  'NEW',
  'PAYMENT_PENDING',
  'ACCEPTED',
  'AWAITING_PICKER',
  'ASSEMBLY',
  'READY',
  'AWAITING_COURIER',
  'IN_DELIVERY',
  'DELIVERED',
];

export function buildOrderTimeline(order, ticket) {
  if (!order) return { events: [] };

  const base = new Date(order.created_at).getTime();
  const events = [];

  events.push({
    timestamp: order.created_at,
    type: 'status_change',
    actor: 'customer',
    payload: { status: 'NEW', message: 'Заказ создан' },
  });

  events.push({
    timestamp: new Date(base + 60000).toISOString(),
    type: 'payment',
    actor: 'billing',
    payload: { provider: 'payme', status: 'confirmed', amount: order.total_amount },
  });

  const statusIdx = STATUS_FLOW.indexOf(order.status);
  if (statusIdx >= 2) {
    events.push({
      timestamp: new Date(base + 120000).toISOString(),
      type: 'status_change',
      actor: 'order_service',
      payload: { status: 'ACCEPTED', message: 'Оплата подтверждена, сток зарезервирован' },
    });
  }
  if (statusIdx >= 4) {
    events.push({
      timestamp: new Date(base + 300000).toISOString(),
      type: 'status_change',
      actor: 'picker',
      payload: { status: 'ASSEMBLY', message: 'Сборка начата', picker: 'Жасур' },
    });
    for (const item of order.items ?? []) {
      events.push({
        timestamp: new Date(base + 360000 + Math.random() * 120000).toISOString(),
        type: 'barcode_scan',
        actor: 'picker',
        payload: { product: item.name, zone: item.zone, barcode: `8600000000${item.product_id?.slice(-3) ?? '001'}` },
      });
    }
  }
  if (statusIdx >= 5) {
    events.push({
      timestamp: new Date(base + 600000).toISOString(),
      type: 'status_change',
      actor: 'picker',
      payload: { status: 'READY', message: 'Упакован, зона выдачи HANDOFF-1' },
    });
  }
  if (statusIdx >= 7) {
    events.push({
      timestamp: new Date(base + 720000).toISOString(),
      type: 'status_change',
      actor: 'courier',
      payload: { status: 'IN_DELIVERY', message: 'Курьер забрал заказ', courier: order.courier?.name ?? 'Алишер' },
    });
    events.push({
      timestamp: new Date(base + 780000).toISOString(),
      type: 'geo',
      actor: 'courier',
      payload: { lat: 41.312, lng: 69.281, label: 'В пути к клиенту' },
    });
    events.push({
      timestamp: new Date(base + 840000).toISOString(),
      type: 'geo',
      actor: 'courier',
      payload: { lat: order.delivery_address?.coordinates?.lat ?? 41.315, lng: order.delivery_address?.coordinates?.lng ?? 69.285, label: 'У подъезда' },
    });
  }
  if (statusIdx >= 8) {
    events.push({
      timestamp: new Date(base + 900000).toISOString(),
      type: 'photo',
      actor: 'courier',
      payload: { url: 'mock://photo/door.jpg', label: 'Фото у двери' },
    });
    events.push({
      timestamp: new Date(base + 920000).toISOString(),
      type: 'status_change',
      actor: 'courier',
      payload: { status: 'DELIVERED', message: 'Доставлено' },
    });
  }

  const iotForOrder = iotAlerts.filter((a) => a.order_id === order.id);
  for (const alert of iotForOrder) {
    events.push({
      timestamp: alert.created_at,
      type: 'temperature',
      actor: 'iot',
      payload: {
        device_id: alert.device_id,
        temperature_c: alert.temperature_c,
        threshold_c: alert.threshold_c,
        severity: alert.severity,
      },
    });
  }

  if (order.items?.some((i) => i.zone === 'C')) {
    events.push({
      timestamp: new Date(base + 650000).toISOString(),
      type: 'temperature',
      actor: 'iot',
      payload: { device_id: 'TB-C-001', temperature_c: -18, threshold_c: 8, label: 'Термосумка при выдаче' },
    });
  }

  if (ticket) {
    events.push({
      timestamp: ticket.created_at,
      type: 'refund',
      actor: 'support',
      payload: { ticket_id: ticket.id, type: ticket.type, status: ticket.status },
    });
  }

  events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return { order_id: order.id, events };
}
