import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../providers/theme_provider.dart';
import '../../providers/vendor_provider.dart';
import '../../widgets/ntsa_logo.dart';
import 'wholesale_cart_screen.dart';
import 'wholesale_catalog_tab.dart';
import 'wholesale_categories_screen.dart';
import 'wholesale_messages_screen.dart';
import 'wholesale_settings_screen.dart';

/// The wholesale portal's own bottom nav -- mirrors the retail app's Home /
/// Categories / Cart / Account layout so a buyer who has used the retail app
/// feels at home here too, with Messages standing in for Wishlist.
class WholesaleHomeScreen extends StatefulWidget {
  const WholesaleHomeScreen({super.key});

  @override
  State<WholesaleHomeScreen> createState() => _WholesaleHomeScreenState();
}

class _WholesaleHomeScreenState extends State<WholesaleHomeScreen> {
  int _index = 0;

  static const _titles = ['Wholesale', 'Categories', 'Messages', 'Settings'];

  final _tabs = const [
    WholesaleCatalogTab(),
    WholesaleCategoriesScreen(embedded: true),
    WholesaleMessagesScreen(embedded: true),
    WholesaleSettingsScreen(embedded: true),
  ];

  static const _items = [
    (Icons.home_rounded, 'Home'),
    (Icons.grid_view_rounded, 'Categories'),
    (Icons.chat_bubble_rounded, 'Messages'),
    (Icons.settings_rounded, 'Settings'),
  ];

  @override
  Widget build(BuildContext context) {
    final vendor = context.watch<VendorProvider>();
    final isDark = context.watch<ThemeProvider>().isDark;
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 12,
        title: _index == 0
            ? Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const NtsaLogo(size: 18),
                  const SizedBox(width: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: AppColors.iconAccentSoft, borderRadius: BorderRadius.circular(6)),
                    child: Text('WHOLESALE', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: AppColors.iconAccent, letterSpacing: 0.5)),
                  ),
                ],
              )
            : Text(_titles[_index]),
        actions: [
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_cart_outlined),
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const WholesaleCartScreen())),
              ),
              if (vendor.cartCount > 0)
                Positioned(
                  right: 6,
                  top: 6,
                  child: Container(
                    padding: const EdgeInsets.all(3),
                    decoration: const BoxDecoration(color: AppColors.danger, shape: BoxShape.circle),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text('${vendor.cartCount}', textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                  ),
                ),
            ],
          ),
        ],
      ),
      body: IndexedStack(key: ValueKey(isDark), index: _index, children: _tabs),
      bottomNavigationBar: DecoratedBox(
        decoration: BoxDecoration(color: AppColors.surface, border: Border(top: BorderSide(color: AppColors.border))),
        child: SafeArea(
          child: SizedBox(
            height: 62,
            child: Row(
              children: List.generate(_items.length, (i) {
                final selected = i == _index;
                final (icon, label) = _items[i];
                final color = selected ? AppColors.orange : AppColors.textMuted;
                return Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _index = i),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(icon, color: color, size: 23),
                        const SizedBox(height: 3),
                        Text(label, style: TextStyle(fontSize: 10.5, color: color, fontWeight: selected ? FontWeight.w600 : FontWeight.w400)),
                      ],
                    ),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }
}
