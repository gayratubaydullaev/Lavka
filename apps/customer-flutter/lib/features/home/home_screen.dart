import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_services.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/models/models.dart';
import '../../core/providers/cart_provider.dart';
import '../../core/providers/city_provider.dart';
import '../../core/providers/locale_provider.dart';
import '../../core/utils/locale_utils.dart';
import '../../widgets/api_error_view.dart';
import '../../widgets/product_card.dart';

final categoriesProvider = FutureProvider<List<Category>>((ref) {
  final id = ref.watch(cityProvider);
  return ref.watch(catalogApiProvider).getCategories(darkstoreId: id);
});

final catalogFilterProvider = StateProvider<({bool? halal, String? brand})>((ref) => (halal: null, brand: null));

final homeProductsProvider = FutureProvider<List<Product>>((ref) {
  final id = ref.watch(cityProvider);
  final filter = ref.watch(catalogFilterProvider);
  return ref.watch(catalogApiProvider).getProductsFiltered(
        darkstoreId: id,
        isHalal: filter.halal,
        brand: filter.brand,
      );
});

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  Future<void> _selectCity(BuildContext context, WidgetRef ref, String darkstoreId) async {
    final cart = ref.read(cartProvider);
    final cartNotifier = ref.read(cartProvider.notifier);
    final current = ref.read(cityProvider);
    if (darkstoreId == current) return;

    if (cart.isNotEmpty && !cartNotifier.isForDarkstore(darkstoreId)) {
      final l10n = AppLocalizations.of(context);
      final clear = await showDialog<bool>(
        context: context,
        builder: (_) => AlertDialog(
          title: Text(l10n.citySwitchTitle),
          content: Text(l10n.citySwitchBody),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l10n.keepCart)),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(l10n.clearCart)),
          ],
        ),
      );
      if (clear != true) return;
      cartNotifier.clearForDarkstoreChange();
    }

    ref.read(cityProvider.notifier).select(darkstoreId);
    ref.invalidate(categoriesProvider);
    ref.invalidate(homeProductsProvider);
  }

  void _showCityPicker(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final lang = ref.read(localeProvider).productLangKey;
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(l10n.selectCity, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
            ...cityOptions.map((c) => ListTile(
                  title: Text(c.nameFor(lang)),
                  subtitle: Text(c.subtitleFor(lang)),
                  trailing: ref.watch(cityProvider) == c.darkstoreId ? const Icon(Icons.check, color: Color(0xFF2E7D32)) : null,
                  onTap: () async {
                    Navigator.pop(ctx);
                    await _selectCity(context, ref, c.darkstoreId);
                  },
                )),
            ListTile(
              leading: const Icon(Icons.notifications_outlined),
              title: Text(l10n.waitlistTitle),
              subtitle: Text(l10n.waitlistBody),
              onTap: () {
                persistWaitlistMode(true);
                ref.read(waitlistModeProvider.notifier).state = true;
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.waitlistSnackbar)));
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final lang = ref.watch(localeProvider).productLangKey;
    final city = ref.watch(selectedCityProvider);
    final waitlist = ref.watch(waitlistModeProvider);
    final categoriesAsync = ref.watch(categoriesProvider);
    final productsAsync = ref.watch(homeProductsProvider);
    final cart = ref.watch(cartProvider);
    final cartCount = ref.watch(cartProvider.notifier).itemCount;

    return Scaffold(
      appBar: AppBar(
        title: GestureDetector(
          onTap: () => _showCityPicker(context, ref),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('${l10n.appName} • ${city.nameFor(lang)}', style: const TextStyle(fontSize: 18)),
                  const Icon(Icons.arrow_drop_down, size: 20),
                ],
              ),
              Text(city.subtitleFor(lang), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.normal)),
            ],
          ),
        ),
        actions: [
          IconButton(icon: const Icon(Icons.search), onPressed: () => context.push('/search')),
          Stack(
            clipBehavior: Clip.none,
            children: [
              IconButton(icon: const Icon(Icons.shopping_cart_outlined), onPressed: () => context.push('/cart')),
              if (cartCount > 0)
                Positioned(
                  right: 6,
                  top: 6,
                  child: CircleAvatar(
                    radius: 9,
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    child: Text(
                      cartCount > 99 ? '99+' : '$cartCount',
                      style: const TextStyle(fontSize: 10, color: Colors.white),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
      body: waitlist
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.location_off_outlined, size: 64, color: Colors.grey),
                    const SizedBox(height: 16),
                    Text(l10n.waitlistTitle, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Text(l10n.waitlistBody, textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    OutlinedButton(
                      onPressed: () {
                        ref.read(waitlistModeProvider.notifier).state = false;
                        _showCityPicker(context, ref);
                      },
                      child: Text(l10n.selectCity),
                    ),
                  ],
                ),
              ),
            )
          : RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(categoriesProvider);
                ref.invalidate(homeProductsProvider);
              },
              child: CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: productsAsync.when(
                      data: (products) {
                        final brands = products.map((p) => p.brand).whereType<String>().toSet().toList()..sort();
                        return Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          child: Wrap(
                            spacing: 8,
                            runSpacing: 4,
                            children: [
                              FilterChip(
                                label: Text(l10n.halal),
                                selected: ref.watch(catalogFilterProvider).halal == true,
                                onSelected: (v) {
                                  ref.read(catalogFilterProvider.notifier).state = (
                                    halal: v ? true : null,
                                    brand: ref.read(catalogFilterProvider).brand,
                                  );
                                  ref.invalidate(homeProductsProvider);
                                },
                              ),
                              for (final b in brands.take(6))
                                FilterChip(
                                  label: Text(b),
                                  selected: ref.watch(catalogFilterProvider).brand == b,
                                  onSelected: (v) {
                                    ref.read(catalogFilterProvider.notifier).state = (
                                      halal: ref.read(catalogFilterProvider).halal,
                                      brand: v ? b : null,
                                    );
                                    ref.invalidate(homeProductsProvider);
                                  },
                                ),
                            ],
                          ),
                        );
                      },
                      loading: () => const SizedBox.shrink(),
                      error: (_, __) => const SizedBox.shrink(),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: SizedBox(
                      height: 108,
                      child: categoriesAsync.when(
                        data: (cats) => ListView.separated(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          itemCount: cats.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 10),
                          itemBuilder: (_, i) {
                            final c = cats[i];
                            final name = c.name[lang] ?? c.name['ru'] ?? '';
                            return InkWell(
                              onTap: () => context.push('/category/${c.id}'),
                              borderRadius: BorderRadius.circular(12),
                              child: SizedBox(
                                width: 72,
                                child: Column(
                                  children: [
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(12),
                                      child: c.imageUrl != null
                                          ? CachedNetworkImage(
                                              imageUrl: c.imageUrl!,
                                              width: 56,
                                              height: 56,
                                              fit: BoxFit.cover,
                                              errorWidget: (_, __, ___) => _categoryPlaceholder(name),
                                            )
                                          : _categoryPlaceholder(name),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      name,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(fontSize: 11),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                        loading: () => const Center(child: CircularProgressIndicator()),
                        error: (e, _) => Center(child: ApiErrorView(error: e)),
                      ),
                    ),
                  ),
                  SliverPadding(
                    padding: const EdgeInsets.all(16),
                    sliver: productsAsync.when(
                      data: (products) => SliverGrid(
                        gridDelegate: ProductCard.gridDelegate(context),
                        delegate: SliverChildBuilderDelegate(
                          (context, i) => ProductCard(
                            product: products[i],
                            lang: lang,
                            outOfStockLabel: l10n.outOfStock,
                            halalLabel: l10n.halal,
                            onAdd: () {
                              final added = ref.read(cartProvider.notifier).add(
                                    products[i],
                                    darkstoreId: ref.read(cityProvider),
                                  );
                              if (added) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(l10n.addedToCart), duration: const Duration(seconds: 1)),
                                );
                              }
                            },
                          ),
                          childCount: products.length,
                        ),
                      ),
                      loading: () => const SliverFillRemaining(child: Center(child: CircularProgressIndicator())),
                      error: (e, _) => SliverFillRemaining(child: ApiErrorView(error: e)),
                    ),
                  ),
                  SliverToBoxAdapter(child: SizedBox(height: cart.isNotEmpty ? 72 : 16)),
                ],
              ),
            ),
      bottomNavigationBar: waitlist
          ? null
          : CartBar(
              itemCount: cartCount,
              total: ref.read(cartProvider.notifier).subtotal,
              label: l10n.cart,
              onTap: () => context.push('/cart'),
            ),
    );
  }

  Widget _categoryPlaceholder(String name) {
    return Container(
      width: 56,
      height: 56,
      color: const Color(0xFFE8F5E9),
      alignment: Alignment.center,
      child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?', style: const TextStyle(color: Color(0xFF2E7D32), fontWeight: FontWeight.bold)),
    );
  }
}
