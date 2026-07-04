import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/api/api_services.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/providers/address_provider.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/cart_provider.dart';
import '../../core/providers/catalog_providers.dart';
import '../../core/providers/city_provider.dart';
import '../../core/providers/location_provider.dart';
import '../../core/providers/loyalty_provider.dart';
import '../../core/providers/locale_provider.dart';
import '../../core/utils/format.dart';
import '../../widgets/common_widgets.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});
  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final _landmarkController = TextEditingController();
  final _mahallaController = TextEditingController();
  String _payment = 'payme';
  bool _loading = false;
  String? _entrancePhotoPath;
  final _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadSavedAddress());
  }

  void _loadSavedAddress() {
    final saved = ref.read(addressProvider.notifier).defaultAddress;
    if (saved != null) {
      _mahallaController.text = saved.mahalla;
      _landmarkController.text = saved.landmark;
    }
  }

  @override
  void dispose() {
    _landmarkController.dispose();
    _mahallaController.dispose();
    super.dispose();
  }

  Future<void> _placeOrder() async {
    final l10n = AppLocalizations.of(context);
    if (_landmarkController.text.trim().length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.landmarkTooShort)));
      return;
    }
    setState(() => _loading = true);
    try {
      await ref.read(cartProvider.notifier).refreshFromCatalog(
            ref.read(catalogApiProvider),
            ref.read(cityProvider),
          );
      if (ref.read(cartProvider).isEmpty) {
        if (mounted) context.go('/cart');
        return;
      }

      final cart = ref.read(cartProvider.notifier);
      final auth = ref.read(authProvider);
      final loyalty = ref.read(loyaltyProvider);
      final darkstoreId = ref.read(cityProvider);
      final loc = await ref.read(userLocationProvider.future);
      final lat = loc.lat;
      final lng = loc.lng;

      ref.read(addressProvider.notifier).upsert(SavedAddress(
            mahalla: _mahallaController.text.trim(),
            landmark: _landmarkController.text.trim(),
            lat: lat,
            lng: lng,
            isDefault: true,
          ));

      final customerId = auth.userId ?? 'guest-anonymous';
      final orderRes = await ref.read(orderApiProvider).createOrder(
            darkstoreId: darkstoreId,
            items: cart.toOrderItems(),
            deliveryAddress: {
              'coordinates': {'lat': lat, 'lng': lng},
              'mahalla_id': 'm1',
              'landmark': _landmarkController.text.trim(),
              'mahalla': _mahallaController.text.trim(),
              if (_entrancePhotoPath != null) 'entrance_photo': _entrancePhotoPath,
            },
            paymentMethod: _payment,
            customerId: customerId,
            promocode: auth.isGuest ? null : loyalty.appliedPromoCode,
            bonusPointsToSpend: auth.isGuest ? 0 : loyalty.bonusToApply(cart.subtotal),
          );
      final orderId = orderRes['order_id'] as String;
      final total = orderRes['total_amount'] as int;
      final payment = await ref.read(orderApiProvider).initiatePayment(orderId, total, _payment);
      if (!mounted) return;
      await showDialog(
        context: context,
        builder: (_) => AlertDialog(
          title: Text('${payment['provider']}'),
          content: SizedBox(
            height: 300,
            child: WebViewWidget(
              controller: WebViewController()
                ..setJavaScriptMode(JavaScriptMode.unrestricted)
                ..loadHtmlString('''
                  <html><body style="font-family:sans-serif;text-align:center;padding:40px">
                    <h2>Mock ${payment['provider']}</h2>
                    <p>${formatPrice(total, locale: ref.read(localeProvider))}</p>
                    <button style="padding:16px 32px;font-size:18px;background:#2E7D32;color:white;border:none;border-radius:8px">Pay</button>
                  </body></html>
                '''),
            ),
          ),
          actions: [TextButton(onPressed: () => Navigator.pop(context), child: Text(l10n.paid))],
        ),
      );
      ref.read(cartProvider.notifier).clear();
      if (mounted) context.go('/order/$orderId/track');
    } catch (e) {
      if (_payment == 'payme') {
        setState(() => _payment = 'click');
        if (mounted) await _placeOrder();
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final locale = ref.watch(localeProvider);
    final subtotal = ref.watch(cartProvider.notifier).subtotal;
    final quoteAsync = ref.watch(cartDeliveryQuoteProvider);
    final locAsync = ref.watch(userLocationProvider);
    final deliveryFee = quoteAsync.value?.deliveryFee ?? 0;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.checkoutTitle)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(l10n.deliveryAddress, style: const TextStyle(fontWeight: FontWeight.bold)),
          if (locAsync.isLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: LinearProgressIndicator(minHeight: 2),
            )
          else if (locAsync.hasValue)
            Padding(
              padding: const EdgeInsets.only(bottom: 8, top: 4),
              child: Text(
                locAsync.value!.available
                    ? l10n.coordinates(locAsync.value!.lat, locAsync.value!.lng)
                    : l10n.geoUnavailable,
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ),
          const SizedBox(height: 8),
          TextField(controller: _mahallaController, decoration: InputDecoration(labelText: l10n.mahalla)),
          const SizedBox(height: 8),
          TextField(controller: _landmarkController, decoration: InputDecoration(labelText: l10n.landmark)),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () async {
              final img = await _picker.pickImage(source: ImageSource.camera);
              if (img != null) setState(() => _entrancePhotoPath = img.path);
            },
            icon: const Icon(Icons.photo_camera_outlined),
            label: Text(_entrancePhotoPath == null ? l10n.entrancePhoto : l10n.entrancePhotoAdded),
          ),
          const SizedBox(height: 24),
          Text(l10n.paymentMethod, style: const TextStyle(fontWeight: FontWeight.bold)),
          RadioListTile(value: 'payme', groupValue: _payment, onChanged: (v) => setState(() => _payment = v!), title: const Text('Payme')),
          RadioListTile(value: 'click', groupValue: _payment, onChanged: (v) => setState(() => _payment = v!), title: const Text('Click')),
          const SizedBox(height: 24),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(l10n.itemsTotal), PriceTag(price: subtotal, locale: locale)]),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(l10n.deliveryFee), PriceTag(price: deliveryFee, locale: locale)]),
          const Divider(),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(l10n.total, style: const TextStyle(fontWeight: FontWeight.bold)),
              PriceTag(price: subtotal + deliveryFee, locale: locale),
            ],
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _loading ? null : _placeOrder,
            child: _loading ? const CircularProgressIndicator(color: Colors.white) : Text(l10n.payAndOrder),
          ),
        ],
      ),
    );
  }
}
