export const PROMO_CODES = {
  WELCOME10: { discount_percent: 10, min_order: 30000, max_uses: 1, description: 'Скидка 10% на первый заказ' },
  FRIEND5000: { discount_fixed: 5000, min_order: 50000, max_uses: 999, description: '5000 сум от друга' },
  HALAL15: { discount_percent: 15, min_order: 80000, halal_only: true, max_uses: 5, description: '15% на халяль' },
};

export function createLoyaltyState() {
  return {
    wallets: new Map(),
    referralCodes: new Map(),
    promoUses: new Map(),
    history: [
      { user_id: 'cust-dilshod', type: 'accrual', amount: 890, at: new Date(Date.now() - 86400000).toISOString() },
      { user_id: 'cust-dilshod', type: 'spend', amount: -2500, at: new Date(Date.now() - 172800000).toISOString() },
    ],
  };
}

function defaultWallet(userId) {
  return {
    user_id: userId,
    balance: 12500,
    lifetime_earned: 45000,
    lifetime_spent: 32500,
    accrual_rate: 0.01,
  };
}

export function getWallet(loyalty, userId) {
  if (!loyalty.wallets.has(userId)) {
    loyalty.wallets.set(userId, defaultWallet(userId));
  }
  return loyalty.wallets.get(userId);
}

export function getReferral(loyalty, userId) {
  if (!loyalty.referralCodes.has(userId)) {
    const code = `JOMBOY-${userId.slice(-4).toUpperCase()}`;
    loyalty.referralCodes.set(userId, {
      code,
      invites: 3,
      bonuses_earned: 15000,
      pending: 1,
    });
  }
  return loyalty.referralCodes.get(userId);
}

export function validatePromocode(code, subtotal, itemsHalal = false) {
  const promo = PROMO_CODES[code?.toUpperCase()];
  if (!promo) return { valid: false, message: 'Промокод не найден' };
  if (subtotal < (promo.min_order ?? 0)) {
    return { valid: false, message: `Минимальная сумма заказа ${promo.min_order} сум` };
  }
  if (promo.halal_only && !itemsHalal) {
    return { valid: false, message: 'Промокод только для халяль-товаров' };
  }

  let discount = 0;
  if (promo.discount_percent) discount = Math.floor(subtotal * promo.discount_percent / 100);
  if (promo.discount_fixed) discount = promo.discount_fixed;

  return {
    valid: true,
    code: code.toUpperCase(),
    discount,
    description: promo.description,
  };
}

export function applyOrderLoyalty(loyalty, userId, { subtotal, promocode, bonus_points_to_spend = 0 }) {
  const wallet = getWallet(loyalty, userId);
  let discount = 0;
  let promoResult = null;

  if (promocode) {
    promoResult = validatePromocode(promocode, subtotal);
    if (promoResult.valid) discount += promoResult.discount;
  }

  const maxBonus = Math.min(wallet.balance, Math.floor(subtotal * 0.5));
  const bonusUsed = Math.min(bonus_points_to_spend, maxBonus);
  if (bonusUsed > 0) {
    wallet.balance -= bonusUsed;
    wallet.lifetime_spent += bonusUsed;
    discount += bonusUsed;
  }

  return { discount, bonus_used: bonusUsed, promo: promoResult };
}

export function accrueBonus(loyalty, userId, orderTotal) {
  const wallet = getWallet(loyalty, userId);
  const earned = Math.floor(orderTotal * wallet.accrual_rate);
  wallet.balance += earned;
  wallet.lifetime_earned += earned;
  loyalty.history.unshift({
    user_id: userId,
    type: 'accrual',
    amount: earned,
    at: new Date().toISOString(),
  });
  return earned;
}

export function getLoyaltyHistory(loyalty, userId) {
  return loyalty.history.filter((h) => h.user_id === userId).slice(0, 20);
}
