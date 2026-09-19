import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../providers/cart_provider.dart';
import '../../providers/wishlist_provider.dart';
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

  @override
  Widget build(BuildContext context) {
    final wishlist = context.watch<WishlistProvider>();
    return Scaffold(
      appBar: AppBar(automaticallyImplyLeading: !widget.embedded, title: Text('My Wishlist (${wishlist.items.length})')),
      body: SafeArea(
        child: wishlist.loading
            ? const Center(child: CircularProgressIndicator())
            : wishlist.items.isEmpty
                ? Center(child: Text('Nothing here yet', style: TextStyle(color: AppColors.textMuted)))
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
                                    : Image.network(p.image, width: 60, height: 60, fit: BoxFit.cover),
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
                                      onPressed: p.stock == 0
                                          ? null
                                          : () => context.read<CartProvider>().setQuantity(p.id, 1).then((_) {
                                                if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Added to cart')));
                                              }),
                                      style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12), visualDensity: VisualDensity.compact),
                                      child: const Text('Add to Cart', style: TextStyle(fontSize: 12)),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(icon: const Icon(Icons.favorite, color: AppColors.danger), onPressed: () => context.read<WishlistProvider>().toggle(p.id)),
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
