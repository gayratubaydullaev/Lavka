import 'package:flutter/material.dart';

extension ProductLocale on Locale {
  String get productLangKey {
    if (languageCode == 'uz' && scriptCode == 'Latn') return 'uz_latin';
    if (languageCode == 'uz') return 'uz_cyrillic';
    return languageCode;
  }

  String get apiHeader => switch (productLangKey) {
        'uz_cyrillic' => 'uz-Cyrl',
        'uz_latin' => 'uz-Latn',
        _ => languageCode,
      };
}
