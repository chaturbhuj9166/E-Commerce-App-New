import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../models/product.dart';
import '../../providers/vendor_provider.dart';
import '../../widgets/app_network_image.dart';
import '../../widgets/price_tag.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/wholesale_product_grid.dart';
import 'wholesale_checkout_screen.dart';
import 'wholesale_product_details_screen.dart';

class WholesaleCartScreen extends StatelessWidget {
  const WholesaleCartScreen({super.key});

  /// Suggestions below the cart lines -- handy when the order is still under
  /// the vendor's minimum value.
  Widget _moreProducts(BuildContext context, VendorProvider vendor) {
    final inCart = vendor.cart.keys.map((l) => l.productId).toSet();
    final more = vendor.products.where((p) => p.stock > 0 && !inCart.contains(p.id)).take(10).toList();
    if (more.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 12),
        const Text('Add more to your order', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
        const SizedBox(height: 10),
        SizedBox(
          height: 196,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: more.length,
            separatorBuilder: (context, index) => const SizedBox(width: 10),
            itemBuilder: (context, i) {
              final p = more[i];
              return InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => WholesaleProductDetailsScreen(product: p))),
                child: Container(
                  width: 140,
                  decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: ClipRRect(
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                          child: p.image.isEmpty ? Container(color: AppColors.background) : AppNetworkImage(p.image, width: double.infinity),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(8, 6, 8, 8),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                            const SizedBox(height: 2),
                            Text(formatPaise(p.wholesaleFor(null)), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final vendor = context.watch<VendorProvider>();
    // Lines whose product vanished from the catalog are skipped (and pruned on the next reload).
    final items = <(Product, VendorLine, int)>[
      for (final e in vendor.cart.entries)
        if (vendor.productById(e.key.productId) case final p?) (p, e.key, e.value),
    ];
    final limits = vendor.limits;
    final belowMin = limits != null && vendor.subtotalPaise < limits.minPaise && vendor.subtotalPaise > 0;
    final aboveMax = limits != null && vendor.subtotalPaise > limits.maxPaise;
    final blocked = belowMin || aboveMax || vendor.limitsMissing;

    return Scaffold(
      appBar: AppBar(title: Text('Wholesale Cart (${items.length})')),
      body: SafeArea(
        child: items.isEmpty
            ? Center(child: Text('Your wholesale cart is empty', style: TextStyle(color: AppColors.textMuted)))
            : Column(
                children: [
                  Expanded(
                    child: ListView.separated(
                      padding: const EdgeInsets.all(14),
                      itemCount: items.length + 1,
                      separatorBuilder: (context, index) => const SizedBox(height: 10),
                      itemBuilder: (context, i) {
                        if (i == items.length) return _moreProducts(context, vendor);
                        final (product, line, qty) = items[i];
                        final max = vendor.lineMax(line);
                        final variant = [if (line.size != null) '${product.sizeLabel}: ${line.size}', if (line.color != null) 'Color: ${line.color}'].join(' · ');
                        return Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
                          child: Row(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: product.image.isEmpty
                                    ? Container(width: 56, height: 56, color: AppColors.background, child: const Icon(Icons.image_outlined))
                                    : AppNetworkImage(product.image, width: 56, height: 56),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                                    if (variant.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 2), child: Text(variant, style: TextStyle(fontSize: 12, color: AppColors.textSecondary))),
                                    const SizedBox(height: 4),
                                    PriceTag(pricePaise: product.wholesaleFor(line.size), size: 14),
                                  ],
                                ),
                              ),
                              WholesaleQtyButton(icon: Icons.remove, size: 28, onTap: () => vendor.setQuantity(product.id, qty - 1, size: line.size, color: line.color)),
                              Padding(padding: const EdgeInsets.symmetric(horizontal: 10), child: Text('$qty', style: const TextStyle(fontWeight: FontWeight.w700))),
                              WholesaleQtyButton(icon: Icons.add, size: 28, onTap: qty >= max ? null : () => vendor.setQuantity(product.id, qty + 1, size: line.size, color: line.color)),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                  SafeArea(
                    top: false,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (blocked)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: Text(
                                limits == null
                                    ? VendorProvider.noLimitsMessage
                                    : belowMin
                                        ? 'Minimum order value is ${formatPaise(limits.minPaise)}. Add ${formatPaise(limits.minPaise - vendor.subtotalPaise)} more to checkout.'
                                        : 'Maximum order value is ${formatPaise(limits.maxPaise)}. Please reduce your cart.',
                                style: const TextStyle(color: AppColors.danger, fontSize: 12.5),
                              ),
                            ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Total Amount', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                              Text(formatPaise(vendor.subtotalPaise), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                            ],
                          ),
                          const SizedBox(height: 10),
                          PrimaryButton(
                            label: 'Proceed to Checkout',
                            onPressed: blocked
                                ? null
                                : () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const WholesaleCheckoutScreen())),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
