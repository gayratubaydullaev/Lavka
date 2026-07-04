import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../api/dio_provider.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';

final catalogApiProvider = Provider<CatalogApi>((ref) => CatalogApi(ref.watch(dioProvider)));
final orderApiProvider = Provider<OrderApi>((ref) => OrderApi(ref.watch(dioProvider)));
final authApiProvider = Provider<AuthApi>((ref) => AuthApi(ref.watch(dioProvider)));
final loyaltyApiProvider = Provider<LoyaltyApi>((ref) {
  final userId = ref.watch(authProvider).userId ?? 'guest';
  return LoyaltyApi(ref.watch(dioProvider), userId: userId);
});

class AuthApi {
  AuthApi(this._dio);
  final Dio _dio;

  Future<Map<String, dynamic>> sendOtp(String phone) async {
    final res = await _dio.post('/auth/otp/send', data: {'phone': phone});
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> verifyOtp(String sessionId, String code) async {
    final res = await _dio.post('/auth/otp/verify', data: {'session_id': sessionId, 'code': code});
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> createGuestSession() async {
    final res = await _dio.post('/auth/guest');
    return res.data as Map<String, dynamic>;
  }
}

class CatalogApi {
  CatalogApi(this._dio);
  final Dio _dio;

  Future<List<Product>> getProducts({required String darkstoreId, int page = 1, bool? isHalal, String? category}) async {
    final res = await _dio.get('/catalog/darkstores/$darkstoreId', queryParameters: {
      'page': page,
      if (isHalal != null) 'is_halal': isHalal,
      if (category != null) 'category': category,
    });
    final data = res.data as Map<String, dynamic>;
    return (data['products'] as List).map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Category>> getCategories({required String darkstoreId}) async {
    final res = await _dio.get('/catalog/categories', queryParameters: {'darkstore_id': darkstoreId});
    return (res.data['categories'] as List).map((e) => Category.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Product>> getProductsByCategory({required String darkstoreId, required String categoryId}) =>
      getProducts(darkstoreId: darkstoreId, category: categoryId, page: 1);

  Future<List<Product>> search({required String darkstoreId, required String query}) async {
    final res = await _dio.get('/catalog/search', queryParameters: {
      'q': query,
      'darkstore_id': darkstoreId,
    });
    return (res.data['products'] as List).map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<String>> searchSuggestions({required String darkstoreId, required String query}) async {
    if (query.length < 2) return [];
    final res = await _dio.get('/catalog/search', queryParameters: {
      'q': query,
      'darkstore_id': darkstoreId,
    });
    return (res.data['suggestions'] as List?)?.cast<String>() ?? [];
  }

  Future<List<Product>> getProductsFiltered({
    required String darkstoreId,
    int page = 1,
    bool? isHalal,
    String? brand,
    int? minPrice,
    int? maxPrice,
  }) async {
    final res = await _dio.get('/catalog/darkstores/$darkstoreId', queryParameters: {
      'page': page,
      if (isHalal != null) 'is_halal': isHalal,
      if (brand != null) 'brand': brand,
      if (minPrice != null) 'min_price': minPrice,
      if (maxPrice != null) 'max_price': maxPrice,
    });
    final data = res.data as Map<String, dynamic>;
    return (data['products'] as List).map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Product?> getProduct(String id, {required String darkstoreId}) async {
    try {
      final res = await _dio.get('/catalog/products/$id', queryParameters: {'darkstore_id': darkstoreId});
      return Product.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      rethrow;
    }
  }
}

class OrderApi {
  OrderApi(this._dio);
  final Dio _dio;
  final _uuid = const Uuid();

  Future<List<OrderModel>> getOrders() async {
    final res = await _dio.get('/orders');
    return (res.data['orders'] as List).map((e) => OrderModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<OrderModel> getOrder(String id) async {
    final res = await _dio.get('/orders/$id');
    return OrderModel.fromJson(res.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> createOrder({
    required String darkstoreId,
    required List<Map<String, dynamic>> items,
    required Map<String, dynamic> deliveryAddress,
    required String paymentMethod,
    required String customerId,
    String? promocode,
    int bonusPointsToSpend = 0,
  }) async {
    final res = await _dio.post('/orders',
        data: {
          'darkstore_id': darkstoreId,
          'items': items,
          'delivery_address': deliveryAddress,
          'payment_method': paymentMethod,
          'customer_id': customerId,
          if (promocode != null) 'promocode': promocode,
          if (bonusPointsToSpend > 0) 'bonus_points_to_spend': bonusPointsToSpend,
        },
        options: Options(headers: {'X-Idempotency-Key': _uuid.v4()}));
    return res.data as Map<String, dynamic>;
  }

  Future<DeliveryQuote> getDeliveryQuote(String darkstoreId, int cartTotal, {double? lat, double? lng}) async {
    final res = await _dio.post('/delivery/quote', data: {
      'darkstore_id': darkstoreId,
      'cart_total': cartTotal,
      if (lat != null && lng != null) 'coordinates': {'lat': lat, 'lng': lng},
    });
    return DeliveryQuote.fromJson(res.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> initiatePayment(String orderId, int amount, String provider) async {
    final res = await _dio.post('/payments/initiate', data: {
      'order_id': orderId,
      'amount': amount,
      'provider': provider,
    });
    return res.data as Map<String, dynamic>;
  }

  Future<void> cancelOrder(String orderId) async {
    await _dio.post('/orders/$orderId/cancel');
  }

  Future<Map<String, dynamic>> repeatOrder(String orderId) async {
    final res = await _dio.post('/orders/$orderId/repeat');
    return res.data as Map<String, dynamic>;
  }

  Future<void> registerPush(String deviceId) async {
    await _dio.post('/push/register', data: {'device_id': deviceId, 'platform': 'flutter'});
  }

  Future<String> reportProblem(String orderId, String type, String description) async {
    final res = await _dio.post('/orders/$orderId/report-problem', data: {
      'problem_type': type,
      'description': description,
    });
    return res.data['ticket_id'] as String;
  }

  Future<void> rateOrder(String orderId, int rating, {String? comment}) async {
    await _dio.post('/orders/$orderId/rate', data: {'rating': rating, if (comment != null) 'comment': comment});
  }
}

class LoyaltyApi {
  LoyaltyApi(this._dio, {required this.userId});
  final Dio _dio;
  final String userId;

  Future<Map<String, dynamic>> getWallet() async {
    final res = await _dio.get('/loyalty/wallet', queryParameters: {'user_id': userId});
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getReferral() async {
    final res = await _dio.get('/loyalty/referral', queryParameters: {'user_id': userId});
    return res.data as Map<String, dynamic>;
  }

  Future<List<Map<String, dynamic>>> getHistory() async {
    final res = await _dio.get('/loyalty/history', queryParameters: {'user_id': userId});
    return (res.data['history'] as List).cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> validatePromocode(String code, int subtotal) async {
    final res = await _dio.post('/loyalty/promocode/validate', data: {'code': code, 'subtotal': subtotal});
    return res.data as Map<String, dynamic>;
  }
}
