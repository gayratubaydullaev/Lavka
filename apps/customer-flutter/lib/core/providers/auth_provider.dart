import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';

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

  static const _guestToken = 'mock-jwt-guest';

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

  Future<void> enterAsGuest() async {
    final guestId = 'guest-${const Uuid().v4().substring(0, 8)}';
    await _box.put('access_token', _guestToken);
    await _box.put('user_id', guestId);
    await _box.put('user_name', 'Гость');
    await _box.put('is_guest', true);
    state = AuthState(
      accessToken: _guestToken,
      userId: guestId,
      userName: 'Гость',
      isOnboarded: _box.get('is_onboarded') == true,
      isGuest: true,
    );
  }

  Future<void> setAuthenticated({
    required String accessToken,
    required String userId,
    required String userName,
  }) async {
    await _box.put('access_token', accessToken);
    await _box.put('user_id', userId);
    await _box.put('user_name', userName);
    await _box.put('is_guest', false);
    state = state.copyWith(
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
