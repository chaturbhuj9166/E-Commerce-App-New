import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../providers/vendor_provider.dart';
import '../../widgets/price_tag.dart';
import '../../widgets/primary_button.dart';
import 'wholesale_checkout_screen.dart';

class WholesaleCartScreen extends StatelessWidget {
  const WholesaleCartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final vendor = context.watch<VendorProvider>();
    final items = vendor.cart.entries.map((e) => (vendor.products.firstWhere((p) => p.id == e.key), e.value)).toList();
    final limits = vendor.limits;
    final belowMin = limits != null && vendor.subtotalPaise < limits.minPaise && vendor.subtotalPaise > 0;
    final aboveMax = limits != null && vendor.subtotalPaise > limits.maxPaise;

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
                      itemCount: items.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 10),
                      itemBuilder: (context, i) {
                        final (product, qty) = items[i];
                        return Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
                          child: Row(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: product.image.isEmpty
                                    ? Container(width: 56, height: 56, color: AppColors.background, child: const Icon(Icons.image_outlined))
                                    : Image.network(product.image, width: 56, height: 56, fit: BoxFit.cover),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                                    const SizedBox(height: 4),
                                    PriceTag(pricePaise: product.wholesalePaise ?? product.pricePaise, size: 14),
                                  ],
                                ),
                              ),
                              Text('x$qty', style: const TextStyle(fontWeight: FontWeight.w600)),
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
                          if (limits != null && (belowMin || aboveMax))
                            Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: Text(
                                belowMin
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
                            onPressed: (belowMin || aboveMax)
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
