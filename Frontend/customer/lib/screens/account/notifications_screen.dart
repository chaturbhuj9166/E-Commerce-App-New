import 'package:flutter/material.dart';
import '../../l10n/tr.dart';
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
  const _Notice({required this.icon, required this.color, required this.titleKey, required this.bodyKey, this.args, this.rawBody, this.time, this.orderId});
  final IconData icon;
  final Color color;
  final String titleKey;
  final String bodyKey;
  final Map<String, String>? args;
  final String? rawBody; // text that came from the server, shown as-is
  final DateTime? time;
  final String? orderId;
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<_Notice>? _orders;
  List<_Notice>? _offers;
  String? _error;

  static const _statusText = {
    'PENDING_PAYMENT': (Icons.hourglass_top_rounded, 'account.notif.pending_payment_title', 'account.notif.pending_payment_body'),
    'PLACED': (Icons.receipt_long_rounded, 'account.notif.placed_title', 'account.notif.placed_body'),
    'PACKED': (Icons.inventory_2_rounded, 'account.notif.packed_title', 'account.notif.packed_body'),
    'SHIPPED': (Icons.local_shipping_rounded, 'account.notif.shipped_title', 'account.notif.shipped_body'),
    'OUT_FOR_DELIVERY': (Icons.delivery_dining_rounded, 'account.notif.out_for_delivery_title', 'account.notif.out_for_delivery_body'),
    'DELIVERED': (Icons.check_circle_rounded, 'account.notif.delivered_title', 'account.notif.delivered_body'),
    'CANCELLED': (Icons.cancel_rounded, 'account.notif.cancelled_title', 'account.notif.cancelled_body'),
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
        final (icon, titleKey, bodyBase) = _statusText[status] ?? (Icons.receipt_long_rounded, 'account.notif.updated_title', 'account.notif.updated_body');
        final items = (o['items'] as List? ?? []).length;
        return _Notice(
          icon: icon,
          color: status == 'CANCELLED' ? AppColors.danger : status == 'DELIVERED' ? AppColors.success : AppColors.orange,
          titleKey: titleKey,
          bodyKey: '${bodyBase}_${items == 1 ? 'one' : 'other'}',
          args: {'id': id.substring(0, id.length.clamp(0, 10)).toUpperCase(), 'n': '$items'},
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
          titleKey: 'account.notif.use_code',
          bodyKey: 'account.notif.coupon_body',
          args: {'code': coupon.code, 'summary': coupon.summaryOf(context)},
          rawBody: coupon.description.isNotEmpty ? coupon.description : null,
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

  static String _ago(BuildContext context, DateTime? t) {
    if (t == null) return '';
    final d = DateTime.now().difference(t);
    if (d.inMinutes < 1) return context.tr('account.notif.now');
    if (d.inHours < 1) return context.tr('account.notif.minutes_ago', {'n': '${d.inMinutes}'});
    if (d.inDays < 1) return context.tr('account.notif.hours_ago', {'n': '${d.inHours}'});
    if (d.inDays < 30) return context.tr('account.notif.days_ago', {'n': '${d.inDays}'});
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
                        Text(context.tr(n.titleKey, n.args), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                        const SizedBox(height: 2),
                        Text(n.rawBody ?? context.tr(n.bodyKey, n.args), style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5)),
                      ],
                    ),
                  ),
                  Text(_ago(context, n.time), style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
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
          title: Text(context.tr('account.notif.title')),
          bottom: TabBar(
            isScrollable: true,
            labelColor: AppColors.navy,
            indicatorColor: AppColors.orange,
            tabs: [Tab(text: context.tr('account.notif.tab_all')), Tab(text: context.tr('account.notif.tab_orders')), Tab(text: context.tr('account.notif.tab_offers'))],
          ),
        ),
        body: SafeArea(
          child: _error != null
              ? Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Padding(padding: const EdgeInsets.all(16), child: Text(_error!, textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary))),
                    OutlinedButton(onPressed: _load, child: Text(context.tr('common.retry'))),
                  ]),
                )
              : orders == null || offers == null
                  ? const Center(child: CircularProgressIndicator())
                  : TabBarView(children: [
                      _list([...orders, ...offers]..sort((a, b) => (b.time ?? DateTime(0)).compareTo(a.time ?? DateTime(0))), context.tr('account.notif.empty_all')),
                      _list(orders, context.tr('account.notif.empty_orders')),
                      _list(offers, context.tr('account.notif.empty_offers')),
                    ]),
        ),
      ),
    );
  }
}
