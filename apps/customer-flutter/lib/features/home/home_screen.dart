import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_services.dart';
import '../../core/models/models.dart';
import '../../core/providers/cart_provider.dart';
import '../../core/providers/city_provider.dart';
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

  void _showCityPicker(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Выберите город', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
            ...cityOptions.map((c) => ListTile(
                  title: Text(c.nameRu),
                  subtitle: Text(c.subtitle),
                  trailing: ref.watch(cityProvider) == c.darkstoreId ? const Icon(Icons.check, color: Color(0xFF2E7D32)) : null,
                  onTap: () {
                    ref.read(cityProvider.notifier).select(c.darkstoreId);
                    ref.invalidate(categoriesProvider);
                    ref.invalidate(homeProductsProvider);
                    Navigator.pop(ctx);
                  },
                )),
            ListTile(
              leading: const Icon(Icons.notifications_outlined),
              title: const Text('Скоро в вашем городе'),
              subtitle: const Text('Лист ожидания для других махаллей'),
              onTap: () {
                ref.read(waitlistModeProvider.notifier).state = true;
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Вы в листе ожидания — мы сообщим, когда запустим доставку')),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final city = ref.watch(selectedCityProvider);
    final waitlist = ref.watch(waitlistModeProvider);
    final categoriesAsync = ref.watch(categoriesProvider);
    final productsAsync = ref.watch(homeProductsProvider);
    final cart = ref.watch(cartProvider);

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
                  Text('Jomboy Lavka • ${city.nameRu}', style: const TextStyle(fontSize: 18)),
                  const Icon(Icons.arrow_drop_down, size: 20),
                ],
              ),
              Text(city.subtitle, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.normal)),
            ],
          ),
        ),
        actions: [
          IconButton(icon: const Icon(Icons.search), onPressed: () => context.push('/search')),
          Stack(
            children: [
              IconButton(icon: const Icon(Icons.shopping_cart_outlined), onPressed: () => context.push('/cart')),
              if (cart.isNotEmpty)
                Positioned(
                  right: 8,
                  top: 8,
                  child: CircleAvatar(
                    radius: 8,
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    child: Text('${cart.length}', style: const TextStyle(fontSize: 10, color: Colors.white)),
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
                    const Text('Скоро в вашем городе', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    const Text('Мы расширяем зону доставки. Вы уже в листе ожидания.', textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    OutlinedButton(
                      onPressed: () {
                        ref.read(waitlistModeProvider.notifier).state = false;
                        _showCityPicker(context, ref);
                      },
                      child: const Text('Выбрать доступный город'),
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
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Wrap(
                        spacing: 8,
                        children: [
                          FilterChip(
                            label: const Text('Халяль'),
                            selected: ref.watch(catalogFilterProvider).halal == true,
                            onSelected: (v) {
                              ref.read(catalogFilterProvider.notifier).state = (
                                halal: v ? true : null,
                                brand: ref.read(catalogFilterProvider).brand,
                              );
                              ref.invalidate(homeProductsProvider);
                            },
                          ),
                          for (final b in ['Brand 1', 'Brand 2', 'Samarkand 1'])
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
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: SizedBox(
                      height: 100,
                      child: categoriesAsync.when(
                        data: (cats) => ListView.separated(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          itemCount: cats.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 8),
                          itemBuilder: (_, i) {
                            final c = cats[i];
                            return ActionChip(
                              label: Text(c.name['ru'] ?? ''),
                              onPressed: () => context.push('/category/${c.id}'),
                            );
                          },
                        ),
                        loading: () => const Center(child: CircularProgressIndicator()),
                        error: (e, _) => Center(child: Text('$e')),
                      ),
                    ),
                  ),
                  SliverPadding(
                    padding: const EdgeInsets.all(16),
                    sliver: productsAsync.when(
                      data: (products) => SliverGrid(
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, childAspectRatio: 0.72, crossAxisSpacing: 8, mainAxisSpacing: 8),
                        delegate: SliverChildBuilderDelegate(
                          (context, i) => ProductCard(
                            product: products[i],
                            onAdd: () {
                              ref.read(cartProvider.notifier).add(products[i]);
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Добавлено в корзину'), duration: Duration(seconds: 1)));
                            },
                          ),
                          childCount: products.length,
                        ),
                      ),
                      loading: () => const SliverFillRemaining(child: Center(child: CircularProgressIndicator())),
                      error: (e, _) => SliverFillRemaining(child: Center(child: Text('Ошибка загрузки: $e'))),
                    ),
                  ),
                  SliverToBoxAdapter(child: SizedBox(height: cart.isNotEmpty ? 80 : 16)),
                ],
              ),
            ),
      bottomNavigationBar: waitlist
          ? null
          : CartBar(
              itemCount: ref.read(cartProvider.notifier).itemCount,
              total: ref.read(cartProvider.notifier).subtotal,
              onTap: () => context.push('/cart'),
            ),
    );
  }
}
