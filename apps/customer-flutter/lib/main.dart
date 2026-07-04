import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';

import 'app.dart';
import 'core/api/api_services.dart';
import 'core/web/viewport_fix.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  initWebViewportFix();
  await Hive.initFlutter();
  await Hive.openBox('settings');
  await Hive.openBox('cart');
  runApp(const ProviderScope(child: JomboyApp()));
  _registerPushWhenReady();
}

void _registerPushWhenReady() {
  Future.microtask(() async {
    try {
      final container = ProviderContainer();
      final api = container.read(orderApiProvider);
      await api.registerPush(const Uuid().v4());
      container.dispose();
    } catch (_) {}
  });
}
