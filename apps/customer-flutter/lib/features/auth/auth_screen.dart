import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_services.dart';
import '../../core/providers/auth_provider.dart';

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});
  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  final _phoneController = TextEditingController(text: '+998901234567');
  final _otpController = TextEditingController(text: '1234');
  String? _sessionId;
  bool _loading = false;
  bool _otpSent = false;

  Future<void> _sendOtp() async {
    setState(() => _loading = true);
    try {
      final res = await ref.read(authApiProvider).sendOtp(_phoneController.text);
      setState(() {
        _sessionId = res['session_id'] as String;
        _otpSent = true;
      });
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verify() async {
    if (_sessionId == null) return;
    setState(() => _loading = true);
    try {
      final res = await ref.read(authApiProvider).verifyOtp(_sessionId!, _otpController.text);
      await ref.read(authProvider.notifier).setAuthenticated(
            accessToken: res['access_token'] as String,
            userId: res['user']['id'] as String,
            userName: res['user']['name'] as String,
          );
      if (mounted) context.go('/');
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Неверный код. Используйте 1234')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              Text('Jomboy Lavka', style: Theme.of(context).textTheme.headlineLarge, textAlign: TextAlign.center),
              const SizedBox(height: 8),
              const Text('Войдите по номеру телефона', textAlign: TextAlign.center),
              const SizedBox(height: 32),
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Телефон', prefixIcon: Icon(Icons.phone)),
                enabled: !_otpSent,
              ),
              if (_otpSent) ...[
                const SizedBox(height: 16),
                TextField(
                  controller: _otpController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'SMS-код (demo: 1234)', prefixIcon: Icon(Icons.lock)),
                ),
              ],
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _loading ? null : (_otpSent ? _verify : _sendOtp),
                child: _loading
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(_otpSent ? 'Войти' : 'Получить код'),
              ),
              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}
