import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/app_colors.dart';
import '../providers/cart_provider.dart';
import '../providers/theme_provider.dart';
import '../screens/account/account_screen.dart';
import '../screens/assistant/ai_assistant_screen.dart';
import '../screens/cart/cart_screen.dart';
import '../screens/categories/all_categories_screen.dart';
import '../screens/home/home_tab.dart';
import '../screens/wishlist/wishlist_screen.dart';

/// The 5 root sections from the layout's bottom nav: Home, Categories,
/// Cart, Wishlist, Account (screens 6, 7, 11, 12 & 18).
class BottomNavShell extends StatefulWidget {
  const BottomNavShell({super.key});

  @override
  State<BottomNavShell> createState() => _BottomNavShellState();
}

class _BottomNavShellState extends State<BottomNavShell> {
  int _index = 0;

  final _tabs = [
    const HomeTab(),
    const AllCategoriesScreen(embedded: true),
    const CartScreen(embedded: true),
    const WishlistScreen(embedded: true),
    const AccountScreen(embedded: true),
  ];

  static const _items = [
    (Icons.home_rounded, 'Home'),
    (Icons.grid_view_rounded, 'Categories'),
    (Icons.shopping_cart_rounded, 'Cart'),
    (Icons.favorite_rounded, 'Wishlist'),
    (Icons.person_rounded, 'Account'),
  ];

  @override
  Widget build(BuildContext context) {
    final cartCount = context.watch<CartProvider>().count;
    // These 5 tabs stay mounted for the app's whole lifetime (IndexedStack
    // never disposes an offstage tab), so a tab built once in light mode
    // never re-runs its build() on its own when dark mode toggles later --
    // its colors (all read from the global AppColors, not Theme.of) stay
    // frozen at whatever they were the first time. Keying the stack to the
    // current mode forces Flutter to fully remount every tab on toggle, so
    // each one re-reads AppColors fresh instead of showing stale colors.
    final isDark = context.watch<ThemeProvider>().isDark;
    return Scaffold(
      body: IndexedStack(key: ValueKey(isDark), index: _index, children: _tabs),
      floatingActionButton: FloatingActionButton(
        heroTag: 'ai-assistant',
        backgroundColor: AppColors.orange,
        tooltip: 'Shopping Assistant',
        onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AiAssistantScreen())),
        child: const Icon(Icons.smart_toy_rounded, color: Colors.white),
      ),
      bottomNavigationBar: DecoratedBox(
        decoration: BoxDecoration(
          color: AppColors.surface,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
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
                        Stack(
                          clipBehavior: Clip.none,
                          children: [
                            Icon(icon, color: color, size: 23),
                            if (i == 2 && cartCount > 0)
                              Positioned(
                                right: -6,
                                top: -4,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                  decoration: const BoxDecoration(color: AppColors.danger, shape: BoxShape.circle),
                                  constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                                  child: Text('$cartCount', textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                                ),
                              ),
                          ],
                        ),
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
