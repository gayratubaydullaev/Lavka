import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n/app_localizations.dart';
import '../../core/providers/city_provider.dart';
import '../../core/providers/cart_provider.dart';
import '../../core/providers/catalog_providers.dart';
import '../../core/providers/locale_provider.dart';
import '../../core/utils/locale_utils.dart';
import '../../widgets/api_error_view.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/product_card.dart';

class CategoryScreen extends ConsumerWidget {
  const CategoryScreen({super.key, required this.categoryId});
  final String categoryId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final lang = ref.watch(localeProvider).productLangKey;
    final productsAsync = ref.watch(categoryProductsProvider(categoryId));
    final titleAsync = ref.watch(categoryTitleProvider(categoryId));

    return Scaffold(
      appBar: AppBar(
        title: titleAsync.when(
          data: (title) => Text(title),
          loading: () => Text(l10n.category),
          error: (_, __) => Text(l10n.category),
        ),
      ),
      body: productsAsync.when(
        data: (products) {
          if (products.isEmpty) {
            return EmptyState(
              icon: Icons.inventory_2_outlined,
              title: l10n.searchNothing,
              actionLabel: l10n.continueShopping,
              onAction: () => context.go('/'),
            );
          }
          return GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: ProductCard.gridDelegate(context),
            itemCount: products.length,
            itemBuilder: (_, i) => ProductCard(
              product: products[i],
              lang: lang,
              outOfStockLabel: l10n.outOfStock,
              halalLabel: l10n.halal,
              onAdd: () {
                final added = ref.read(cartProvider.notifier).add(
                      products[i],
                      darkstoreId: ref.read(cityProvider),
                    );
                if (added && context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(l10n.addedToCart), duration: const Duration(seconds: 1)),
                  );
                }
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ApiErrorView(error: e),
      ),
    );
  }
}
