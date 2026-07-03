import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

enum AppLocale { uzCyrl, uzLatn, ru, en }

extension AppLocaleX on AppLocale {
  Locale get locale => switch (this) {
        AppLocale.uzCyrl => const Locale('uz'),
        AppLocale.uzLatn => const Locale('uz', 'Latn'),
        AppLocale.ru => const Locale('ru'),
        AppLocale.en => const Locale('en'),
      };

  String get apiHeader => switch (this) {
        AppLocale.uzCyrl => 'uz-Cyrl',
        AppLocale.uzLatn => 'uz-Latn',
        AppLocale.ru => 'ru',
        AppLocale.en => 'en',
      };
}

class LocaleNotifier extends StateNotifier<Locale> {
  LocaleNotifier() : super(const Locale('ru')) {
    final code = Hive.box('settings').get('locale', defaultValue: 'ru') as String;
    state = Locale(code);
  }

  Future<void> setLocale(AppLocale appLocale) async {
    await Hive.box('settings').put('locale', appLocale.locale.languageCode);
    state = appLocale.locale;
  }
}

final localeProvider = StateNotifierProvider<LocaleNotifier, Locale>((ref) => LocaleNotifier());
