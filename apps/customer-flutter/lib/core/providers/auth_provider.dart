import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';

import '../config/app_config.dart';

class AuthState {
  const AuthState({
    this.accessToken,
    this.userId,
    this.userName,
    this.isOnboarded = false,
    this.isGuest = false,
  });

  final String? accessToken;
  final String? userId;
  final String? userName;
  final bool isOnboarded;
  final bool isGuest;

  bool get isAuthenticated => accessToken != null && !isGuest;

  bool get hasSession => accessToken != null;

  AuthState copyWith({
    String? accessToken,
    String? userId,
    String? userName,
    bool? isOnboarded,
    bool? isGuest,
  }) =>
      AuthState(
        accessToken: accessToken ?? this.accessToken,
        userId: userId ?? this.userId,
        userName: userName ?? this.userName,
        isOnboarded: isOnboarded ?? this.isOnboarded,
        isGuest: isGuest ?? this.isGuest,
      );
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState()) {
    _load();
  }

  static const _fallbackGuestToken = 'mock-jwt-guest';

  Box get _box => Hive.box('settings');

  void _load() {
    final onboarded = _box.get('is_onboarded') == true;
    final token = _box.get('access_token') as String?;
    final isGuest = _box.get('is_guest') == true;
    state = AuthState(
      accessToken: token,
      userId: _box.get('user_id') as String?,
      userName: _box.get('user_name') as String?,
      isOnboarded: onboarded,
      isGuest: isGuest,
    );
    if (onboarded && token == null) {
      enterAsGuest();
    }
  }

  Future<void> _persistSession({
    required String accessToken,
    required String userId,
    required String userName,
    required bool isGuest,
  }) async {
    await _box.put('access_token', accessToken);
    await _box.put('user_id', userId);
    await _box.put('user_name', userName);
    await _box.put('is_guest', isGuest);
    state = AuthState(
      accessToken: accessToken,
      userId: userId,
      userName: userName,
      isOnboarded: _box.get('is_onboarded') == true,
      isGuest: isGuest,
    );
  }

  Future<void> enterAsGuest() async {
    try {
      final dio = Dio(BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
      ));
      final res = await dio.post('/auth/guest');
      final data = res.data as Map<String, dynamic>;
      final user = Map<String, dynamic>.from(data['user'] as Map);
      await _persistSession(
        accessToken: data['access_token'] as String,
        userId: user['id'] as String,
        userName: user['name'] as String? ?? 'Гость',
        isGuest: user['is_guest'] as bool? ?? true,
      );
    } catch (_) {
      final guestId = 'guest-${const Uuid().v4().substring(0, 8)}';
      await _persistSession(
        accessToken: _fallbackGuestToken,
        userId: guestId,
        userName: 'Гость',
        isGuest: true,
      );
    }
  }

  Future<void> setAuthenticated({
    required String accessToken,
    required String userId,
    required String userName,
  }) async {
    await _persistSession(
      accessToken: accessToken,
      userId: userId,
      userName: userName,
      isGuest: false,
    );
  }

  Future<void> setOnboarded() async {
    await _box.put('is_onboarded', true);
    state = state.copyWith(isOnboarded: true);
    if (!state.hasSession) {
      await enterAsGuest();
    }
  }

  Future<void> logout() async {
    await _box.delete('access_token');
    await _box.delete('user_id');
    await _box.delete('user_name');
    await _box.delete('is_guest');
    state = AuthState(isOnboarded: true);
    await enterAsGuest();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) => AuthNotifier());
