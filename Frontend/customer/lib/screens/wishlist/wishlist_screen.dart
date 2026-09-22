import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../providers/cart_provider.dart';
import '../../providers/wishlist_provider.dart';
import '../../widgets/app_network_image.dart';
import '../../widgets/price_tag.dart';
import '../products/product_details_screen.dart';

class WishlistScreen extends StatefulWidget {
  const WishlistScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  State<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends State<WishlistScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<WishlistProvider>().load());
  }

  Future<bool> _run(Future<void> Function() action) async {
    try {
      await action();
      return true;
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      return false;
    }
  }

  Future<void> _addToCart(String productId, {bool hasVariants = false}) async {
    // A size/color has to be picked first -- that happens on the product page.
    if (hasVariants) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Choose a size / option first')));
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => ProductDetailsScreen(productId: productId)));
      return;
    }
    if (await _run(() => context.read<CartProvider>().add(productId)) && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Added to cart')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final wishlist = context.watch<WishlistProvider>();
    return Scaffold(
      appBar: AppBar(automaticallyImplyLeading: !widget.embedded, title: Text('My Wishlist (${wishlist.items.length})')),
      body: SafeArea(
        child: wishlist.loading
            ? const Center(child: CircularProgressIndicator())
            : wishlist.items.isEmpty
                ? Center(
                    child: wishlist.error == null
                        ? Text('Nothing here yet', style: TextStyle(color: AppColors.textMuted))
                        : Column(mainAxisSize: MainAxisSize.min, children: [
                            Padding(padding: const EdgeInsets.symmetric(horizontal: 24), child: Text(wishlist.error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.danger))),
                            const SizedBox(height: 12),
                            OutlinedButton(onPressed: () => context.read<WishlistProvider>().load(), child: const Text('Retry')),
                          ]),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(14),
                    itemCount: wishlist.items.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 10),
                    itemBuilder: (context, i) {
                      final p = wishlist.items[i];
                      return Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            GestureDetector(
                              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ProductDetailsScreen(productId: p.id))),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: p.image.isEmpty
                                    ? Container(width: 60, height: 60, color: AppColors.background, child: const Icon(Icons.image_outlined))
                                    : AppNetworkImage(p.image, width: 60, height: 60),
                              ),
                            ),
                            const SizedBox(width: 10),
                            // Only the small heart icon competes with this
                            // column for row width, so the name always has
                            // room; "Add to Cart" sits below the price
                            // instead of as a second wide item in the Row.
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5, color: AppColors.textPrimary)),
                                  const SizedBox(height: 4),
                                  PriceTag(pricePaise: p.pricePaise, mrpPaise: p.mrpPaise, size: 14),
                                  const SizedBox(height: 6),
                                  SizedBox(
                                    height: 30,
                                    child: OutlinedButton(
                                      onPressed: p.stock == 0 ? null : () => _addToCart(p.id, hasVariants: p.hasVariants),
                                      style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12), visualDensity: VisualDensity.compact),
                                      child: const Text('Add to Cart', style: TextStyle(fontSize: 12)),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(icon: const Icon(Icons.favorite, color: AppColors.danger), onPressed: () => _run(() => context.read<WishlistProvider>().toggle(p.id))),
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
