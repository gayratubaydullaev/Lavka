import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_services.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/providers/cart_provider.dart';
import '../../core/providers/catalog_providers.dart';
import '../../core/providers/city_provider.dart';
import '../../core/providers/loyalty_provider.dart';
import '../../core/providers/locale_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/format.dart';
import '../../core/utils/locale_utils.dart';
import '../../core/utils/scaffold_config.dart';
import '../../widgets/common_widgets.dart';
import '../../widgets/empty_state.dart';

class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  final _promoController = TextEditingController();
  bool _refreshing = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _refreshCart(showSnackBar: false));
  }

  @override
  void dispose() {
    _promoController.dispose();
    super.dispose();
  }

  Future<void> _refreshCart({bool showSnackBar = true}) async {
    final cart = ref.read(cartProvider);
    if (cart.isEmpty || _refreshing) return;
    setState(() => _refreshing = true);
    try {
      final result = await ref.read(cartProvider.notifier).refreshFromCatalog(
            ref.read(catalogApiProvider),
            ref.read(cityProvider),
          );
      if (showSnackBar && mounted && result.changed) {
        final l10n = AppLocalizations.of(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.cartUpdated(result.removed, result.updated))),
        );
      }
      ref.invalidate(cartDeliveryQuoteProvider);
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  Future<void> _applyPromo() async {
    final subtotal = ref.read(cartProvider.notifier).subtotal;
    final err = await ref.read(loyaltyProvider.notifier).applyPromocode(_promoController.text.trim(), subtotal);
    if (!mounted) return;
    final l10n = AppLocalizations.of(context);
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.promoApplied(_promoController.text.trim().toUpperCase()))));
    }
  }

  Future<void> _goCheckout() async {
    await _refreshCart();
    if (!mounted) return;
    if (ref.read(cartProvider).isEmpty) return;
    context.push('/checkout');
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final locale = ref.watch(localeProvider);
    final lang = locale.productLangKey;
    final cart = ref.watch(cartProvider);
    final loyalty = ref.watch(loyaltyProvider);
    final quoteAsync = ref.watch(cartDeliveryQuoteProvider);
    final notifier = ref.read(cartProvider.notifier);
    final subtotal = notifier.subtotal;
    final remaining = quoteAsync.value?.freeDeliveryRemaining ?? (100000 - subtotal).clamp(0, 100000);
    final bonusApplied = loyalty.bonusToApply(subtotal);
    final total = (subtotal - loyalty.promoDiscount - bonusApplied).clamp(0, subtotal);

    return Scaffold(
      resizeToAvoidBottomInset: scaffoldResizeToAvoidBottomInset,
      appBar: AppBar(
        title: Text(l10n.cart),
        actions: [
          if (cart.isNotEmpty)
            IconButton(
              icon: _refreshing ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.refresh),
              onPressed: _refreshing ? null : () => _refreshCart(),
            ),
        ],
      ),
      body: cart.isEmpty
          ? EmptyState(
              icon: Icons.shopping_cart_outlined,
              title: l10n.cartEmpty,
              subtitle: l10n.cartEmptyHint,
              actionLabel: l10n.continueShopping,
              onAction: () => context.go('/'),
            )
          : Column(
              children: [
                if (remaining > 0)
                  Container(
                    width: double.infinity,
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    padding: const EdgeInsets.all(12),
                    child: Text(
                      l10n.freeDeliveryRemaining(formatPrice(remaining, locale: locale)),
                      style: const TextStyle(color: AppTheme.primary),
                    ),
                  ),
                if (quoteAsync.value != null)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                    child: Row(
                      children: [
                        const Icon(Icons.local_shipping_outlined, size: 18, color: AppTheme.primary),
                        const SizedBox(width: 6),
                        Text(
                          l10n.deliveryEta(
                            quoteAsync.value!.estimatedMinutes,
                            formatPrice(quoteAsync.value!.deliveryFee, locale: locale),
                          ),
                          style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                        ),
                      ],
                    ),
                  ),
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    itemCount: cart.length,
                    itemBuilder: (_, i) {
                      final item = cart[i];
                      final atMax = item.quantity >= item.product.stock;
                      return Dismissible(
                        key: ValueKey(item.product.id),
                        direction: DismissDirection.endToStart,
                        onDismissed: (_) => notifier.remove(item.product.id),
                        background: Container(
                          color: Colors.red,
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 16),
                          child: const Icon(Icons.delete, color: Colors.white),
                        ),
                        child: ListTile(
                          leading: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: item.product.images.isNotEmpty
                                ? CachedNetworkImage(
                                    imageUrl: item.product.images.first,
                                    width: 48,
                                    height: 48,
                                    fit: BoxFit.cover,
                                  )
                                : Container(width: 48, height: 48, color: AppTheme.surface),
                          ),
                          title: Text(item.product.localizedName(lang), maxLines: 2, overflow: TextOverflow.ellipsis),
                          subtitle: PriceTag(price: item.product.price, locale: locale),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.remove),
                                onPressed: () => notifier.updateQuantity(item.product.id, item.quantity - 1),
                              ),
                              Text('${item.quantity.toInt()}'),
                              IconButton(
                                icon: Icon(Icons.add, color: atMax ? Colors.grey : null),
                                onPressed: atMax ? null : () => notifier.updateQuantity(item.product.id, item.quantity + 1),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _promoController,
                              decoration: InputDecoration(
                                labelText: l10n.promocode,
                                hintText: 'WELCOME10',
                                isDense: true,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          OutlinedButton(onPressed: _applyPromo, child: Text(l10n.apply)),
                        ],
                      ),
                      if (loyalty.appliedPromoCode != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            '${loyalty.appliedPromoCode}: −${formatPrice(loyalty.promoDiscount, locale: locale)}',
                            style: const TextStyle(color: AppTheme.primary, fontSize: 13),
                          ),
                        ),
                      if (loyalty.balance > 0)
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text('${l10n.useBonus} (${formatPrice(loyalty.balance, locale: locale)})'),
                          value: loyalty.useBonus,
                          onChanged: (v) => ref.read(loyaltyProvider.notifier).setUseBonus(v),
                        ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [Text(l10n.total), PriceTag(price: total, locale: locale)],
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(onPressed: _goCheckout, child: Text(l10n.checkout)),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}
