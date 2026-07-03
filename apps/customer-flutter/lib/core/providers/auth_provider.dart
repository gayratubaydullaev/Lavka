import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

class AuthState {
  const AuthState({this.accessToken, this.userId, this.userName, this.isOnboarded = false});

  final String? accessToken;
  final String? userId;
  final String? userName;
  final bool isOnboarded;

  bool get isAuthenticated => accessToken != null;

  AuthState copyWith({
    String? accessToken,
    String? userId,
    String? userName,
    bool? isOnboarded,
  }) =>
      AuthState(
        accessToken: accessToken ?? this.accessToken,
        userId: userId ?? this.userId,
        userName: userName ?? this.userName,
        isOnboarded: isOnboarded ?? this.isOnboarded,
      );
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState()) {
    _load();
  }

  Box get _box => Hive.box('settings');

  void _load() {
    state = AuthState(
      accessToken: _box.get('access_token') as String?,
      userId: _box.get('user_id') as String?,
      userName: _box.get('user_name') as String?,
      isOnboarded: _box.get('is_onboarded') == true,
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
    state = state.copyWith(accessToken: accessToken, userId: userId, userName: userName);
  }

  Future<void> setOnboarded() async {
    await _box.put('is_onboarded', true);
    state = state.copyWith(isOnboarded: true);
  }

  Future<void> logout() async {
    await _box.delete('access_token');
    state = const AuthState(isOnboarded: true);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) => AuthNotifier());
