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

  String get label => switch (this) {
        AppLocale.uzCyrl => 'Ўзбек (кирилл)',
        AppLocale.uzLatn => 'O\'zbek (lotin)',
        AppLocale.ru => 'Русский',
        AppLocale.en => 'English',
      };
}

class LocaleNotifier extends StateNotifier<Locale> {
  LocaleNotifier() : super(const Locale('ru')) {
    final box = Hive.box('settings');
    final code = box.get('locale_code', defaultValue: 'ru') as String;
    final script = box.get('locale_script') as String?;
    state = script != null ? Locale(code, script) : Locale(code);
  }

  Future<void> setLocale(AppLocale appLocale) async {
    final box = Hive.box('settings');
    final loc = appLocale.locale;
    await box.put('locale_code', loc.languageCode);
    if (loc.scriptCode != null) {
      await box.put('locale_script', loc.scriptCode);
    } else {
      await box.delete('locale_script');
    }
    state = loc;
  }

  AppLocale get currentAppLocale {
    for (final l in AppLocale.values) {
      if (l.locale.languageCode == state.languageCode &&
          l.locale.scriptCode == state.scriptCode) {
        return l;
      }
    }
    return AppLocale.ru;
  }
}

final localeProvider = StateNotifierProvider<LocaleNotifier, Locale>((ref) => LocaleNotifier());
