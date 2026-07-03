import 'package:flutter/material.dart';

import '../core/config/app_config.dart';

class ApiErrorView extends StatelessWidget {
  const ApiErrorView({super.key, required this.error});

  final Object error;

  @override
  Widget build(BuildContext context) {
    final msg = error.toString();
    final isTimeout = msg.contains('connection timeout') || msg.contains('Connection refused');

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(isTimeout ? Icons.cloud_off_outlined : Icons.error_outline, size: 48, color: Colors.grey),
          const SizedBox(height: 12),
          Text(
            isTimeout ? 'Не удалось подключиться к серверу' : 'Ошибка загрузки',
            style: Theme.of(context).textTheme.titleMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            AppConfig.apiHint,
            style: const TextStyle(fontSize: 13, color: Colors.grey),
            textAlign: TextAlign.center,
          ),
          if (!isTimeout) ...[
            const SizedBox(height: 8),
            Text(msg, style: const TextStyle(fontSize: 12), textAlign: TextAlign.center),
          ],
        ],
      ),
    );
  }
}
