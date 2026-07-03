import 'package:flutter/material.dart';

import '../core/theme/app_theme.dart';
import '../core/utils/format.dart';

class PriceTag extends StatelessWidget {
  const PriceTag({super.key, required this.price, this.size = 16});
  final int price;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Text(
      formatPrice(price),
      style: TextStyle(fontSize: size, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
    );
  }
}

class HalalBadge extends StatelessWidget {
  const HalalBadge({super.key});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: AppTheme.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
      child: Text('Халяль', style: TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.w500)),
    );
  }
}

class DeliveryProgress extends StatelessWidget {
  const DeliveryProgress({super.key, required this.status});
  final String status;

  static const steps = ['ACCEPTED', 'ASSEMBLY', 'IN_DELIVERY', 'DELIVERED'];
  static const labels = ['Принят', 'Собираем', 'В пути', 'Доставлен'];

  @override
  Widget build(BuildContext context) {
    final idx = steps.indexOf(status);
    final current = idx >= 0 ? idx : 0;
    return Row(
      children: List.generate(steps.length, (i) {
        final active = i <= current;
        return Expanded(
          child: Column(
            children: [
              Row(
                children: [
                  if (i > 0) Expanded(child: Container(height: 2, color: active ? AppTheme.primary : AppTheme.surface)),
                  CircleAvatar(
                    radius: 12,
                    backgroundColor: active ? AppTheme.primary : AppTheme.surface,
                    child: Text('${i + 1}', style: TextStyle(fontSize: 10, color: active ? Colors.white : AppTheme.textSecondary)),
                  ),
                  if (i < steps.length - 1)
                    Expanded(child: Container(height: 2, color: i < current ? AppTheme.primary : AppTheme.surface)),
                ],
              ),
              const SizedBox(height: 4),
              Text(labels[i], style: TextStyle(fontSize: 10, color: active ? AppTheme.primary : AppTheme.textSecondary), textAlign: TextAlign.center),
            ],
          ),
        );
      }),
    );
  }
}
