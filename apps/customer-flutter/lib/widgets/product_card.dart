import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/models/models.dart';
import '../core/theme/app_theme.dart';
import 'common_widgets.dart';

class ProductCard extends StatelessWidget {
  const ProductCard({super.key, required this.product, this.onAdd, this.lang = 'ru'});
  final Product product;
  final VoidCallback? onAdd;
  final String lang;

  static SliverGridDelegate gridDelegate(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width > 900;
    return SliverGridDelegateWithFixedCrossAxisCount(
      crossAxisCount: wide ? 4 : 2,
      childAspectRatio: wide ? 0.72 : 0.62,
      crossAxisSpacing: 8,
      mainAxisSpacing: 8,
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/product/${product.id}'),
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                child: product.images.isNotEmpty
                    ? CachedNetworkImage(imageUrl: product.images.first, fit: BoxFit.cover, width: double.infinity)
                    : Container(color: AppTheme.surface, width: double.infinity),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 6, 8, 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    product.localizedName(lang),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 13, height: 1.2),
                  ),
                  if (product.isHalal) ...[
                    const SizedBox(height: 4),
                    const HalalBadge(),
                  ],
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Expanded(child: PriceTag(price: product.price, size: 13)),
                      IconButton(
                        icon: const Icon(Icons.add_circle, color: AppTheme.primary, size: 26),
                        onPressed: onAdd,
                        padding: EdgeInsets.zero,
                        visualDensity: VisualDensity.compact,
                        constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class CartBar extends StatelessWidget {
  const CartBar({super.key, required this.itemCount, required this.total, required this.onTap});
  final int itemCount;
  final int total;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    if (itemCount == 0) return const SizedBox.shrink();
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: ElevatedButton(
          onPressed: onTap,
          style: ElevatedButton.styleFrom(
            animationDuration: const Duration(milliseconds: 200),
          ),
          child: Row(
            children: [
              Flexible(child: Text('Корзина ($itemCount)', overflow: TextOverflow.ellipsis)),
              PriceTag(price: total, size: 16),
            ],
          ),
        ),
      ),
    );
  }
}
