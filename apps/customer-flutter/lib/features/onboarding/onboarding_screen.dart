import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/auth_provider.dart';
import '../../core/providers/locale_provider.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});
  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _controller = PageController();
  int _page = 0;
  bool _consent = false;

  final _slides = const [
    ('15 минут', 'Экспресс-доставка из даркстора', Icons.timer),
    ('Халяль', 'Сертифицированные продукты', Icons.verified),
    ('Онлайн оплата', 'Payme и Click — быстро и безопасно', Icons.payment),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: Alignment.topRight,
              child: PopupMenuButton<AppLocale>(
                icon: const Icon(Icons.language),
                onSelected: (l) => ref.read(localeProvider.notifier).setLocale(l),
                itemBuilder: (_) => AppLocale.values
                    .map((l) => PopupMenuItem(value: l, child: Text(l.name)))
                    .toList(),
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _controller,
                onPageChanged: (i) => setState(() => _page = i),
                itemCount: _slides.length,
                itemBuilder: (_, i) {
                  final s = _slides[i];
                  return Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(s.$3, size: 80, color: Theme.of(context).colorScheme.primary),
                        const SizedBox(height: 24),
                        Text(s.$1, style: Theme.of(context).textTheme.headlineMedium),
                        const SizedBox(height: 8),
                        Text(s.$2, textAlign: TextAlign.center),
                      ],
                    ),
                  );
                },
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(_slides.length, (i) => Container(
                margin: const EdgeInsets.all(4),
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _page == i ? Theme.of(context).colorScheme.primary : Colors.grey.shade300,
                ),
              )),
            ),
            CheckboxListTile(
              value: _consent,
              onChanged: (v) => setState(() => _consent = v ?? false),
              title: const Text('Согласие на обработку персональных данных', style: TextStyle(fontSize: 13)),
              controlAffinity: ListTileControlAffinity.leading,
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: ElevatedButton(
                onPressed: _consent
                    ? () async {
                        if (_page < _slides.length - 1) {
                          _controller.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
                        } else {
                          await ref.read(authProvider.notifier).setOnboarded();
                          if (context.mounted) context.go('/');
                        }
                      }
                    : null,
                child: Text(_page < _slides.length - 1 ? 'Далее' : 'Начать'),
              ),
            ),
          ],
        ),
      ),
    );
  }

}
