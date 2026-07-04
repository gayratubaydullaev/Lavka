import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_services.dart';
import '../models/models.dart';
import '../providers/cart_provider.dart';
import '../providers/city_provider.dart';
import '../providers/location_provider.dart';
import '../providers/locale_provider.dart';
import '../utils/locale_utils.dart';

final categoryProductsProvider = FutureProvider.family<List<Product>, String>((ref, categoryId) {
  final darkstoreId = ref.watch(cityProvider);
  return ref.watch(catalogApiProvider).getProductsByCategory(darkstoreId: darkstoreId, categoryId: categoryId);
});

final categoryTitleProvider = FutureProvider.family<String, String>((ref, categoryId) async {
  final darkstoreId = ref.watch(cityProvider);
  final lang = ref.read(localeProvider).productLangKey;
  final categories = await ref.watch(catalogApiProvider).getCategories(darkstoreId: darkstoreId);
  final matches = categories.where((c) => c.id == categoryId);
  if (matches.isEmpty) return categoryId;
  final cat = matches.first;
  return cat.name[lang] ?? cat.name['ru'] ?? cat.id;
});

final cartDeliveryQuoteProvider = FutureProvider.autoDispose<DeliveryQuote?>((ref) async {
  final cart = ref.watch(cartProvider);
  if (cart.isEmpty) return null;
  final subtotal = ref.read(cartProvider.notifier).subtotal;
  final darkstoreId = ref.watch(cityProvider);
  final loc = await ref.watch(userLocationProvider.future);
  return ref.read(orderApiProvider).getDeliveryQuote(
        darkstoreId,
        subtotal,
        lat: loc.lat,
        lng: loc.lng,
      );
});
