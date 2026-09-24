import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/app_colors.dart';
import '../models/product.dart';
import '../providers/vendor_provider.dart';
import 'app_network_image.dart';
import 'price_tag.dart';

/// The wholesale-priced product grid, shared by the wholesale Home tab and
/// its per-category listing so both stay visually identical.
class WholesaleProductGrid extends StatelessWidget {
  const WholesaleProductGrid({super.key, required this.products, this.onTapProduct});

  final List<Product> products;
  final void Function(Product product)? onTapProduct;

  @override
  Widget build(BuildContext context) {
    final vendor = context.watch<VendorProvider>();
    if (products.isEmpty) {
      return Center(child: Text('No products found', style: TextStyle(color: AppColors.textMuted)));
    }
    return GridView.builder(
      padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
      // This grid is always hosted inside another scrollable (the Home tab's
      // ListView, or the category screen's SingleChildScrollView below) --
      // without shrinkWrap it would be handed unbounded height and fail to
      // lay out at all, rendering nothing.
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: products.length,
      // A fixed tile height (not an aspect ratio) so the text block below the
      // image can't overflow narrow tiles or large text scales.
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, mainAxisExtent: 290),
      itemBuilder: (context, i) {
        final p = products[i];
        // Products with sizes/colors are added from their details page, where
        // the option is picked; the rest get quick -/+ controls here.
        final VendorLine line = (productId: p.id, size: null, color: null);
        final qty = p.hasVariants ? vendor.productQuantity(p.id) : vendor.cart[line] ?? 0;
        final max = vendor.lineMax(line);
        final openDetails = onTapProduct == null ? null : () => onTapProduct!(p);
        return GestureDetector(
          onTap: openDetails,
          child: Container(
          decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                  child: p.image.isEmpty
                      ? Container(color: AppColors.background, child: const Center(child: Icon(Icons.image_outlined)))
                      : AppNetworkImage(p.image, width: double.infinity),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12.5)),
                    const SizedBox(height: 4),
                    // Wholesale price against the market price (MRP), so the
                    // buyer sees the full margin, not just the retail cut.
                    PriceTag(pricePaise: p.wholesaleFor(null), mrpPaise: p.mrpFor(null) ?? p.pricePaise, size: 14),
                    Text('Customer price ${formatPaise(p.pricePaise)}', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 10.5, color: AppColors.textMuted)),
                    Text('You save ${formatPaise((p.mrpFor(null) ?? p.pricePaise) - p.wholesaleFor(null))} per unit', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 10.5, color: AppColors.success, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    p.hasVariants
                        ? SizedBox(
                            width: double.infinity,
                            height: 32,
                            child: OutlinedButton(
                              onPressed: VendorProvider.maxQuantity(p) == 0 ? null : openDetails,
                              child: Text(
                                VendorProvider.maxQuantity(p) == 0 ? 'Out of stock' : qty > 0 ? '$qty in order · Edit' : 'Choose options',
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                          )
                        : qty == 0
                        ? SizedBox(
                            width: double.infinity,
                            height: 32,
                            child: OutlinedButton(
                              onPressed: max == 0 ? null : () => context.read<VendorProvider>().setQuantity(p.id, 1),
                              child: Text(max == 0 ? 'Out of stock' : 'Add', style: const TextStyle(fontSize: 12)),
                            ),
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              WholesaleQtyButton(icon: Icons.remove, onTap: () => context.read<VendorProvider>().setQuantity(p.id, qty - 1)),
                              Text('$qty', style: const TextStyle(fontWeight: FontWeight.w700)),
                              WholesaleQtyButton(icon: Icons.add, onTap: qty >= max ? null : () => context.read<VendorProvider>().setQuantity(p.id, qty + 1)),
                            ],
                          ),
                  ],
                ),
              ),
            ],
          ),
          ),
        );
      },
    );
  }
}

/// The wholesale portal's -/+ quantity button; a null [onTap] shows it disabled.
class WholesaleQtyButton extends StatelessWidget {
  const WholesaleQtyButton({super.key, required this.icon, required this.onTap, this.size = 24});
  final IconData icon;
  final VoidCallback? onTap;
  final double size;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(size / 4);
    return InkWell(
      onTap: onTap,
      borderRadius: radius,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(color: onTap == null ? AppColors.textMuted : AppColors.navy, borderRadius: radius),
        child: Icon(icon, size: size * 0.55, color: Colors.white),
      ),
    );
  }
}
