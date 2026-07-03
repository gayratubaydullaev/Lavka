import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_services.dart';
import '../../core/utils/format.dart';
import '../../widgets/common_widgets.dart';

final loyaltyHistoryProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  return ref.read(loyaltyApiProvider).getHistory();
});

class LoyaltyHistoryScreen extends ConsumerWidget {
  const LoyaltyHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final history = ref.watch(loyaltyHistoryProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('История бонусов'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
      ),
      body: history.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Ошибка: $e')),
        data: (items) => items.isEmpty
            ? const Center(child: Text('Пока нет начислений'))
            : ListView.builder(
                itemCount: items.length,
                itemBuilder: (_, i) {
                  final h = items[i];
                  final amount = h['amount'] as int? ?? 0;
                  return ListTile(
                    leading: Icon(amount >= 0 ? Icons.add_circle_outline : Icons.remove_circle_outline, color: amount >= 0 ? Colors.green : Colors.red),
                    title: Text(h['type'] as String? ?? 'accrual'),
                    subtitle: Text(h['at'] as String? ?? ''),
                    trailing: Text(formatPrice(amount.abs())),
                  );
                },
              ),
      ),
    );
  }
}
