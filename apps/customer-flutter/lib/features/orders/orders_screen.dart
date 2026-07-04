import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_services.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/models/models.dart';
import '../../core/providers/locale_provider.dart';
import '../../core/utils/format.dart';
import '../../widgets/api_error_view.dart';
import '../../widgets/empty_state.dart';

class OrdersScreen extends ConsumerWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final locale = ref.watch(localeProvider);
    final ordersAsync = ref.watch(ordersListProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.orders)),
      body: ordersAsync.when(
        data: (orders) {
          if (orders.isEmpty) {
            return EmptyState(
              icon: Icons.receipt_long_outlined,
              title: l10n.ordersEmpty,
              subtitle: l10n.ordersEmptyHint,
              actionLabel: l10n.continueShopping,
              onAction: () => context.go('/'),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(ordersListProvider),
            child: ListView.separated(
              itemCount: orders.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, i) => _OrderTile(order: orders[i], locale: locale, l10n: l10n),
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ApiErrorView(error: e),
      ),
    );
  }
}

class _OrderTile extends ConsumerWidget {
  const _OrderTile({required this.order, required this.locale, required this.l10n});
  final OrderModel order;
  final Locale locale;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final canCancel = ['NEW', 'ACCEPTED'].contains(order.status);
    return ListTile(
      title: Text(l10n.orderNumber(order.id.substring(0, 8))),
      subtitle: Text('${orderStatusLabel(order.status, locale)} • ${formatPrice(order.totalAmount, locale: locale)}'),
      trailing: order.status == 'DELIVERED'
          ? Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.replay),
                  tooltip: l10n.repeatOrder,
                  onPressed: () => _repeat(context, ref),
                ),
                IconButton(icon: const Icon(Icons.star_outline), onPressed: () => _rate(context, ref)),
              ],
            )
          : canCancel
              ? IconButton(
                  icon: const Icon(Icons.cancel_outlined),
                  tooltip: l10n.cancelOrder,
                  onPressed: () => _cancel(context, ref),
                )
              : const Icon(Icons.chevron_right),
      onTap: () {
        if (!['DELIVERED', 'CANCELLED_BY_USER', 'CANCELLED'].contains(order.status)) {
          context.push('/order/${order.id}/track');
        }
      },
    );
  }

  Future<void> _repeat(BuildContext context, WidgetRef ref) async {
    try {
      final res = await ref.read(orderApiProvider).repeatOrder(order.id);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${l10n.repeatOrder}: ${res['order_id']}')));
        ref.invalidate(ordersListProvider);
      }
    } catch (e) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _cancel(BuildContext context, WidgetRef ref) async {
    try {
      await ref.read(orderApiProvider).cancelOrder(order.id);
      ref.invalidate(ordersListProvider);
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.orderCancelled)));
    } catch (e) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _rate(BuildContext context, WidgetRef ref) async {
    int rating = 5;
    await showDialog(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text(l10n.rateOrder),
          content: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              5,
              (i) => IconButton(
                icon: Icon(i < rating ? Icons.star : Icons.star_border, color: Colors.amber),
                onPressed: () => setState(() => rating = i + 1),
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () async {
                await ref.read(orderApiProvider).rateOrder(order.id, rating);
                if (context.mounted) Navigator.pop(context);
              },
              child: Text(l10n.submit),
            ),
          ],
        ),
      ),
    );
  }
}

final ordersListProvider = FutureProvider<List<OrderModel>>((ref) => ref.watch(orderApiProvider).getOrders());
