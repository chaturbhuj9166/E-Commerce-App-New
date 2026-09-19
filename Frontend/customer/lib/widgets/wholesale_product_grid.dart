import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/app_colors.dart';
import '../models/product.dart';
import '../providers/vendor_provider.dart';
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
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.62),
      itemBuilder: (context, i) {
        final p = products[i];
        final qty = vendor.cart[p.id] ?? 0;
        return GestureDetector(
          onTap: onTapProduct == null ? null : () => onTapProduct!(p),
          child: Container(
          decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                  child: p.image.isEmpty
                      ? Container(color: AppColors.background, child: const Icon(Icons.image_outlined))
                      : Image.network(p.image, fit: BoxFit.cover, width: double.infinity),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12.5)),
                    const SizedBox(height: 4),
                    PriceTag(pricePaise: p.wholesalePaise ?? p.pricePaise, mrpPaise: p.pricePaise, size: 14),
                    Text('Customer price ${formatPaise(p.pricePaise)}', style: TextStyle(fontSize: 10.5, color: AppColors.textMuted)),
                    const SizedBox(height: 6),
                    qty == 0
                        ? SizedBox(
                            width: double.infinity,
                            height: 32,
                            child: OutlinedButton(
                              onPressed: () => context.read<VendorProvider>().setQuantity(p.id, 1),
                              child: const Text('Add', style: TextStyle(fontSize: 12)),
                            ),
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              _QtyButton(icon: Icons.remove, onTap: () => context.read<VendorProvider>().setQuantity(p.id, qty - 1)),
                              Text('$qty', style: const TextStyle(fontWeight: FontWeight.w700)),
                              _QtyButton(icon: Icons.add, onTap: () => context.read<VendorProvider>().setQuantity(p.id, qty + 1)),
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

class _QtyButton extends StatelessWidget {
  const _QtyButton({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        width: 24,
        height: 24,
        decoration: BoxDecoration(color: AppColors.navy, borderRadius: BorderRadius.circular(6)),
        child: Icon(icon, size: 14, color: Colors.white),
      ),
    );
  }
}
