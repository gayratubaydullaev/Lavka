import 'package:flutter/material.dart';

class AppLocalizations {
  AppLocalizations(this.locale);

  final Locale locale;

  static const delegate = _AppLocalizationsDelegate();
  static const supportedLocales = [
    Locale('uz'),
    Locale('uz', 'Latn'),
    Locale('ru'),
    Locale('en'),
  ];

  static AppLocalizations of(BuildContext context) =>
      Localizations.of<AppLocalizations>(context, AppLocalizations)!;

  String _lang() {
    if (locale.languageCode == 'uz' && locale.scriptCode == 'Latn') return 'uz_latin';
    if (locale.languageCode == 'uz') return 'uz_cyrillic';
    return locale.languageCode;
  }

  String t(String key, [Map<String, String>? params]) {
    final lang = _lang();
    var text = _messages[key]?[lang] ?? _messages[key]?['ru'] ?? key;
    params?.forEach((k, v) => text = text.replaceAll('{$k}', v));
    return text;
  }

  String get appName => t('app.name');
  String get home => t('nav.home');
  String get cart => t('nav.cart');
  String get orders => t('nav.orders');
  String get profile => t('nav.profile');
  String get checkout => t('cart.checkout');
  String get searchPlaceholder => t('search.placeholder');
  String get halal => t('halal.badge');
  String get reportProblem => t('support.report_problem');
  String freeDeliveryRemaining(String amount) => t('delivery.free_remaining', {'amount': amount});
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => ['uz', 'ru', 'en'].contains(locale.languageCode);

  @override
  Future<AppLocalizations> load(Locale locale) async => AppLocalizations(locale);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

const _messages = {
  'app.name': {'uz_cyrillic': 'Jomboy Lavka', 'uz_latin': 'Jomboy Lavka', 'ru': 'Jomboy Lavka', 'en': 'Jomboy Lavka'},
  'nav.home': {'uz_cyrillic': 'Асосий', 'uz_latin': 'Asosiy', 'ru': 'Главная', 'en': 'Home'},
  'nav.cart': {'uz_cyrillic': 'Сават', 'uz_latin': 'Savat', 'ru': 'Корзина', 'en': 'Cart'},
  'nav.orders': {'uz_cyrillic': 'Буюртмалар', 'uz_latin': 'Buyurtmalar', 'ru': 'Заказы', 'en': 'Orders'},
  'nav.profile': {'uz_cyrillic': 'Профил', 'uz_latin': 'Profil', 'ru': 'Профиль', 'en': 'Profile'},
  'cart.checkout': {'uz_cyrillic': 'Буюртмани расмийлаштириш', 'uz_latin': 'Buyurtmani rasmiylashtirish', 'ru': 'Оформить заказ', 'en': 'Checkout'},
  'search.placeholder': {'uz_cyrillic': 'Маҳсулот қидириш...', 'uz_latin': 'Mahsulot qidirish...', 'ru': 'Поиск товаров...', 'en': 'Search products...'},
  'halal.badge': {'uz_cyrillic': 'Ҳалол', 'uz_latin': 'Halol', 'ru': 'Халяль', 'en': 'Halal'},
  'support.report_problem': {'uz_cyrillic': 'Муаммо haqida xabar berish', 'uz_latin': 'Muammo haqida xabar berish', 'ru': 'Сообщить о проблеме', 'en': 'Report a problem'},
  'delivery.free_remaining': {'uz_cyrillic': 'Бепул етказишга: {amount} сўм', 'uz_latin': 'Bepul yetkazishga: {amount} so\'m', 'ru': 'До бесплатной доставки: {amount} сум', 'en': '{amount} UZS to free delivery'},
};
