import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../api/api_services.dart';
import '../models/models.dart';

class CartItem {
  CartItem({required this.product, required this.quantity});
  final Product product;
  final double quantity;
  int get lineTotal => (product.price * quantity).round();
}

class CartRefreshResult {
  const CartRefreshResult({this.removed = 0, this.updated = 0});
  final int removed;
  final int updated;
  bool get changed => removed > 0 || updated > 0;
}

class CartNotifier extends StateNotifier<List<CartItem>> {
  CartNotifier() : super([]) {
    _load();
  }

  Box get _box => Hive.box('cart');

  String? get darkstoreId => _box.get('darkstore_id') as String?;

  void _load() {
    final raw = _box.get('items');
    if (raw is! List) return;
    state = raw
        .map((e) {
          final map = Map<String, dynamic>.from(e as Map);
          return CartItem(
            product: Product.fromJson(Map<String, dynamic>.from(map['product'] as Map)),
            quantity: (map['quantity'] as num).toDouble(),
          );
        })
        .where((i) => i.product.stock > 0)
        .toList();
  }

  void _save() {
    _box.put(
      'items',
      state
          .map((i) => {
                'product': i.product.toJson(),
                'quantity': i.quantity,
              })
          .toList(),
    );
  }

  void bindDarkstore(String darkstoreId) {
    _box.put('darkstore_id', darkstoreId);
  }

  bool isForDarkstore(String darkstoreId) {
    final saved = _box.get('darkstore_id') as String?;
    return saved == null || saved == darkstoreId;
  }

  bool add(Product product, {double quantity = 1, required String darkstoreId}) {
    if (product.stock <= 0) return false;
    if (!isForDarkstore(darkstoreId) && state.isNotEmpty) return false;
    bindDarkstore(darkstoreId);
    final idx = state.indexWhere((i) => i.product.id == product.id);
    if (idx >= 0) {
      final updated = [...state];
      final nextQty = (updated[idx].quantity + quantity).clamp(1.0, product.stock.toDouble()).toDouble();
      updated[idx] = CartItem(product: product, quantity: nextQty);
      state = updated;
    } else {
      final qty = quantity.clamp(1.0, product.stock.toDouble()).toDouble();
      state = [...state, CartItem(product: product, quantity: qty)];
    }
    _save();
    return true;
  }

  void remove(String productId) {
    state = state.where((i) => i.product.id != productId).toList();
    _save();
  }

  void updateQuantity(String productId, double quantity) {
    if (quantity <= 0) {
      remove(productId);
      return;
    }
    state = state
        .map((i) {
          if (i.product.id != productId) return i;
          final capped = quantity.clamp(1.0, i.product.stock.toDouble()).toDouble();
          return CartItem(product: i.product, quantity: capped);
        })
        .toList();
    _save();
  }

  void clear() {
    state = [];
    _box.delete('darkstore_id');
    _save();
  }

  void clearForDarkstoreChange() {
    clear();
  }

  Future<CartRefreshResult> refreshFromCatalog(CatalogApi api, String darkstoreId) async {
    if (state.isEmpty) return const CartRefreshResult();
    var removed = 0;
    var updated = 0;
    final next = <CartItem>[];
    for (final item in state) {
      final fresh = await api.getProduct(item.product.id, darkstoreId: darkstoreId);
      if (fresh == null || fresh.stock <= 0) {
        removed++;
        continue;
      }
      final qty = item.quantity.clamp(1.0, fresh.stock.toDouble()).toDouble();
      if (qty != item.quantity || fresh.price != item.product.price) updated++;
      next.add(CartItem(product: fresh, quantity: qty));
    }
    state = next;
    bindDarkstore(darkstoreId);
    _save();
    return CartRefreshResult(removed: removed, updated: updated);
  }

  int get subtotal => state.fold(0, (sum, i) => sum + i.lineTotal);
  int get itemCount => state.fold(0, (sum, i) => sum + i.quantity.round());

  List<Map<String, dynamic>> toOrderItems() =>
      state.map((i) => {'product_id': i.product.id, 'quantity': i.quantity}).toList();
}

final cartProvider = StateNotifierProvider<CartNotifier, List<CartItem>>((ref) => CartNotifier());
