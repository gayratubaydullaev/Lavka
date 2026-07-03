import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_services.dart';
import '../../core/providers/cart_provider.dart';
import '../../widgets/product_card.dart';
import '../home/home_screen.dart';

class CategoryScreen extends ConsumerWidget {
  const CategoryScreen({super.key, required this.categoryId});
  final String categoryId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productsAsync = ref.watch(homeProductsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Категория')),
      body: productsAsync.when(
        data: (products) {
          final filtered = products.where((p) => p.category == categoryId).toList();
          final list = filtered.isEmpty ? products : filtered;
          return GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: ProductCard.gridDelegate(context),
            itemCount: list.length,
            itemBuilder: (_, i) => ProductCard(
              product: list[i],
              onAdd: () => ref.read(cartProvider.notifier).add(list[i]),
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
      ),
    );
  }
}