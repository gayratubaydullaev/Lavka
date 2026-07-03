import 'package:flutter/foundation.dart';

class AppConfig {
  /// Override: `--dart-define=API_BASE_URL=http://HOST:4010/api/v1`
  /// Android emulator: `10.0.2.2` | Linux/desktop/iOS sim: `127.0.0.1` | Phone on Wi‑Fi: LAN IP
  static String get apiBaseUrl {
    const env = String.fromEnvironment('API_BASE_URL');
    if (env.isNotEmpty) return env;
    return 'http://${_apiHost()}/api/v1';
  }

  static String get wsBaseUrl {
    const env = String.fromEnvironment('WS_BASE_URL');
    if (env.isNotEmpty) return env;
    return 'ws://${_apiHost()}/api/v1/ws';
  }

  static const darkstoreId = String.fromEnvironment(
    'DARKSTORE_ID',
    defaultValue: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  );

  static String get apiHint =>
      'API: $apiBaseUrl\nЗапустите: npm run mock:dev (в корне Jomboy)';

  static String _apiHost() {
    const port = String.fromEnvironment('API_PORT', defaultValue: '4010');
    if (kIsWeb) return 'localhost:$port';
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return '10.0.2.2:$port';
      default:
        return '127.0.0.1:$port';
    }
  }
}
