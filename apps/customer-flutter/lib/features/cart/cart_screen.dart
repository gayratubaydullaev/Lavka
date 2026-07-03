import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/cart_provider.dart';
import '../../core/providers/loyalty_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/format.dart';
import '../../widgets/common_widgets.dart';

class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  final _promoController = TextEditingController();

  @override
  void dispose() {
    _promoController.dispose();
    super.dispose();
  }

  Future<void> _applyPromo() async {
    final subtotal = ref.read(cartProvider.notifier).subtotal;
    final err = await ref.read(loyaltyProvider.notifier).applyPromocode(_promoController.text.trim(), subtotal);
    if (!mounted) return;
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Промокод применён')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final loyalty = ref.watch(loyaltyProvider);
    final notifier = ref.read(cartProvider.notifier);
    final subtotal = notifier.subtotal;
    const freeThreshold = 100000;
    final remaining = freeThreshold - subtotal;
    final bonusApplied = loyalty.bonusToApply(subtotal);
    final total = (subtotal - loyalty.promoDiscount - bonusApplied).clamp(0, subtotal);

    return Scaffold(
      appBar: AppBar(title: const Text('Корзина')),
      body: cart.isEmpty
          ? const Center(child: Text('Корзина пуста'))
          : Column(
              children: [
                if (remaining > 0)
                  Container(
                    width: double.infinity,
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    padding: const EdgeInsets.all(12),
                    child: Text('До бесплатной доставки: ${formatPrice(remaining)}', style: const TextStyle(color: AppTheme.primary)),
                  ),
                Expanded(
                  child: ListView.builder(
                    itemCount: cart.length,
                    itemBuilder: (_, i) {
                      final item = cart[i];
                      return Dismissible(
                        key: ValueKey(item.product.id),
                        direction: DismissDirection.endToStart,
                        onDismissed: (_) => notifier.remove(item.product.id),
                        background: Container(color: Colors.red, alignment: Alignment.centerRight, padding: const EdgeInsets.only(right: 16), child: const Icon(Icons.delete, color: Colors.white)),
                        child: ListTile(
                          title: Text(item.product.localizedName('ru')),
                          subtitle: PriceTag(price: item.product.price),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(icon: const Icon(Icons.remove), onPressed: () => notifier.updateQuantity(item.product.id, item.quantity - 1)),
                              Text('${item.quantity.toInt()}'),
                              IconButton(icon: const Icon(Icons.add), onPressed: () => notifier.updateQuantity(item.product.id, item.quantity + 1)),
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
                              decoration: const InputDecoration(
                                labelText: 'Промокод',
                                hintText: 'WELCOME10',
                                isDense: true,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          OutlinedButton(onPressed: _applyPromo, child: const Text('Применить')),
                        ],
                      ),
                      if (loyalty.appliedPromoCode != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            '${loyalty.appliedPromoCode}: −${formatPrice(loyalty.promoDiscount)}',
                            style: const TextStyle(color: AppTheme.primary, fontSize: 13),
                          ),
                        ),
                      if (loyalty.balance > 0)
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text('Списать бонусы (${formatPrice(loyalty.balance)})'),
                          value: loyalty.useBonus,
                          onChanged: (v) => ref.read(loyaltyProvider.notifier).setUseBonus(v),
                        ),
                      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text('Итого'), PriceTag(price: total)]),
                      const SizedBox(height: 16),
                      ElevatedButton(onPressed: () => context.push('/checkout'), child: const Text('Оформить заказ')),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}
