import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cart_provider.dart';
import '../../providers/wishlist_provider.dart';
import '../../widgets/app_network_image.dart';
import '../auth/login_screen.dart';
import '../orders/my_orders_screen.dart';
import '../addresses/addresses_screen.dart';
import '../wishlist/wishlist_screen.dart';
import 'coupons_screen.dart';
import 'edit_profile_screen.dart';
import 'refer_earn_screen.dart';
import 'premium_screen.dart';
import 'settings_screen.dart';

class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    return Scaffold(
      appBar: AppBar(automaticallyImplyLeading: !embedded, title: const Text('My Account')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: AppColors.navy, borderRadius: BorderRadius.circular(16)),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: Colors.white24,
                    backgroundImage: user?.photoUrl != null ? appImageProvider(user!.photoUrl!) : null,
                    onBackgroundImageError: user?.photoUrl != null ? (_, _) {} : null,
                    child: user?.photoUrl == null ? const Icon(Icons.person, color: Colors.white, size: 28) : null,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(user?.name ?? 'NTSA Customer', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16)),
                        if (user?.email != null) Text(user!.email!, style: const TextStyle(color: Colors.white70, fontSize: 12.5)),
                        const SizedBox(height: 8),
                        GestureDetector(
                          onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PremiumScreen())),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(color: AppColors.orange, borderRadius: BorderRadius.circular(20)),
                            child: const Row(mainAxisSize: MainAxisSize.min, children: [
                              Icon(Icons.workspace_premium_rounded, color: Colors.white, size: 14),
                              SizedBox(width: 4),
                              Text('Go Gold', style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w700)),
                            ]),
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const EditProfileScreen())),
                    icon: const Icon(Icons.edit_outlined, color: Colors.white),
                    tooltip: 'Edit profile',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _MenuTile(icon: Icons.receipt_long_rounded, label: 'My Orders', onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const MyOrdersScreen()))),
            _MenuTile(icon: Icons.location_on_outlined, label: 'My Addresses', onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AddressesScreen()))),
            _MenuTile(icon: Icons.favorite_border_rounded, label: 'My Wishlist', onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const WishlistScreen()))),
            _MenuTile(icon: Icons.local_offer_outlined, label: 'Coupons & Offers', onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CouponsScreen()))),
            _MenuTile(icon: Icons.card_giftcard_rounded, label: 'Refer & Earn', onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ReferEarnScreen()))),
            _MenuTile(icon: Icons.support_agent_rounded, label: 'Help & Support', onTap: () {}),
            _MenuTile(icon: Icons.settings_outlined, label: 'Settings', onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SettingsScreen()))),
            _MenuTile(
              icon: Icons.logout_rounded,
              label: 'Logout',
              danger: true,
              onTap: () async {
                context.read<CartProvider>().clear();
                context.read<WishlistProvider>().clear();
                await context.read<AuthProvider>().signOut();
                if (context.mounted) Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const LoginScreen()), (route) => false);
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({required this.icon, required this.label, required this.onTap, this.danger = false});
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final color = danger ? AppColors.danger : AppColors.textPrimary;
    return ListTile(
      onTap: onTap,
      leading: Icon(icon, color: danger ? AppColors.danger : AppColors.iconAccent, size: 22),
      title: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w500, fontSize: 14)),
      trailing: danger ? null : Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
      contentPadding: EdgeInsets.zero,
    );
  }
}
