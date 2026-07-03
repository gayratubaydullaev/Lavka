import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_services.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/loyalty_provider.dart';
import '../../core/providers/locale_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/format.dart';
import '../../widgets/common_widgets.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  @override
  void initState() {
    super.initState();
    final auth = ref.read(authProvider);
    if (!auth.isGuest) {
      ref.read(loyaltyProvider.notifier).load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final loyalty = ref.watch(loyaltyProvider);
    final locale = ref.watch(localeProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Профиль')),
      body: ListView(
        children: [
          ListTile(
            leading: const CircleAvatar(child: Icon(Icons.person)),
            title: Text(auth.userName ?? 'Пользователь'),
            subtitle: Text(auth.isGuest ? 'Гостевой режим • ${auth.userId ?? ''}' : (auth.userId ?? '')),
          ),
          if (auth.isGuest)
            Card(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              child: ListTile(
                leading: const Icon(Icons.login, color: AppTheme.primary),
                title: const Text('Войти по номеру телефона'),
                subtitle: const Text('Бонусы, история и персональные предложения'),
                onTap: () => context.push('/auth'),
              ),
            ),
          if (!auth.isGuest)
          Card(
            margin: const EdgeInsets.all(16),
            color: AppTheme.primary.withValues(alpha: 0.08),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Бонусы', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(formatPrice(loyalty.balance), style: const TextStyle(fontSize: 24, color: AppTheme.primary)),
                  const Text('1% с каждого доставленного заказа', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  TextButton(onPressed: () => context.push('/loyalty/history'), child: const Text('История начислений')),
                ],
              ),
            ),
          ),
          if (!auth.isGuest && loyalty.referralCode != null)
            Card(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              child: ListTile(
                leading: const Icon(Icons.card_giftcard, color: AppTheme.primary),
                title: const Text('Пригласи друга'),
                subtitle: Text('Код: ${loyalty.referralCode} • ${loyalty.referralInvites} приглашений'),
                trailing: IconButton(
                  icon: const Icon(Icons.share),
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Код ${loyalty.referralCode} скопирован (demo)')),
                    );
                  },
                ),
              ),
            ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.language),
            title: const Text('Язык'),
            trailing: DropdownButton<AppLocale>(
              value: AppLocale.values.firstWhere(
                (l) => l.locale.languageCode == locale.languageCode,
                orElse: () => AppLocale.ru,
              ),
              underline: const SizedBox.shrink(),
              items: AppLocale.values.map((l) => DropdownMenuItem(value: l, child: Text(l.name))).toList(),
              onChanged: (l) {
                if (l != null) ref.read(localeProvider.notifier).setLocale(l);
              },
            ),
          ),
          ListTile(
            leading: const Icon(Icons.location_on_outlined),
            title: const Text('Адреса доставки'),
            subtitle: const Text('Мирабад • Регистан (demo)'),
            onTap: () {
              showDialog(
                context: context,
                builder: (_) => AlertDialog(
                  title: const Text('Адреса'),
                  content: const Text('Мирабад, вход со двора\nСамарканд, Регистан'),
                  actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK'))],
                ),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.support_agent),
            title: const Text('Поддержка'),
            onTap: () => context.push('/support'),
          ),
          ListTile(
            leading: const Icon(Icons.report_problem_outlined),
            title: const Text('Сообщить о проблеме'),
            onTap: () => context.push('/support'),
          ),
          if (!auth.isGuest)
            ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Выйти'),
              onTap: () async {
                await ref.read(authProvider.notifier).logout();
                if (context.mounted) context.go('/');
              },
            ),
        ],
      ),
    );
  }
}
