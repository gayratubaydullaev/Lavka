import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_services.dart';
import '../../core/models/models.dart';
import '../../core/providers/cart_provider.dart';
import '../../core/utils/format.dart';

class OrdersScreen extends ConsumerWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(ordersListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Заказы')),
      body: ordersAsync.when(
        data: (orders) => ListView.separated(
          itemCount: orders.length,
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (_, i) {
            final o = orders[i];
            final canCancel = ['NEW', 'ACCEPTED'].contains(o.status);
            return ListTile(
              title: Text('Заказ #${o.id.substring(0, 8)}'),
              subtitle: Text('${o.status} • ${formatPrice(o.totalAmount)}'),
              trailing: o.status == 'DELIVERED'
                  ? Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(icon: const Icon(Icons.replay), tooltip: 'Повторить', onPressed: () => _repeat(context, ref, o)),
                        IconButton(icon: const Icon(Icons.star_outline), onPressed: () => _rate(context, ref, o)),
                      ],
                    )
                  : canCancel
                      ? IconButton(icon: const Icon(Icons.cancel_outlined), tooltip: 'Отменить', onPressed: () => _cancel(context, ref, o))
                      : const Icon(Icons.chevron_right),
              onTap: () {
                if (!['DELIVERED', 'CANCELLED_BY_USER'].contains(o.status)) {
                  context.push('/order/${o.id}/track');
                }
              },
            );
          },
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
      ),
    );
  }

  Future<void> _repeat(BuildContext context, WidgetRef ref, OrderModel order) async {
    try {
      final res = await ref.read(orderApiProvider).repeatOrder(order.id);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Заказ повторён: ${res['order_id']}')));
        ref.invalidate(ordersListProvider);
      }
    } catch (e) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _cancel(BuildContext context, WidgetRef ref, OrderModel order) async {
    try {
      await ref.read(orderApiProvider).cancelOrder(order.id);
      ref.invalidate(ordersListProvider);
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Заказ отменён')));
    } catch (e) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _rate(BuildContext context, WidgetRef ref, OrderModel order) async {
    int rating = 5;
    await showDialog(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Оцените заказ'),
          content: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (i) => IconButton(
              icon: Icon(i < rating ? Icons.star : Icons.star_border, color: Colors.amber),
              onPressed: () => setState(() => rating = i + 1),
            )),
          ),
          actions: [
            TextButton(
              onPressed: () async {
                await ref.read(orderApiProvider).rateOrder(order.id, rating);
                if (context.mounted) Navigator.pop(context);
              },
              child: const Text('Отправить'),
            ),
          ],
        ),
      ),
    );
  }
}

final ordersListProvider = FutureProvider<List<OrderModel>>((ref) => ref.watch(orderApiProvider).getOrders());
