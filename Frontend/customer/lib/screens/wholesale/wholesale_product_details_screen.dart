import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../models/product.dart';
import '../../providers/vendor_provider.dart';
import '../../widgets/price_tag.dart';

/// A single product's full details for a wholesale buyer -- the retail
/// ProductDetailsScreen isn't reused here since it's wired to
/// CartProvider/WishlistProvider (customer-only endpoints) and shows
/// reviews/retail price, neither of which apply to a bulk buyer.
class WholesaleProductDetailsScreen extends StatelessWidget {
  const WholesaleProductDetailsScreen({super.key, required this.product});

  final Product product;

  @override
  Widget build(BuildContext context) {
    final vendor = context.watch<VendorProvider>();
    final qty = vendor.cart[product.id] ?? 0;
    return Scaffold(
      appBar: AppBar(title: Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            AspectRatio(
              aspectRatio: 1.1,
              child: product.image.isEmpty
                  ? Container(color: AppColors.background, child: Icon(Icons.image_outlined, size: 48, color: AppColors.textMuted))
                  : CachedNetworkImage(imageUrl: product.image, fit: BoxFit.cover, errorWidget: (context, url, error) => const Icon(Icons.image_outlined)),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (product.category != null) Text(product.category!.name.toUpperCase(), style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
                  const SizedBox(height: 4),
                  Text(product.name, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      PriceTag(pricePaise: product.wholesalePaise ?? product.pricePaise, size: 22),
                      const SizedBox(width: 10),
                      Text('Customer price ${formatPaise(product.pricePaise)}', style: TextStyle(fontSize: 12.5, color: AppColors.textMuted)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text('${product.stock} units in stock', style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary)),
                  const SizedBox(height: 18),
                  if (product.colors.isNotEmpty) ...[
                    Text('Available Colors', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.textPrimary)),
                    const SizedBox(height: 8),
                    Wrap(spacing: 8, runSpacing: 8, children: product.colors.map((c) => Chip(label: Text(c, style: const TextStyle(fontSize: 12)))).toList()),
                    const SizedBox(height: 16),
                  ],
                  if (product.sizes.isNotEmpty) ...[
                    Text('Available Sizes', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.textPrimary)),
                    const SizedBox(height: 8),
                    Wrap(spacing: 8, runSpacing: 8, children: product.sizes.map((s) => Chip(label: Text(s, style: const TextStyle(fontSize: 12)))).toList()),
                    const SizedBox(height: 16),
                  ],
                  Text('Description', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.textPrimary)),
                  const SizedBox(height: 6),
                  Text(product.description, style: TextStyle(fontSize: 13.5, color: AppColors.textSecondary, height: 1.5)),
                  if (product.attributes.isNotEmpty) ...[
                    const SizedBox(height: 18),
                    const Divider(),
                    const SizedBox(height: 6),
                    Text('Specifications', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.textPrimary)),
                    const SizedBox(height: 8),
                    ...product.attributes.map((a) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              SizedBox(width: 120, child: Text(a.$1, style: TextStyle(color: AppColors.textMuted, fontSize: 13))),
                              Expanded(child: Text(a.$2, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500))),
                            ],
                          ),
                        )),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
          child: qty == 0
              ? SizedBox(
                  height: 46,
                  child: ElevatedButton(
                    onPressed: () => context.read<VendorProvider>().setQuantity(product.id, 1),
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.orange, foregroundColor: Colors.white),
                    child: const Text('Add to Order', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                )
              : Row(
                  children: [
                    Text('In your order:', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                    const Spacer(),
                    _QtyButton(icon: Icons.remove, onTap: () => context.read<VendorProvider>().setQuantity(product.id, qty - 1)),
                    Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: Text('$qty', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16))),
                    _QtyButton(icon: Icons.add, onTap: () => context.read<VendorProvider>().setQuantity(product.id, qty + 1)),
                  ],
                ),
        ),
      ),
    );
  }
}

class _QtyButton extends StatelessWidget {
  const _QtyButton({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(color: AppColors.navy, borderRadius: BorderRadius.circular(8)),
        child: Icon(icon, size: 18, color: Colors.white),
      ),
    );
  }
}
