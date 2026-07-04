class Product {
  Product({
    required this.id,
    required this.name,
    required this.price,
    required this.stock,
    required this.zone,
    this.weightG,
    this.isHalal = false,
    this.images = const [],
    this.brand,
    this.barcode,
    this.category,
  });

  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: json['id'] as String,
        name: Map<String, String>.from(json['name'] as Map),
        price: json['price'] as int,
        stock: json['stock'] as int,
        zone: json['zone'] as String,
        weightG: json['weight_g'] as int?,
        isHalal: json['is_halal'] as bool? ?? false,
        images: (json['images'] as List?)?.cast<String>() ?? [],
        brand: json['brand'] as String?,
        barcode: json['barcode'] as String?,
        category: json['category'] as String?,
      );

  final String id;
  final Map<String, String> name;
  final int price;
  final int stock;
  final String zone;
  final int? weightG;
  final bool isHalal;
  final List<String> images;
  final String? brand;
  final String? barcode;
  final String? category;

  String localizedName(String lang) =>
      name[lang] ?? name['ru'] ?? name.values.first;

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'price': price,
        'stock': stock,
        'zone': zone,
        if (weightG != null) 'weight_g': weightG,
        'is_halal': isHalal,
        'images': images,
        if (brand != null) 'brand': brand,
        if (barcode != null) 'barcode': barcode,
        if (category != null) 'category': category,
      };
}

class Category {
  Category({required this.id, required this.name, this.parentId, this.imageUrl});

  factory Category.fromJson(Map<String, dynamic> json) => Category(
        id: json['id'] as String,
        name: Map<String, String>.from(json['name'] as Map),
        parentId: json['parent_id'] as String?,
        imageUrl: json['image_url'] as String?,
      );

  final String id;
  final Map<String, String> name;
  final String? parentId;
  final String? imageUrl;
}

class OrderModel {
  OrderModel({
    required this.id,
    required this.status,
    required this.items,
    required this.totalAmount,
    required this.deliveryFee,
    required this.subtotal,
    this.etaMinutes,
    this.courier,
    this.createdAt,
    this.deliveryAddress,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) => OrderModel(
        id: json['id'] as String,
        status: json['status'] as String,
        items: (json['items'] as List).map((e) => OrderItem.fromJson(e as Map<String, dynamic>)).toList(),
        totalAmount: json['total_amount'] as int,
        deliveryFee: json['delivery_fee'] as int? ?? 0,
        subtotal: json['subtotal'] as int? ?? json['total_amount'] as int,
        etaMinutes: json['eta_minutes'] as int?,
        courier: json['courier'] as Map<String, dynamic>?,
        createdAt: json['created_at'] as String?,
        deliveryAddress: json['delivery_address'] as Map<String, dynamic>?,
      );

  final String id;
  final String status;
  final List<OrderItem> items;
  final int totalAmount;
  final int deliveryFee;
  final int subtotal;
  final int? etaMinutes;
  final Map<String, dynamic>? courier;
  final String? createdAt;
  final Map<String, dynamic>? deliveryAddress;
}

class OrderItem {
  OrderItem({required this.productId, required this.name, required this.quantity, required this.price, this.zone});

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
        productId: json['product_id'] as String,
        name: json['name'] as String,
        quantity: (json['quantity'] as num).toDouble(),
        price: json['price'] as int,
        zone: json['zone'] as String?,
      );

  final String productId;
  final String name;
  final double quantity;
  final int price;
  final String? zone;
}

class DeliveryQuote {
  DeliveryQuote({required this.deliveryFee, required this.estimatedMinutes, this.freeDeliveryRemaining = 0});

  factory DeliveryQuote.fromJson(Map<String, dynamic> json) => DeliveryQuote(
        deliveryFee: json['delivery_fee'] as int,
        estimatedMinutes: json['estimated_minutes'] as int,
        freeDeliveryRemaining: json['free_delivery_remaining'] as int? ?? 0,
      );

  final int deliveryFee;
  final int estimatedMinutes;
  final int freeDeliveryRemaining;
}
