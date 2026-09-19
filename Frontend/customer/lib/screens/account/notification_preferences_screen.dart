import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/app_colors.dart';

/// Backend only stores a device's FCM token for push delivery (see
/// Backend/src/services/firebase.js) -- it doesn't yet have a per-category
/// opt-in/out model, so these preferences are kept on-device for now. Wire
/// them into the push payload filtering once the server supports it.
class NotificationPreferencesScreen extends StatefulWidget {
  const NotificationPreferencesScreen({super.key});

  @override
  State<NotificationPreferencesScreen> createState() => _NotificationPreferencesScreenState();
}

class _NotificationPreferencesScreenState extends State<NotificationPreferencesScreen> {
  static const _keys = {
    'orders': ('ntsa-notif-orders', 'Order Updates', 'Order placed, packed, shipped and delivered'),
    'offers': ('ntsa-notif-offers', 'Offers & Promotions', 'Sales, deals of the day and coupon alerts'),
    'price': ('ntsa-notif-price', 'Price Drop Alerts', 'When a wishlist item gets cheaper'),
    'arrivals': ('ntsa-notif-arrivals', 'New Arrivals', 'New products in categories you shop'),
  };

  Map<String, bool> _values = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() => _values = {for (final k in _keys.keys) k: prefs.getBool(_keys[k]!.$1) ?? true});
  }

  Future<void> _set(String key, bool value) async {
    setState(() => _values[key] = value);
    (await SharedPreferences.getInstance()).setBool(_keys[key]!.$1, value);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notification Preferences')),
      body: SafeArea(
        child: _values.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                children: _keys.entries.map((e) {
                  final (_, title, subtitle) = e.value;
                  return SwitchListTile(
                    title: Text(title, style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
                    subtitle: Text(subtitle, style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                    value: _values[e.key] ?? true,
                    activeThumbColor: AppColors.orange,
                    onChanged: (v) => _set(e.key, v),
                  );
                }).toList(),
              ),
      ),
    );
  }
}
