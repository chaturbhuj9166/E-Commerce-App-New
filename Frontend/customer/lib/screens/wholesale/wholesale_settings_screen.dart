import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cart_provider.dart';
import '../../providers/theme_provider.dart';
import '../../providers/vendor_provider.dart';
import '../../providers/wishlist_provider.dart';
import '../../widgets/bottom_nav_shell.dart';
import '../../widgets/price_tag.dart';
import '../account/about_screen.dart';
import '../account/legal_text_screen.dart';
import '../auth/login_screen.dart';
import '../orders/my_orders_screen.dart';
import 'wholesale_messages_screen.dart';

class WholesaleSettingsScreen extends StatelessWidget {
  const WholesaleSettingsScreen({super.key, this.embedded = false});

  final bool embedded;

  /// Back to the customer who opened the portal (token stashed at vendor
  /// login), or to sign-in when there was none / it no longer works.
  Future<void> _exit(BuildContext context) async {
    final nav = Navigator.of(context);
    final auth = context.read<AuthProvider>();
    context.read<CartProvider>().clear();
    context.read<WishlistProvider>().clear();
    final restored = await context.read<VendorProvider>().signOut();
    final signedIn = restored && await auth.restoreSession();
    if (!signedIn) await auth.signOut();
    nav.pushAndRemoveUntil(MaterialPageRoute(builder: (_) => signedIn ? const BottomNavShell() : const LoginScreen()), (route) => false);
  }

  @override
  Widget build(BuildContext context) {
    final vendor = context.watch<VendorProvider>();
    final isDark = context.watch<ThemeProvider>().isDark;
    return Scaffold(
      appBar: AppBar(automaticallyImplyLeading: !embedded, title: const Text('Settings')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
              child: Row(
                children: [
                  CircleAvatar(radius: 24, backgroundColor: AppColors.navy, child: const Icon(Icons.storefront_rounded, color: Colors.white)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(vendor.name ?? 'Wholesale Partner', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                        if (vendor.limits != null)
                          Text(
                            'Order range ${formatPaise(vendor.limits!.minPaise)} – ${formatPaise(vendor.limits!.maxPaise)}',
                            style: TextStyle(fontSize: 11.5, color: AppColors.textSecondary),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            // GET /orders returns a vendor's own orders, so the retail screen
            // works here as-is: track, get the delivery OTP, cancel.
            _Tile(
              icon: Icons.receipt_long_rounded,
              label: 'My Orders',
              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const MyOrdersScreen())),
            ),
            _Tile(
              icon: Icons.chat_bubble_outline_rounded,
              label: 'Message Admin',
              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const WholesaleMessagesScreen())),
            ),
            _Tile(
              icon: Icons.dark_mode_outlined,
              label: 'Dark Mode',
              trailing: Switch(value: isDark, onChanged: (v) => context.read<ThemeProvider>().setDark(v), activeThumbColor: AppColors.orange),
            ),
            _Tile(
              icon: Icons.description_outlined,
              label: 'Terms & Conditions',
              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LegalTextScreen(
                    title: 'Terms & Conditions',
                    sections: [
                      (
                        'Wholesale Orders',
                        'These wholesale terms cover minimum/maximum order values, payment and delivery for verified NTSA business buyers.',
                      ),
                    ],
                  ))),
            ),
            _Tile(
              icon: Icons.info_outline_rounded,
              label: 'About NTSA',
              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AboutScreen())),
            ),
            const SizedBox(height: 18),
            _Tile(
              icon: Icons.logout_rounded,
              label: 'Exit Wholesale Portal',
              danger: true,
              onTap: () => _exit(context),
            ),
          ],
        ),
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({required this.icon, required this.label, this.onTap, this.trailing, this.danger = false});

  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final Widget? trailing;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final color = danger ? AppColors.danger : AppColors.textPrimary;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
            child: Row(
              children: [
                Icon(icon, color: danger ? AppColors.danger : AppColors.iconAccent, size: 21),
                const SizedBox(width: 14),
                Expanded(child: Text(label, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5, color: color))),
                trailing ?? (onTap != null ? Icon(Icons.chevron_right_rounded, color: AppColors.textMuted) : const SizedBox.shrink()),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
