/** Order state machine — TZ §3.2 transitions (mock implementation). */

const TRANSITIONS = {
  NEW: ['ACCEPTED', 'CANCELLED_BY_USER', 'CANCELLED_SYSTEM'],
  ACCEPTED: ['ASSEMBLY', 'CANCELLED_BY_USER', 'CANCELLED_SYSTEM'],
  ASSEMBLY: ['READY', 'PENDING_REPLACEMENT', 'CANCELLED_SYSTEM'],
  PENDING_REPLACEMENT: ['ASSEMBLY', 'CANCELLED_BY_USER'],
  READY: ['AWAITING_COURIER', 'CANCELLED_SYSTEM'],
  AWAITING_COURIER: ['IN_DELIVERY', 'CANCELLED_SYSTEM'],
  IN_DELIVERY: ['DELIVERED', 'CANCELLED_SYSTEM'],
  DELIVERED: [],
  CANCELLED_BY_USER: [],
  CANCELLED_SYSTEM: [],
};

export function canTransition(from, to) {
  return (TRANSITIONS[from] ?? []).includes(to);
}

export function transitionOrder(order, to) {
  if (!canTransition(order.status, to)) {
    return { ok: false, code: 'INVALID_TRANSITION', from: order.status, to };
  }
  order.status = to;
  return { ok: true, status: to };
}

export function allowedTransitions(status) {
  return TRANSITIONS[status] ?? [];
}
