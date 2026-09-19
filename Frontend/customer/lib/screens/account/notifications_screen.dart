import 'package:flutter/material.dart';
import '../../core/app_colors.dart';

/// The Backend only stores a device's FCM token (for push) and has no
/// notification-history endpoint yet. This renders sample entries so the
/// layout matches; swap for a real GET /notifications once that exists.
class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  static const _items = [
    (Icons.local_shipping_rounded, AppColors.orange, 'Order Shipped', 'Your order #NTSA872394 has been shipped.', '2h ago'),
    (Icons.flash_on_rounded, AppColors.danger, 'Flash Sale Live!', 'Up to 70% OFF on Electronics. Grab now!', '5h ago'),
    (Icons.trending_down_rounded, AppColors.success, 'Price Drop', 'Item in your wishlist is now cheaper.', '1d ago'),
    (Icons.fiber_new_rounded, AppColors.navy, 'New Arrival', 'Check out the latest products in Home & Kitchen.', '2d ago'),
  ];

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Notifications'),
          bottom: const TabBar(
            isScrollable: true,
            labelColor: AppColors.navy,
            indicatorColor: AppColors.orange,
            tabs: [Tab(text: 'All'), Tab(text: 'Orders'), Tab(text: 'Offers'), Tab(text: 'Updates')],
          ),
        ),
        body: SafeArea(
          child: ListView.separated(
            padding: const EdgeInsets.all(14),
            itemCount: _items.length,
            separatorBuilder: (context, index) => const SizedBox(height: 8),
            itemBuilder: (context, i) {
              final (icon, color, title, body, time) = _items[i];
              return Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CircleAvatar(radius: 18, backgroundColor: color.withValues(alpha: 0.12), child: Icon(icon, color: color, size: 18)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                          const SizedBox(height: 2),
                          Text(body, style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5)),
                        ],
                      ),
                    ),
                    Text(time, style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
