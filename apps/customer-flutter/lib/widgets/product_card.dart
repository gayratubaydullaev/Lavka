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

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/product/${product.id}'),
      child: Card(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 1,
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                child: product.images.isNotEmpty
                    ? CachedNetworkImage(imageUrl: product.images.first, fit: BoxFit.cover)
                    : Container(color: AppTheme.surface),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.localizedName(lang), maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 14)),
                  const SizedBox(height: 4),
                  if (product.isHalal) const HalalBadge(),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      PriceTag(price: product.price, size: 14),
                      IconButton(
                        icon: const Icon(Icons.add_circle, color: AppTheme.primary),
                        onPressed: onAdd,
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
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
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Корзина ($itemCount)'),
              PriceTag(price: total, size: 16),
            ],
          ),
        ),
      ),
    );
  }
}
