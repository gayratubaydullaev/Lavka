import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../models/models.dart';

class CartItem {
  CartItem({required this.product, required this.quantity});
  final Product product;
  final double quantity;
  int get lineTotal => (product.price * quantity).round();
}

class CartNotifier extends StateNotifier<List<CartItem>> {
  CartNotifier() : super([]) {
    _load();
  }

  Box get _box => Hive.box('cart');

  void _load() {
    // Cart persisted as product ids + qty in real app
  }

  void add(Product product, {double quantity = 1}) {
    final idx = state.indexWhere((i) => i.product.id == product.id);
    if (idx >= 0) {
      final updated = [...state];
      updated[idx] = CartItem(product: product, quantity: updated[idx].quantity + quantity);
      state = updated;
    } else {
      state = [...state, CartItem(product: product, quantity: quantity)];
    }
  }

  void remove(String productId) {
    state = state.where((i) => i.product.id != productId).toList();
  }

  void updateQuantity(String productId, double quantity) {
    if (quantity <= 0) {
      remove(productId);
      return;
    }
    state = state.map((i) => i.product.id == productId ? CartItem(product: i.product, quantity: quantity) : i).toList();
  }

  void clear() => state = [];

  int get subtotal => state.fold(0, (sum, i) => sum + i.lineTotal);
  int get itemCount => state.fold(0, (sum, i) => sum + i.quantity.round());

  List<Map<String, dynamic>> toOrderItems() =>
      state.map((i) => {'product_id': i.product.id, 'quantity': i.quantity}).toList();
}

final cartProvider = StateNotifierProvider<CartNotifier, List<CartItem>>((ref) => CartNotifier());
