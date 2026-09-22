import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/app_colors.dart';
import '../../models/coupon.dart';
import '../orders/order_tracking_screen.dart';

/// The Backend has no notification-history table, so the feed is built from
/// what it does store: the customer's own orders (GET /orders only returns
/// the signed-in customer's) and the currently active coupons.
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _Notice {
  const _Notice({required this.icon, required this.color, required this.title, required this.body, this.time, this.orderId});
  final IconData icon;
  final Color color;
  final String title;
  final String body;
  final DateTime? time;
  final String? orderId;
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<_Notice>? _orders;
  List<_Notice>? _offers;
  String? _error;

  static const _statusText = {
    'PENDING_PAYMENT': (Icons.hourglass_top_rounded, 'Payment pending', 'is waiting for payment.'),
    'PLACED': (Icons.receipt_long_rounded, 'Order placed', 'has been placed successfully.'),
    'PACKED': (Icons.inventory_2_rounded, 'Order packed', 'has been packed.'),
    'SHIPPED': (Icons.local_shipping_rounded, 'Order shipped', 'has been shipped.'),
    'OUT_FOR_DELIVERY': (Icons.delivery_dining_rounded, 'Out for delivery', 'is out for delivery. Get your delivery OTP from the order page.'),
    'DELIVERED': (Icons.check_circle_rounded, 'Order delivered', 'has been delivered.'),
    'CANCELLED': (Icons.cancel_rounded, 'Order cancelled', 'was cancelled.'),
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final results = await Future.wait([ApiClient.instance.get('/orders'), ApiClient.instance.get('/coupons')]);
      final orders = (results[0] as List).cast<Map<String, dynamic>>().map((o) {
        final id = o['id'] as String;
        final status = o['status'] as String;
        final (icon, title, text) = _statusText[status] ?? (Icons.receipt_long_rounded, 'Order update', 'was updated.');
        final items = (o['items'] as List? ?? []).length;
        return _Notice(
          icon: icon,
          color: status == 'CANCELLED' ? AppColors.danger : status == 'DELIVERED' ? AppColors.success : AppColors.orange,
          title: title,
          body: 'Your order #${id.substring(0, id.length.clamp(0, 10)).toUpperCase()} ($items item${items == 1 ? '' : 's'}) $text',
          time: DateTime.tryParse(o['updatedAt']?.toString() ?? o['createdAt']?.toString() ?? '')?.toLocal(),
          orderId: id,
        );
      }).toList()
        ..sort((a, b) => (b.time ?? DateTime(0)).compareTo(a.time ?? DateTime(0)));
      final offers = (results[1] as List).map((c) {
        final coupon = Coupon.fromJson(c as Map<String, dynamic>);
        return _Notice(
          icon: Icons.local_offer_rounded,
          color: AppColors.danger,
          title: 'Use code ${coupon.code}',
          body: coupon.description.isNotEmpty ? coupon.description : '${coupon.summary} on your next order.',
          time: DateTime.tryParse((c as Map)['createdAt']?.toString() ?? '')?.toLocal(),
        );
      }).toList();
      if (!mounted) return;
      setState(() {
        _orders = orders;
        _offers = offers;
      });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  static String _ago(DateTime? t) {
    if (t == null) return '';
    final d = DateTime.now().difference(t);
    if (d.inMinutes < 1) return 'now';
    if (d.inHours < 1) return '${d.inMinutes}m ago';
    if (d.inDays < 1) return '${d.inHours}h ago';
    if (d.inDays < 30) return '${d.inDays}d ago';
    return '${t.day}/${t.month}/${t.year}';
  }

  Widget _list(List<_Notice> items, String empty) {
    if (items.isEmpty) {
      return RefreshIndicator(
        onRefresh: _load,
        child: ListView(children: [
          const SizedBox(height: 160),
          Icon(Icons.notifications_none_rounded, size: 48, color: AppColors.textMuted),
          const SizedBox(height: 10),
          Center(child: Text(empty, style: TextStyle(color: AppColors.textMuted))),
        ]),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(14),
        itemCount: items.length,
        separatorBuilder: (context, index) => const SizedBox(height: 8),
        itemBuilder: (context, i) {
          final n = items[i];
          return InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: n.orderId == null ? null : () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => OrderTrackingScreen(orderId: n.orderId!))).then((_) => _load()),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(radius: 18, backgroundColor: n.color.withValues(alpha: 0.12), child: Icon(n.icon, color: n.color, size: 18)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(n.title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                        const SizedBox(height: 2),
                        Text(n.body, style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5)),
                      ],
                    ),
                  ),
                  Text(_ago(n.time), style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final orders = _orders, offers = _offers;
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Notifications'),
          bottom: const TabBar(
            isScrollable: true,
            labelColor: AppColors.navy,
            indicatorColor: AppColors.orange,
            tabs: [Tab(text: 'All'), Tab(text: 'Orders'), Tab(text: 'Offers')],
          ),
        ),
        body: SafeArea(
          child: _error != null
              ? Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Padding(padding: const EdgeInsets.all(16), child: Text(_error!, textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary))),
                    OutlinedButton(onPressed: _load, child: const Text('Retry')),
                  ]),
                )
              : orders == null || offers == null
                  ? const Center(child: CircularProgressIndicator())
                  : TabBarView(children: [
                      _list([...orders, ...offers]..sort((a, b) => (b.time ?? DateTime(0)).compareTo(a.time ?? DateTime(0))), 'No notifications yet'),
                      _list(orders, 'Order updates will appear here'),
                      _list(offers, 'No offers right now'),
                    ]),
        ),
      ),
    );
  }
}
