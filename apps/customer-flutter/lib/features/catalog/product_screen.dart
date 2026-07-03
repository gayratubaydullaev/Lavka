import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_services.dart';
import '../../core/providers/city_provider.dart';
import '../../core/providers/cart_provider.dart';
import '../../core/utils/format.dart';
import '../../widgets/common_widgets.dart';

final productProvider = FutureProvider.family((ref, String id) async {
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
    final productAsync = ref.watch(productProvider(widget.productId));

    return Scaffold(
      appBar: AppBar(),
      body: productAsync.when(
        data: (product) {
          if (product == null) {
            return const Center(child: Text('Товар не найден'));
          }
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
                        child: CachedNetworkImage(imageUrl: product.images.first, height: 240, width: double.infinity, fit: BoxFit.cover),
                      ),
                    const SizedBox(height: 16),
                    Text(product.localizedName('ru'), style: Theme.of(context).textTheme.headlineSmall),
                    const SizedBox(height: 8),
                    if (product.isHalal) const HalalBadge(),
                    const SizedBox(height: 8),
                    PriceTag(price: product.price),
                    if (product.weightG != null) Text('${product.weightG} г', style: const TextStyle(color: Colors.grey)),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        IconButton(onPressed: () => setState(() => _qty = (_qty - 1).clamp(1, 99)), icon: const Icon(Icons.remove_circle_outline)),
                        Text('$_qty', style: const TextStyle(fontSize: 18)),
                        IconButton(onPressed: () => setState(() => _qty++), icon: const Icon(Icons.add_circle_outline)),
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
                  onPressed: () {
                    ref.read(cartProvider.notifier).add(product, quantity: _qty);
                    Navigator.pop(context);
                  },
                  child: Text('В корзину — ${formatPrice((product.price * _qty).round())}'),
                ),
              ),
            ),
          ],
        );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
      ),
    );
  }
}
