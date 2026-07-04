import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

class SavedAddress {
  SavedAddress({
    required this.mahalla,
    required this.landmark,
    this.lat,
    this.lng,
    this.isDefault = false,
  });

  factory SavedAddress.fromJson(Map<String, dynamic> json) => SavedAddress(
        mahalla: json['mahalla'] as String,
        landmark: json['landmark'] as String,
        lat: (json['lat'] as num?)?.toDouble(),
        lng: (json['lng'] as num?)?.toDouble(),
        isDefault: json['is_default'] as bool? ?? false,
      );

  final String mahalla;
  final String landmark;
  final double? lat;
  final double? lng;
  final bool isDefault;

  Map<String, dynamic> toJson() => {
        'mahalla': mahalla,
        'landmark': landmark,
        if (lat != null) 'lat': lat,
        if (lng != null) 'lng': lng,
        'is_default': isDefault,
      };
}

class AddressNotifier extends StateNotifier<List<SavedAddress>> {
  AddressNotifier() : super([]) {
    _load();
  }

  Box get _box => Hive.box('settings');

  void _load() {
    final raw = _box.get('addresses');
    if (raw is! List) return;
    state = raw.map((e) => SavedAddress.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  void _save() {
    _box.put('addresses', state.map((a) => a.toJson()).toList());
  }

  SavedAddress? get defaultAddress {
    if (state.isEmpty) return null;
    return state.firstWhere((a) => a.isDefault, orElse: () => state.first);
  }

  void upsert(SavedAddress address) {
    final others = state.where((a) => a.mahalla != address.mahalla || a.landmark != address.landmark).toList();
    final next = address.isDefault
        ? [address, ...others.map((a) => SavedAddress(mahalla: a.mahalla, landmark: a.landmark, lat: a.lat, lng: a.lng))]
        : [...others, address];
    state = next;
    _save();
  }

  void removeAt(int index) {
    state = [...state]..removeAt(index);
    _save();
  }
}

final addressProvider = StateNotifierProvider<AddressNotifier, List<SavedAddress>>((ref) => AddressNotifier());
