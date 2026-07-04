import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_services.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/providers/address_provider.dart';
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
    final l10n = AppLocalizations.of(context);
    final auth = ref.watch(authProvider);
    final loyalty = ref.watch(loyaltyProvider);
    final addresses = ref.watch(addressProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.profile)),
      body: ListView(
        children: [
          ListTile(
            leading: const CircleAvatar(child: Icon(Icons.person)),
            title: Text(auth.userName ?? 'Пользователь'),
            subtitle: Text(auth.isGuest ? '${l10n.guestMode} • ${auth.userId ?? ''}' : (auth.userId ?? '')),
          ),
          if (auth.isGuest)
            Card(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              child: ListTile(
                leading: const Icon(Icons.login, color: AppTheme.primary),
                title: Text(l10n.loginByPhone),
                subtitle: Text(l10n.loginBenefits),
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
                  onPressed: () async {
                    final code = loyalty.referralCode!;
                    await Clipboard.setData(ClipboardData(text: code));
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Код $code скопирован')),
                      );
                    }
                  },
                ),
              ),
            ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.language),
            title: Text(l10n.language),
            trailing: DropdownButton<AppLocale>(
              value: ref.watch(localeProvider.notifier).currentAppLocale,
              underline: const SizedBox.shrink(),
              items: AppLocale.values.map((l) => DropdownMenuItem(value: l, child: Text(l.label))).toList(),
              onChanged: (l) {
                if (l != null) ref.read(localeProvider.notifier).setLocale(l);
              },
            ),
          ),
          ListTile(
            leading: const Icon(Icons.location_on_outlined),
            title: Text(l10n.addresses),
            subtitle: Text(
              addresses.isEmpty
                  ? l10n.deliveryAddress
                  : addresses.map((a) => '${a.mahalla}: ${a.landmark}').join('\n'),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            onTap: () {
              showDialog(
                context: context,
                builder: (_) => AlertDialog(
                  title: Text(l10n.addresses),
                  content: addresses.isEmpty
                      ? Text(l10n.ordersEmptyHint)
                      : SingleChildScrollView(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: addresses
                                .map((a) => Padding(
                                      padding: const EdgeInsets.only(bottom: 8),
                                      child: Text('${a.mahalla}\n${a.landmark}'),
                                    ))
                                .toList(),
                          ),
                        ),
                  actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK'))],
                ),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.support_agent),
            title: Text(l10n.support),
            onTap: () => context.push('/support'),
          ),
          ListTile(
            leading: const Icon(Icons.report_problem_outlined),
            title: Text(l10n.reportProblem),
            onTap: () => context.push('/support'),
          ),
          if (!auth.isGuest)
            ListTile(
              leading: const Icon(Icons.logout),
              title: Text(l10n.logout),
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
