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
  String deliveryEta(int minutes, String fee) => t('delivery.eta', {'minutes': '$minutes', 'fee': fee});
  String get cartEmpty => t('cart.empty');
  String get cartEmptyHint => t('cart.empty_hint');
  String get addedToCart => t('cart.added');
  String get outOfStock => t('product.out_of_stock');
  String stockAvailable(int n) => t('product.in_stock', {'count': '$n'});
  String get searchNothing => t('search.nothing');
  String get searchRecent => t('search.recent');
  String get continueShopping => t('cart.continue');
  String get guestMode => t('profile.guest_mode');
  String get loginByPhone => t('profile.login_phone');
  String get loginBenefits => t('profile.login_benefits');
  String get selectCity => t('home.select_city');
  String get category => t('catalog.category');
  String get promocode => t('cart.promocode');
  String get apply => t('common.apply');
  String get total => t('cart.total');
  String get useBonus => t('cart.use_bonus');
  String promoApplied(String code) => t('cart.promo_applied', {'code': code});
  String get checkoutTitle => t('checkout.title');
  String get deliveryAddress => t('checkout.address');
  String get mahalla => t('checkout.mahalla');
  String get landmark => t('checkout.landmark');
  String get entrancePhoto => t('checkout.entrance_photo');
  String get entrancePhotoAdded => t('checkout.entrance_photo_added');
  String get paymentMethod => t('checkout.payment');
  String get itemsTotal => t('checkout.items');
  String get deliveryFee => t('checkout.delivery');
  String get payAndOrder => t('checkout.pay');
  String get paid => t('checkout.paid');
  String get landmarkTooShort => t('checkout.landmark_short');
  String get geoUnavailable => t('checkout.geo_unavailable');
  String coordinates(double lat, double lng) => t('checkout.coords', {'lat': lat.toStringAsFixed(4), 'lng': lng.toStringAsFixed(4)});
  String get ordersEmpty => t('orders.empty');
  String get ordersEmptyHint => t('orders.empty_hint');
  String orderNumber(String id) => t('orders.number', {'id': id});
  String get rateOrder => t('orders.rate');
  String get submit => t('common.submit');
  String get cancelOrder => t('orders.cancel');
  String get repeatOrder => t('orders.repeat');
  String get orderCancelled => t('orders.cancelled');
  String cartUpdated(int removed, int updated) => t('cart.updated', {'removed': '$removed', 'updated': '$updated'});
  String get citySwitchTitle => t('home.city_switch_title');
  String get citySwitchBody => t('home.city_switch_body');
  String get clearCart => t('home.clear_cart');
  String get keepCart => t('home.keep_cart');
  String get waitlistTitle => t('home.waitlist_title');
  String get waitlistBody => t('home.waitlist_body');
  String get waitlistSnackbar => t('home.waitlist_snackbar');
  String get language => t('profile.language');
  String get bonuses => t('profile.bonuses');
  String get support => t('profile.support');
  String get addresses => t('profile.addresses');
  String get logout => t('profile.logout');
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
  'delivery.free_remaining': {'uz_cyrillic': 'Бепул етказишга: {amount}', 'uz_latin': 'Bepul yetkazishga: {amount}', 'ru': 'До бесплатной доставки: {amount}', 'en': '{amount} to free delivery'},
  'delivery.eta': {'uz_cyrillic': 'Еtkazish ~{minutes} дақ • {fee}', 'uz_latin': 'Yetkazish ~{minutes} daq • {fee}', 'ru': 'Доставка ~{minutes} мин • {fee}', 'en': 'Delivery ~{minutes} min • {fee}'},
  'cart.empty': {'uz_cyrillic': 'Сават бош', 'uz_latin': 'Savat bo\'sh', 'ru': 'Корзина пуста', 'en': 'Cart is empty'},
  'cart.empty_hint': {'uz_cyrillic': 'Каталогдан маҳсулот қўшинг', 'uz_latin': 'Katalogdan mahsulot qo\'shing', 'ru': 'Добавьте товары из каталога', 'en': 'Add products from the catalog'},
  'cart.added': {'uz_cyrillic': 'Саватга қўшилди', 'uz_latin': 'Savatga qo\'shildi', 'ru': 'Добавлено в корзину', 'en': 'Added to cart'},
  'cart.continue': {'uz_cyrillic': 'Харидга', 'uz_latin': 'Xaridga', 'ru': 'К покупкам', 'en': 'Continue shopping'},
  'cart.promocode': {'uz_cyrillic': 'Промокод', 'uz_latin': 'Promokod', 'ru': 'Промокод', 'en': 'Promo code'},
  'cart.total': {'uz_cyrillic': 'Жами', 'uz_latin': 'Jami', 'ru': 'Итого', 'en': 'Total'},
  'cart.use_bonus': {'uz_cyrillic': 'Бonuslarni ishlatish', 'uz_latin': 'Bonuslarni ishlatish', 'ru': 'Списать бонусы', 'en': 'Use bonus points'},
  'cart.promo_applied': {'uz_cyrillic': 'Промокод {code} қoлланildi', 'uz_latin': 'Promokod {code} qo\'llanildi', 'ru': 'Промокод {code} применён', 'en': 'Promo {code} applied'},
  'cart.updated': {'uz_cyrillic': 'Сават янгилandi: {removed} o\'chirildi, {updated} yangilandi', 'uz_latin': 'Savat yangilandi: {removed} o\'chirildi, {updated} yangilandi', 'ru': 'Корзина обновлена: удалено {removed}, изменено {updated}', 'en': 'Cart updated: {removed} removed, {updated} changed'},
  'product.out_of_stock': {'uz_cyrillic': 'Мavjud emas', 'uz_latin': 'Mavjud emas', 'ru': 'Нет в наличии', 'en': 'Out of stock'},
  'product.in_stock': {'uz_cyrillic': 'Mavjud: {count} dona', 'uz_latin': 'Mavjud: {count} dona', 'ru': 'В наличии: {count} шт.', 'en': 'In stock: {count}'},
  'search.nothing': {'uz_cyrillic': 'Hech narsa topilmadi', 'uz_latin': 'Hech narsa topilmadi', 'ru': 'Ничего не найдено', 'en': 'Nothing found'},
  'search.recent': {'uz_cyrillic': 'So\'nggi qidiruvlar', 'uz_latin': 'So\'nggi qidiruvlar', 'ru': 'Недавние запросы', 'en': 'Recent searches'},
  'profile.guest_mode': {'uz_cyrillic': 'Mehmon rejimi', 'uz_latin': 'Mehmon rejimi', 'ru': 'Гостевой режим', 'en': 'Guest mode'},
  'profile.login_phone': {'uz_cyrillic': 'Telefon bilan kirish', 'uz_latin': 'Telefon bilan kirish', 'ru': 'Войти по номеру телефона', 'en': 'Sign in with phone'},
  'profile.login_benefits': {'uz_cyrillic': 'Bonuslar va shaxsiy takliflar', 'uz_latin': 'Bonuslar va shaxsiy takliflar', 'ru': 'Бонусы, история и персональные предложения', 'en': 'Bonuses, history and personal offers'},
  'profile.language': {'uz_cyrillic': 'Til', 'uz_latin': 'Til', 'ru': 'Язык', 'en': 'Language'},
  'profile.bonuses': {'uz_cyrillic': 'Bonuslar', 'uz_latin': 'Bonuslar', 'ru': 'Бонусы', 'en': 'Bonuses'},
  'profile.support': {'uz_cyrillic': 'Yordam', 'uz_latin': 'Yordam', 'ru': 'Поддержка', 'en': 'Support'},
  'profile.addresses': {'uz_cyrillic': 'Manzillar', 'uz_latin': 'Manzillar', 'ru': 'Адреса доставки', 'en': 'Delivery addresses'},
  'profile.logout': {'uz_cyrillic': 'Chiqish', 'uz_latin': 'Chiqish', 'ru': 'Выйти', 'en': 'Log out'},
  'home.select_city': {'uz_cyrillic': 'Shaharni tanlang', 'uz_latin': 'Shaharni tanlang', 'ru': 'Выберите город', 'en': 'Select city'},
  'home.city_switch_title': {'uz_cyrillic': 'Shaharni almashtirish?', 'uz_latin': 'Shaharni almashtirish?', 'ru': 'Сменить город?', 'en': 'Change city?'},
  'home.city_switch_body': {'uz_cyrillic': 'Savatdagi mahsulotlar boshqa do\'kondan. Savatni tozalash kerak.', 'uz_latin': 'Savatdagi mahsulotlar boshqa do\'kondan. Savatni tozalash kerak.', 'ru': 'Товары в корзине из другого даркстора. Корзину нужно очистить.', 'en': 'Cart items are from another store. Clear the cart to continue.'},
  'home.clear_cart': {'uz_cyrillic': 'Savatni tozalash', 'uz_latin': 'Savatni tozalash', 'ru': 'Очистить корзину', 'en': 'Clear cart'},
  'home.keep_cart': {'uz_cyrillic': 'Bekor qilish', 'uz_latin': 'Bekor qilish', 'ru': 'Отмена', 'en': 'Cancel'},
  'home.waitlist_title': {'uz_cyrillic': 'Tez orada', 'uz_latin': 'Tez orada', 'ru': 'Скоро в вашем городе', 'en': 'Coming soon'},
  'home.waitlist_body': {'uz_cyrillic': 'Yetkazish zonasini kengaytirmoqdamiz.', 'uz_latin': 'Yetkazish zonasini kengaytirmoqdamiz.', 'ru': 'Мы расширяем зону доставки. Вы уже в листе ожидания.', 'en': 'We are expanding delivery. You are on the waitlist.'},
  'home.waitlist_snackbar': {'uz_cyrillic': 'Kutish ro\'yxatidasiz', 'uz_latin': 'Kutish ro\'yxatidasiz', 'ru': 'Вы в листе ожидания', 'en': 'You are on the waitlist'},
  'catalog.category': {'uz_cyrillic': 'Kategoriya', 'uz_latin': 'Kategoriya', 'ru': 'Категория', 'en': 'Category'},
  'checkout.title': {'uz_cyrillic': 'Rasmiylashtirish', 'uz_latin': 'Rasmiylashtirish', 'ru': 'Оформление', 'en': 'Checkout'},
  'checkout.address': {'uz_cyrillic': 'Yetkazish manzili', 'uz_latin': 'Yetkazish manzili', 'ru': 'Адрес доставки', 'en': 'Delivery address'},
  'checkout.mahalla': {'uz_cyrillic': 'Mahalla', 'uz_latin': 'Mahalla', 'ru': 'Махалля', 'en': 'Mahalla'},
  'checkout.landmark': {'uz_cyrillic': 'Mo\'ljal (min. 10 belgi)', 'uz_latin': 'Mo\'ljal (min. 10 belgi)', 'ru': 'Ориентир (мин. 10 символов)', 'en': 'Landmark (min. 10 chars)'},
  'checkout.entrance_photo': {'uz_cyrillic': 'Kirish surati', 'uz_latin': 'Kirish surati', 'ru': 'Фото входа (рекомендуется)', 'en': 'Entrance photo (recommended)'},
  'checkout.entrance_photo_added': {'uz_cyrillic': 'Surat qo\'shildi', 'uz_latin': 'Surat qo\'shildi', 'ru': 'Фото добавлено', 'en': 'Photo added'},
  'checkout.payment': {'uz_cyrillic': 'To\'lov usuli', 'uz_latin': 'To\'lov usuli', 'ru': 'Способ оплаты', 'en': 'Payment method'},
  'checkout.items': {'uz_cyrillic': 'Mahsulotlar', 'uz_latin': 'Mahsulotlar', 'ru': 'Товары', 'en': 'Items'},
  'checkout.delivery': {'uz_cyrillic': 'Yetkazish', 'uz_latin': 'Yetkazish', 'ru': 'Доставка', 'en': 'Delivery'},
  'checkout.pay': {'uz_cyrillic': 'To\'lash va buyurtma', 'uz_latin': 'To\'lash va buyurtma', 'ru': 'Оплатить и заказать', 'en': 'Pay and order'},
  'checkout.paid': {'uz_cyrillic': 'To\'landi', 'uz_latin': 'To\'landi', 'ru': 'Оплачено', 'en': 'Paid'},
  'checkout.landmark_short': {'uz_cyrillic': 'Mo\'ljal kamida 10 belgi', 'uz_latin': 'Mo\'ljal kamida 10 belgi', 'ru': 'Ориентир минимум 10 символов', 'en': 'Landmark must be at least 10 characters'},
  'checkout.geo_unavailable': {'uz_cyrillic': 'Geolokatsiya yo\'q — standart manzil', 'uz_latin': 'Geolokatsiya yo\'q — standart manzil', 'ru': 'Геолокация недоступна — адрес по умолчанию', 'en': 'Location unavailable — using default'},
  'checkout.coords': {'uz_cyrillic': 'Koordinatalar: {lat}, {lng}', 'uz_latin': 'Koordinatalar: {lat}, {lng}', 'ru': 'Координаты: {lat}, {lng}', 'en': 'Coordinates: {lat}, {lng}'},
  'orders.empty': {'uz_cyrillic': 'Buyurtmalar yo\'q', 'uz_latin': 'Buyurtmalar yo\'q', 'ru': 'Заказов пока нет', 'en': 'No orders yet'},
  'orders.empty_hint': {'uz_cyrillic': 'Birinchi buyurtmangizni bering', 'uz_latin': 'Birinchi buyurtmangizni bering', 'ru': 'Оформите первый заказ из каталога', 'en': 'Place your first order from the catalog'},
  'orders.number': {'uz_cyrillic': 'Buyurtma #{id}', 'uz_latin': 'Buyurtma #{id}', 'ru': 'Заказ #{id}', 'en': 'Order #{id}'},
  'orders.rate': {'uz_cyrillic': 'Buyurtmani baholash', 'uz_latin': 'Buyurtmani baholash', 'ru': 'Оцените заказ', 'en': 'Rate order'},
  'orders.cancel': {'uz_cyrillic': 'Bekor qilish', 'uz_latin': 'Bekor qilish', 'ru': 'Отменить', 'en': 'Cancel'},
  'orders.repeat': {'uz_cyrillic': 'Takrorlash', 'uz_latin': 'Takrorlash', 'ru': 'Повторить', 'en': 'Repeat'},
  'orders.cancelled': {'uz_cyrillic': 'Buyurtma bekor qilindi', 'uz_latin': 'Buyurtma bekor qilindi', 'ru': 'Заказ отменён', 'en': 'Order cancelled'},
  'common.apply': {'uz_cyrillic': 'Qo\'llash', 'uz_latin': 'Qo\'llash', 'ru': 'Применить', 'en': 'Apply'},
  'common.submit': {'uz_cyrillic': 'Yuborish', 'uz_latin': 'Yuborish', 'ru': 'Отправить', 'en': 'Submit'},
};
