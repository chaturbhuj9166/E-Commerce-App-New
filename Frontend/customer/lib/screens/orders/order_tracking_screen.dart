import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/app_colors.dart';
import '../../models/order.dart';
import '../../widgets/primary_button.dart';

class OrderTrackingScreen extends StatefulWidget {
  const OrderTrackingScreen({super.key, required this.orderId});

  final String orderId;

  @override
  State<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends State<OrderTrackingScreen> {
  Order? _order;

  static const _stepLabels = {
    'PLACED': 'Order Placed',
    'PACKED': 'Packed',
    'SHIPPED': 'Shipped',
    'OUT_FOR_DELIVERY': 'Out for Delivery',
    'DELIVERED': 'Delivered',
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final data = await ApiClient.instance.get('/orders/${widget.orderId}');
    if (mounted) setState(() => _order = Order.fromJson(data as Map<String, dynamic>));
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;
    final currentIndex = order == null ? -1 : Order.statusSteps.indexOf(order.status).clamp(0, Order.statusSteps.length - 1);
    return Scaffold(
      appBar: AppBar(title: const Text('Order Tracking')),
      body: order == null
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Order #${order.id.substring(0, order.id.length.clamp(0, 10)).toUpperCase()}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                    Text('Placed on ${order.createdAt.day}/${order.createdAt.month}/${order.createdAt.year}', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                    const SizedBox(height: 24),
                    Expanded(
                      child: ListView.builder(
                        itemCount: Order.statusSteps.length,
                        itemBuilder: (context, i) {
                          final done = i <= currentIndex && order.status != 'CANCELLED';
                          final isLast = i == Order.statusSteps.length - 1;
                          return IntrinsicHeight(
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Column(
                                  children: [
                                    Icon(done ? Icons.check_circle_rounded : Icons.circle_outlined, color: done ? AppColors.success : AppColors.border, size: 22),
                                    if (!isLast) Expanded(child: Container(width: 2, color: done ? AppColors.success : AppColors.border)),
                                  ],
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Padding(
                                    padding: const EdgeInsets.only(bottom: 26),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(_stepLabels[Order.statusSteps[i]]!, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5, color: done ? AppColors.textPrimary : AppColors.textMuted)),
                                        if (done) Text('Completed', style: TextStyle(fontSize: 11.5, color: AppColors.textMuted)),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                    PrimaryButton(label: 'Live Tracking', onPressed: () {}),
                  ],
                ),
              ),
            ),
    );
  }
}
