import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_config.dart';
import '../providers/auth_provider.dart';
import '../providers/locale_provider.dart';
import '../utils/locale_utils.dart';

final dioProvider = Provider<Dio>((ref) {
  final locale = ref.watch(localeProvider);
  final dio = Dio(BaseOptions(
    baseUrl: AppConfig.apiBaseUrl,
    connectTimeout: const Duration(seconds: 30),
    receiveTimeout: const Duration(seconds: 30),
    headers: {'Accept-Language': locale.apiHeader},
  ));

  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) {
      options.headers['Accept-Language'] = ref.read(localeProvider).apiHeader;
      final token = ref.read(authProvider).accessToken;
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      handler.next(options);
    },
    onError: (error, handler) async {
      if (error.response?.statusCode == 401 && ref.read(authProvider).isAuthenticated) {
        ref.read(authProvider.notifier).logout();
      }
      handler.next(error);
    },
  ));

  return dio;
});
