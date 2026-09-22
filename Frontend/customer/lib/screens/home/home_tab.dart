import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/app_colors.dart';
import '../../models/address.dart';
import '../../providers/auth_provider.dart';
import '../../providers/shop_provider.dart';
import '../../providers/wishlist_provider.dart';
import '../../widgets/app_network_image.dart';
import '../../widgets/banner_slider.dart';
import '../../widgets/category_icon.dart';
import '../../widgets/product_card.dart';
import '../account/notifications_screen.dart';
import '../categories/all_categories_screen.dart';
import '../products/product_details_screen.dart';
import '../products/product_listing_screen.dart';
import '../search/search_screen.dart';
import '../wholesale/vendor_login_screen.dart';

class HomeTab extends StatefulWidget {
  const HomeTab({super.key});

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  /// "City, State" of the customer's first saved address; null until they add one.
  String? _location;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ShopProvider>().loadHome();
      context.read<WishlistProvider>().load();
      _loadLocation();
    });
  }

  Future<void> _loadLocation() async {
    try {
      final data = await ApiClient.instance.get('/addresses') as List;
      final first = data.isEmpty ? null : Address.fromJson(data.first as Map<String, dynamic>);
      if (mounted) setState(() => _location = first == null ? null : '${first.city}, ${first.state}');
    } catch (_) {
      // Header just shows the "add an address" prompt.
    }
  }

  Future<void> _refresh() => Future.wait([context.read<ShopProvider>().loadHome(), _loadLocation()]);

  Future<void> _toggleWishlist(String id) async {
    final error = await context.read<WishlistProvider>().toggleOrReport(id);
    if (error != null && mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
  }

  @override
  Widget build(BuildContext context) {
    final shop = context.watch<ShopProvider>();
    final wishlist = context.watch<WishlistProvider>();
    final user = context.watch<AuthProvider>().user;

    return SafeArea(
      child: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: AppColors.navy,
                    backgroundImage: user?.photoUrl != null ? appImageProvider(user!.photoUrl!) : null,
                    onBackgroundImageError: user?.photoUrl != null ? (_, _) {} : null,
                    child: user?.photoUrl == null ? const Icon(Icons.person, color: Colors.white, size: 20) : null,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(user != null && user.rawName.trim().isNotEmpty ? user.rawName : 'Welcome to NTSA', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                        Row(
                          children: [
                            const Icon(Icons.location_on, size: 13, color: AppColors.orange),
                            const SizedBox(width: 2),
                            Flexible(child: Text(_location ?? 'Add a delivery address', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: AppColors.textSecondary))),
                          ],
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const NotificationsScreen())),
                    icon: const Icon(Icons.notifications_none_rounded),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: GestureDetector(
                onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SearchScreen())),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
                  child: Row(children: [
                    Icon(Icons.search, color: AppColors.textMuted, size: 20),
                    const SizedBox(width: 8),
                    Text('Search for products, brands...', style: TextStyle(color: AppColors.textMuted, fontSize: 13.5)),
                  ]),
                ),
              ),
            ),
            BannerSlider(
              banners: shop.banners,
              onShopNow: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ProductListingScreen(title: 'All Products'))),
            ),
            const SizedBox(height: 18),
            if (shop.categories.isNotEmpty) ...[
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Categories', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                    TextButton(
                      onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AllCategoriesScreen())),
                      child: const Text('See All'),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: GridView.count(
                  crossAxisCount: 4,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 10,
                  children: shop.categories.take(12).map((c) => CategoryIcon(
                        icon: categoryIconKey(c),
                        label: c.name,
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ProductListingScreen(title: c.name, categoryId: c.id))),
                      )).toList(),
                ),
              ),
            ],
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Deals of the Day', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                  TextButton(
                    onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ProductListingScreen(title: 'Deals of the Day', dealsOnly: true))),
                    child: const Text('See All'),
                  ),
                ],
              ),
            ),
            if (shop.loading) const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()))
            else if (shop.error != null)
              Padding(padding: const EdgeInsets.all(24), child: Text(shop.error!, style: const TextStyle(color: AppColors.danger)))
            else
              GridView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: shop.deals.length,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.66),
                itemBuilder: (context, i) {
                  final p = shop.deals[i];
                  return ProductCard(
                    product: p,
                    wished: wishlist.contains(p.id),
                    onWishlist: () => _toggleWishlist(p.id),
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ProductDetailsScreen(productId: p.id))),
                  );
                },
              ),
            const SizedBox(height: 20),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: GestureDetector(
                onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const VendorLoginScreen())),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.iconAccentSoft,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.storefront_rounded, color: AppColors.iconAccent, size: 30),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Wholesale Buyer?', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                            Text('Login with your wholesale ID for bulk rates', style: TextStyle(fontSize: 11.5, color: AppColors.textSecondary)),
                          ],
                        ),
                      ),
                      Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
