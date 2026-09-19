import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../providers/shop_provider.dart';
import '../../providers/vendor_provider.dart';
import '../../widgets/banner_slider.dart';
import '../../widgets/price_tag.dart';
import '../../widgets/wholesale_product_grid.dart';
import 'wholesale_product_details_screen.dart';

/// The wholesale portal's Home tab -- same banner slider and category row as
/// the retail app's Home, but backed by wholesale pricing and stock.
class WholesaleCatalogTab extends StatefulWidget {
  const WholesaleCatalogTab({super.key});

  @override
  State<WholesaleCatalogTab> createState() => _WholesaleCatalogTabState();
}

class _WholesaleCatalogTabState extends State<WholesaleCatalogTab> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<ShopProvider>().loadHome());
  }

  @override
  Widget build(BuildContext context) {
    final vendor = context.watch<VendorProvider>();
    final shop = context.watch<ShopProvider>();
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: () => Future.wait([vendor.loadProducts(), context.read<ShopProvider>().loadHome()]),
        child: ListView(
          padding: const EdgeInsets.only(bottom: 14),
          children: [
            const SizedBox(height: 12),
            BannerSlider(banners: shop.banners, onShopNow: () {}),
            const SizedBox(height: 16),
            if (vendor.limits != null)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.symmetric(horizontal: 14),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: AppColors.navy, borderRadius: BorderRadius.circular(12)),
                child: Text(
                  'Wholesale rates apply. Order value must be between ${formatPaise(vendor.limits!.minPaise)} and ${formatPaise(vendor.limits!.maxPaise)}.',
                  style: const TextStyle(color: Colors.white, fontSize: 12.5),
                ),
              ),
            const SizedBox(height: 14),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Text('Available to Order', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: AppColors.textPrimary)),
            ),
            vendor.products.isEmpty
                ? const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()))
                : WholesaleProductGrid(
                    products: vendor.products,
                    onTapProduct: (p) => Navigator.of(context).push(MaterialPageRoute(builder: (_) => WholesaleProductDetailsScreen(product: p))),
                  ),
          ],
        ),
      ),
    );
  }
}
