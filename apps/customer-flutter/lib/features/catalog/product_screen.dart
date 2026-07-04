import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_services.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/models/models.dart';
import '../../core/providers/city_provider.dart';
import '../../core/providers/cart_provider.dart';
import '../../core/providers/locale_provider.dart';
import '../../core/utils/format.dart';
import '../../core/utils/locale_utils.dart';
import '../../widgets/api_error_view.dart';
import '../../widgets/common_widgets.dart';

final productProvider = FutureProvider.family<Product?, String>((ref, id) async {
  final api = ref.watch(catalogApiProvider);
  final darkstoreId = ref.watch(cityProvider);
  return api.getProduct(id, darkstoreId: darkstoreId);
});

class ProductScreen extends ConsumerStatefulWidget {
  const ProductScreen({super.key, required this.productId});
  final String productId;

  @override
  ConsumerState<ProductScreen> createState() => _ProductScreenState();
}

class _ProductScreenState extends ConsumerState<ProductScreen> {
  double _qty = 1;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final lang = ref.watch(localeProvider).productLangKey;
    final productAsync = ref.watch(productProvider(widget.productId));

    return Scaffold(
      appBar: AppBar(),
      body: productAsync.when(
        data: (product) {
          if (product == null) {
            return Center(child: Text(l10n.searchNothing));
          }
          final inStock = product.stock > 0;
          final maxQty = product.stock.toDouble().clamp(1, 99);
          return Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (product.images.isNotEmpty)
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: CachedNetworkImage(
                            imageUrl: product.images.first,
                            height: 240,
                            width: double.infinity,
                            fit: BoxFit.cover,
                          ),
                        ),
                      const SizedBox(height: 16),
                      Text(product.localizedName(lang), style: Theme.of(context).textTheme.headlineSmall),
                      const SizedBox(height: 8),
                      if (product.isHalal) HalalBadge(label: l10n.halal),
                      if (!inStock)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(l10n.outOfStock, style: const TextStyle(color: Colors.red, fontWeight: FontWeight.w600)),
                        ),
                      const SizedBox(height: 8),
                      PriceTag(price: product.price),
                      if (product.weightG != null) Text('${product.weightG} г', style: const TextStyle(color: Colors.grey)),
                      if (product.brand != null) Text(product.brand!, style: const TextStyle(color: Colors.grey)),
                      if (inStock)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text('${l10n.stockAvailable(product.stock)}', style: const TextStyle(fontSize: 13, color: Colors.grey)),
                        ),
                      const SizedBox(height: 16),
                      if (inStock)
                        Row(
                          children: [
                            IconButton(
                              onPressed: () => setState(() => _qty = (_qty - 1).clamp(1.0, maxQty).toDouble()),
                              icon: const Icon(Icons.remove_circle_outline),
                            ),
                            Text('${_qty.toInt()}', style: const TextStyle(fontSize: 18)),
                            IconButton(
                              onPressed: _qty >= maxQty ? null : () => setState(() => _qty = (_qty + 1).clamp(1.0, maxQty).toDouble()),
                              icon: const Icon(Icons.add_circle_outline),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
              ),
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: ElevatedButton(
                    onPressed: inStock
                        ? () {
                            ref.read(cartProvider.notifier).add(
                                  product,
                                  quantity: _qty,
                                  darkstoreId: ref.read(cityProvider),
                                );
                            context.pop();
                          }
                        : null,
                    child: Text(
                      inStock
                          ? '${l10n.cart} — ${formatPrice((product.price * _qty).round())}'
                          : l10n.outOfStock,
                    ),
                  ),
                ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ApiErrorView(error: e),
      ),
    );
  }
}
