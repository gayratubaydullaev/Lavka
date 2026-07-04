import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

String formatPrice(int uzs, {Locale? locale}) {
  final lc = locale?.languageCode ?? 'ru';
  final formatted = NumberFormat('#,###', lc).format(uzs);
  final suffix = _currencySuffix(locale);
  return '$formatted $suffix';
}

String _currencySuffix(Locale? locale) {
  if (locale == null) return 'сум';
  if (locale.languageCode == 'en') return 'UZS';
  if (locale.languageCode == 'uz' && locale.scriptCode == 'Latn') return "so'm";
  if (locale.languageCode == 'uz') return 'сўм';
  return 'сум';
}

String orderStatusLabel(String status, Locale locale) {
  final lang = locale.languageCode == 'uz' && locale.scriptCode == 'Latn'
      ? 'uz_latin'
      : locale.languageCode == 'uz'
          ? 'uz_cyrillic'
          : locale.languageCode;
  return _orderStatuses[status]?[lang] ?? _orderStatuses[status]?['ru'] ?? status;
}

const _orderStatuses = {
  'NEW': {'ru': 'Новый', 'en': 'New', 'uz_cyrillic': 'Янги', 'uz_latin': 'Yangi'},
  'ACCEPTED': {'ru': 'Принят', 'en': 'Accepted', 'uz_cyrillic': 'Қабул қилинди', 'uz_latin': 'Qabul qilindi'},
  'ASSEMBLY': {'ru': 'Собираем', 'en': 'Picking', 'uz_cyrillic': 'Йиғилmoqda', 'uz_latin': 'Yig\'ilmoqda'},
  'IN_DELIVERY': {'ru': 'В пути', 'en': 'On the way', 'uz_cyrillic': 'Йўlda', 'uz_latin': 'Yo\'lda'},
  'DELIVERED': {'ru': 'Доставлен', 'en': 'Delivered', 'uz_cyrillic': 'Еtkazildi', 'uz_latin': 'Yetkazildi'},
  'CANCELLED_BY_USER': {'ru': 'Отменён', 'en': 'Cancelled', 'uz_cyrillic': 'Bekor qilindi', 'uz_latin': 'Bekor qilindi'},
  'CANCELLED': {'ru': 'Отменён', 'en': 'Cancelled', 'uz_cyrillic': 'Bekor qilindi', 'uz_latin': 'Bekor qilindi'},
};
