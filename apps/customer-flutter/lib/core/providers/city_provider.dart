import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../config/app_config.dart';

const darkstoreTashkent = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const darkstoreSamarkand = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

class CityOption {
  const CityOption({
    required this.darkstoreId,
    required this.names,
    required this.subtitles,
  });

  final String darkstoreId;
  final Map<String, String> names;
  final Map<String, String> subtitles;

  String nameFor(String langKey) => names[langKey] ?? names['ru']!;
  String subtitleFor(String langKey) => subtitles[langKey] ?? subtitles['ru']!;
}

const cityOptions = [
  CityOption(
    darkstoreId: darkstoreTashkent,
    names: {
      'ru': 'Ташкент',
      'en': 'Tashkent',
      'uz_cyrillic': 'Тошкент',
      'uz_latin': 'Toshkent',
    },
    subtitles: {
      'ru': 'Мирабад, доставка 15 мин',
      'en': 'Mirabad, 15 min delivery',
      'uz_cyrillic': 'Мирабод, 15 дақиқа',
      'uz_latin': 'Mirabod, 15 daqiqa',
    },
  ),
  CityOption(
    darkstoreId: darkstoreSamarkand,
    names: {
      'ru': 'Самарканд',
      'en': 'Samarkand',
      'uz_cyrillic': 'Самарқанд',
      'uz_latin': 'Samarqand',
    },
    subtitles: {
      'ru': 'Регистан, доставка 15 мин',
      'en': 'Registan, 15 min delivery',
      'uz_cyrillic': 'Регистон, 15 дақиқа',
      'uz_latin': 'Registon, 15 daqiqa',
    },
  ),
];

class CityNotifier extends Notifier<String> {
  Box get _box => Hive.box('settings');

  @override
  String build() {
    final saved = _box.get('darkstore_id') as String?;
    if (saved != null && cityOptions.any((c) => c.darkstoreId == saved)) {
      return saved;
    }
    return AppConfig.darkstoreId;
  }

  void select(String darkstoreId) {
    state = darkstoreId;
    _box.put('darkstore_id', darkstoreId);
  }

  CityOption get selected => cityOptions.firstWhere((c) => c.darkstoreId == state);
}

final cityProvider = NotifierProvider<CityNotifier, String>(CityNotifier.new);

final selectedCityProvider = Provider<CityOption>((ref) {
  final id = ref.watch(cityProvider);
  return cityOptions.firstWhere((c) => c.darkstoreId == id);
});

final waitlistModeProvider = StateProvider<bool>((ref) => Hive.box('settings').get('waitlist_mode') == true);

void persistWaitlistMode(bool value) => Hive.box('settings').put('waitlist_mode', value);
