class AppConfig {
  /// Dev mock: `http://10.0.2.2:4010/api/v1` (Android emulator)
  /// Prod-local Kong: `--dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1`
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:4010/api/v1',
  );
  static const darkstoreId = String.fromEnvironment(
    'DARKSTORE_ID',
    defaultValue: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  );
  static const wsBaseUrl = String.fromEnvironment(
    'WS_BASE_URL',
    defaultValue: 'ws://10.0.2.2:4010/api/v1/ws',
  );
}
