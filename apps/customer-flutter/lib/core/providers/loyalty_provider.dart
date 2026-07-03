import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_services.dart';

class LoyaltyState {
  LoyaltyState({
    this.balance = 0,
    this.appliedPromoCode,
    this.promoDiscount = 0,
    this.useBonus = false,
    this.referralCode,
    this.referralInvites = 0,
  });

  final int balance;
  final String? appliedPromoCode;
  final int promoDiscount;
  final bool useBonus;
  final String? referralCode;
  final int referralInvites;

  LoyaltyState copyWith({
    int? balance,
    String? appliedPromoCode,
    int? promoDiscount,
    bool? useBonus,
    String? referralCode,
    int? referralInvites,
    bool clearPromo = false,
  }) {
    return LoyaltyState(
      balance: balance ?? this.balance,
      appliedPromoCode: clearPromo ? null : (appliedPromoCode ?? this.appliedPromoCode),
      promoDiscount: clearPromo ? 0 : (promoDiscount ?? this.promoDiscount),
      useBonus: useBonus ?? this.useBonus,
      referralCode: referralCode ?? this.referralCode,
      referralInvites: referralInvites ?? this.referralInvites,
    );
  }

  int bonusToApply(int subtotal) {
    if (!useBonus || balance <= 0) return 0;
    return balance.clamp(0, (subtotal * 0.5).floor());
  }
}

class LoyaltyNotifier extends StateNotifier<LoyaltyState> {
  LoyaltyNotifier(this._ref) : super(LoyaltyState()) {
    load();
  }

  final Ref _ref;

  Future<void> load() async {
    try {
      final api = _ref.read(loyaltyApiProvider);
      final wallet = await api.getWallet();
      final referral = await api.getReferral();
      state = state.copyWith(
        balance: wallet['balance'] as int? ?? 0,
        referralCode: referral['code'] as String?,
        referralInvites: referral['invites'] as int? ?? 0,
      );
    } catch (_) {}
  }

  Future<String?> applyPromocode(String code, int subtotal) async {
    try {
      final res = await _ref.read(loyaltyApiProvider).validatePromocode(code, subtotal);
      if (res['valid'] != true) return res['message'] as String? ?? 'Неверный промокод';
      state = state.copyWith(
        appliedPromoCode: code.toUpperCase(),
        promoDiscount: res['discount'] as int? ?? 0,
      );
      return null;
    } catch (e) {
      return e.toString();
    }
  }

  void clearPromo() => state = state.copyWith(clearPromo: true);

  void setUseBonus(bool value) => state = state.copyWith(useBonus: value);
}

final loyaltyProvider = StateNotifierProvider<LoyaltyNotifier, LoyaltyState>((ref) => LoyaltyNotifier(ref));
