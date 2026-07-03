import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:webview_flutter/webview_flutter.dart';

import 'package:image_picker/image_picker.dart';

import '../../core/api/api_services.dart';
import '../../core/providers/city_provider.dart';
import '../../core/models/models.dart';
import '../../core/providers/cart_provider.dart';
import '../../core/providers/loyalty_provider.dart';
import '../../widgets/common_widgets.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});
  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final _landmarkController = TextEditingController(text: 'вход со двора, синие ворота');
  final _mahallaController = TextEditingController(text: 'Мирабад');
  String _payment = 'payme';
  bool _loading = false;
  DeliveryQuote? _quote;
  String? _entrancePhotoPath;
  final _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _loadQuote();
  }

  Future<void> _loadQuote() async {
    final subtotal = ref.read(cartProvider.notifier).subtotal;
    final id = ref.read(cityProvider);
    final quote = await ref.read(orderApiProvider).getDeliveryQuote(id, subtotal, lat: 41.311, lng: 69.279);
    if (mounted) setState(() => _quote = quote);
  }

  Future<void> _placeOrder() async {
    if (_landmarkController.text.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Ориентир минимум 10 символов')));
      return;
    }
    setState(() => _loading = true);
    try {
      final cart = ref.read(cartProvider.notifier);
      final loyalty = ref.read(loyaltyProvider);
      final darkstoreId = ref.read(cityProvider);
      final orderRes = await ref.read(orderApiProvider).createOrder(
            darkstoreId: darkstoreId,
            items: cart.toOrderItems(),
            deliveryAddress: {
              'coordinates': {'lat': 41.311, 'lng': 69.279},
              'mahalla_id': 'm1',
              'landmark': _landmarkController.text,
              if (_entrancePhotoPath != null) 'entrance_photo': _entrancePhotoPath,
            },
            paymentMethod: _payment,
            promocode: loyalty.appliedPromoCode,
            bonusPointsToSpend: loyalty.bonusToApply(cart.subtotal),
          );
      final orderId = orderRes['order_id'] as String;
      final total = orderRes['total_amount'] as int;
      final payment = await ref.read(orderApiProvider).initiatePayment(orderId, total, _payment);
      if (!mounted) return;
      await showDialog(
        context: context,
        builder: (_) => AlertDialog(
          title: Text('Оплата ${payment['provider']}'),
          content: SizedBox(
            height: 300,
            child: WebViewWidget(
              controller: WebViewController()
                ..setJavaScriptMode(JavaScriptMode.unrestricted)
                ..loadHtmlString('''
                  <html><body style="font-family:sans-serif;text-align:center;padding:40px">
                    <h2>Mock ${payment['provider']}</h2>
                    <p>Сумма: $total сум</p>
                    <button onclick="window.location='success://paid'" style="padding:16px 32px;font-size:18px;background:#2E7D32;color:white;border:none;border-radius:8px">Оплатить</button>
                  </body></html>
                '''),
            ),
          ),
          actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Оплачено'))],
        ),
      );
      ref.read(cartProvider.notifier).clear();
      if (mounted) context.go('/order/$orderId/track');
    } catch (e) {
      if (_payment == 'payme') {
        setState(() => _payment = 'click');
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payme недоступен, переключено на Click')));
        await _placeOrder();
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final subtotal = ref.watch(cartProvider.notifier).subtotal;
    final deliveryFee = _quote?.deliveryFee ?? 0;

    return Scaffold(
      appBar: AppBar(title: const Text('Оформление')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Адрес доставки', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          TextField(controller: _mahallaController, decoration: const InputDecoration(labelText: 'Махалля')),
          const SizedBox(height: 8),
          TextField(controller: _landmarkController, decoration: const InputDecoration(labelText: 'Ориентир (мин. 10 символов)')),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () async {
              final img = await _picker.pickImage(source: ImageSource.camera);
              if (img != null) setState(() => _entrancePhotoPath = img.path);
            },
            icon: const Icon(Icons.photo_camera_outlined),
            label: Text(_entrancePhotoPath == null ? 'Фото входа (рекомендуется)' : 'Фото добавлено'),
          ),
          const SizedBox(height: 24),
          const Text('Способ оплаты', style: TextStyle(fontWeight: FontWeight.bold)),
          RadioListTile(value: 'payme', groupValue: _payment, onChanged: (v) => setState(() => _payment = v!), title: const Text('Payme')),
          RadioListTile(value: 'click', groupValue: _payment, onChanged: (v) => setState(() => _payment = v!), title: const Text('Click')),
          const SizedBox(height: 24),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text('Товары'), PriceTag(price: subtotal)]),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text('Доставка'), PriceTag(price: deliveryFee)]),
          const Divider(),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text('Итого', style: TextStyle(fontWeight: FontWeight.bold)), PriceTag(price: subtotal + deliveryFee)]),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _loading ? null : _placeOrder,
            child: _loading ? const CircularProgressIndicator(color: Colors.white) : const Text('Оплатить и заказать'),
          ),
        ],
      ),
    );
  }
}
