import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_config.dart';

/// Tashkent default darkstore.
const darkstoreTashkent = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

/// Samarkand darkstore (Phase 4).
const darkstoreSamarkand = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

class CityOption {
  const CityOption({
    required this.darkstoreId,
    required this.nameRu,
    required this.subtitle,
  });

  final String darkstoreId;
  final String nameRu;
  final String subtitle;
}

const cityOptions = [
  CityOption(
    darkstoreId: darkstoreTashkent,
    nameRu: 'Ташкент',
    subtitle: 'Мирабад, доставка 15 мин',
  ),
  CityOption(
    darkstoreId: darkstoreSamarkand,
    nameRu: 'Самарканд',
    subtitle: 'Регистан, доставка 15 мин',
  ),
];

class CityNotifier extends Notifier<String> {
  @override
  String build() => AppConfig.darkstoreId;

  void select(String darkstoreId) {
    state = darkstoreId;
  }

  CityOption get selected => cityOptions.firstWhere((c) => c.darkstoreId == state);
}

final cityProvider = NotifierProvider<CityNotifier, String>(CityNotifier.new);

final selectedCityProvider = Provider<CityOption>((ref) {
  final id = ref.watch(cityProvider);
  return cityOptions.firstWhere((c) => c.darkstoreId == id);
});

/// Demo waitlist flag for unsupported mahalla (Phase 2 waitlist stub in Phase 4).
final waitlistModeProvider = StateProvider<bool>((ref) => false);
