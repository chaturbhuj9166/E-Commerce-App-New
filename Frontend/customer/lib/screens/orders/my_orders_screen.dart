import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/app_colors.dart';
import '../../models/order.dart';
import '../../widgets/price_tag.dart';
import 'order_tracking_screen.dart';

class MyOrdersScreen extends StatefulWidget {
  const MyOrdersScreen({super.key});

  @override
  State<MyOrdersScreen> createState() => _MyOrdersScreenState();
}

class _MyOrdersScreenState extends State<MyOrdersScreen> {
  List<Order>? _orders;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (_error != null) setState(() => _error = null);
    try {
      final data = await ApiClient.instance.get('/orders') as List;
      if (mounted) setState(() => _orders = data.map((e) => Order.fromJson(e as Map<String, dynamic>)).toList());
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final orders = _orders;
    return Scaffold(
      appBar: AppBar(title: const Text('My Orders')),
      body: SafeArea(
        child: orders == null
            ? Center(
                child: _error == null
                    ? const CircularProgressIndicator()
                    : Column(mainAxisSize: MainAxisSize.min, children: [
                        Padding(padding: const EdgeInsets.symmetric(horizontal: 24), child: Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.danger))),
                        const SizedBox(height: 12),
                        OutlinedButton(onPressed: _load, child: const Text('Retry')),
                      ]),
              )
            : orders.isEmpty
                ? Center(child: Text('No orders yet', style: TextStyle(color: AppColors.textMuted)))
                : ListView.separated(
                    padding: const EdgeInsets.all(14),
                    itemCount: orders.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 10),
                    itemBuilder: (context, i) {
                      final order = orders[i];
                      return InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => OrderTrackingScreen(orderId: order.id))).then((_) => _load()),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('#${order.id.substring(0, order.id.length.clamp(0, 10)).toUpperCase()}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                                  _StatusBadge(status: order.status),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(order.items.map((i) => i.name).join(', '), maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5)),
                              const SizedBox(height: 6),
                              PriceTag(pricePaise: order.totalPaise, size: 14),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final color = status == 'DELIVERED'
        ? AppColors.success
        : status == 'CANCELLED'
            ? AppColors.danger
            : AppColors.orange;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
      child: Text(status.replaceAll('_', ' '), style: TextStyle(color: color, fontSize: 10.5, fontWeight: FontWeight.w700)),
    );
  }
}
