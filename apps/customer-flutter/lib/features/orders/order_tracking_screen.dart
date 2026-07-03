import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../../core/api/api_services.dart';
import '../../core/config/app_config.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/common_widgets.dart';

class OrderTrackingScreen extends ConsumerStatefulWidget {
  const OrderTrackingScreen({super.key, required this.orderId});
  final String orderId;

  @override
  ConsumerState<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends ConsumerState<OrderTrackingScreen> {
  WebSocketChannel? _channel;
  String _status = 'ACCEPTED';
  int? _eta = 18;
  LatLng _courierPos = const LatLng(41.311, 69.279);

  @override
  void initState() {
    super.initState();
    _connectWs();
  }

  void _connectWs() {
    try {
      _channel = WebSocketChannel.connect(
        Uri.parse('${AppConfig.wsBaseUrl}?channel=orders&order_id=${widget.orderId}'),
      );
      _channel!.stream.listen((data) {
        final msg = jsonDecode(data as String) as Map<String, dynamic>;
        if (msg['type'] == 'status_changed') {
          setState(() {
            _status = msg['status'] as String? ?? _status;
            _eta = msg['eta_minutes'] as int?;
          });
        }
        if (msg['type'] == 'courier_location') {
          setState(() => _courierPos = LatLng(msg['lat'] as double, msg['lng'] as double));
        }
      });
    } catch (_) {}
  }

  @override
  void dispose() {
    _channel?.sink.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final orderAsync = ref.watch(orderDetailProvider(widget.orderId));

    return Scaffold(
      appBar: AppBar(title: const Text('Трекинг заказа')),
      body: orderAsync.when(
        data: (order) {
          final status = _status != 'ACCEPTED' ? _status : order.status;
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: DeliveryProgress(status: status),
              ),
              if (_eta != null) Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: Text('ETA: $_eta мин', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500))),
              if (order.courier != null)
                ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.delivery_dining)),
                  title: Text(order.courier!['name'] as String? ?? 'Курьер'),
                  subtitle: Text(order.courier!['phone_masked'] as String? ?? ''),
                ),
              Expanded(
                child: FlutterMap(
                  options: MapOptions(initialCenter: _courierPos, initialZoom: 14),
                  children: [
                    TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'),
                    MarkerLayer(markers: [
                      Marker(point: _courierPos, width: 40, height: 40, child: const Icon(Icons.delivery_dining, color: AppTheme.primary, size: 32)),
                      Marker(point: const LatLng(41.315, 69.285), width: 40, height: 40, child: const Icon(Icons.home, color: Colors.red, size: 32)),
                    ]),
                  ],
                ),
              ),
              if (status == 'DELIVERED')
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: ElevatedButton(
                    onPressed: () => _reportProblem(context),
                    child: const Text('Сообщить о проблеме'),
                  ),
                ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
      ),
    );
  }

  Future<void> _reportProblem(BuildContext context) async {
    await ref.read(orderApiProvider).reportProblem(widget.orderId, 'damaged', 'Товар повреждён');
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Обращение отправлено в поддержку')));
    }
  }
}

final orderDetailProvider = FutureProvider.family<OrderModel, String>((ref, id) => ref.watch(orderApiProvider).getOrder(id));
