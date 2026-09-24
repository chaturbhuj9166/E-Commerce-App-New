import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../models/product.dart';
import '../../providers/vendor_provider.dart';
import '../../widgets/app_network_image.dart';
import '../../widgets/price_tag.dart';
import '../../widgets/wholesale_product_grid.dart';

/// A single product's full details for a wholesale buyer -- the retail
/// ProductDetailsScreen isn't reused here since it's wired to
/// CartProvider/WishlistProvider (customer-only endpoints) and shows
/// reviews/retail price, neither of which apply to a bulk buyer.
class WholesaleProductDetailsScreen extends StatefulWidget {
  const WholesaleProductDetailsScreen({super.key, required this.product});

  final Product product;

  @override
  State<WholesaleProductDetailsScreen> createState() => _WholesaleProductDetailsScreenState();
}

class _WholesaleProductDetailsScreenState extends State<WholesaleProductDetailsScreen> {
  // Size and color must be picked on purpose, like in the retail app; each
  // pick is its own line in the wholesale order.
  String? _size;
  String? _color;
  bool _missingPick = false;

  Product get _product => context.read<VendorProvider>().productById(widget.product.id) ?? widget.product;
  bool get _picked => (_product.sizes.isEmpty || _size != null) && (_product.colors.isEmpty || _color != null);

  void _add() {
    if (!_picked) {
      setState(() => _missingPick = true);
      final p = _product;
      final missing = [if (p.colors.isNotEmpty && _color == null) 'color', if (p.sizes.isNotEmpty && _size == null) p.sizeLabel.toLowerCase()].join(' and ');
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Please select a $missing first')));
      return;
    }
    context.read<VendorProvider>().setQuantity(_product.id, 1, size: _size, color: _color);
  }

  Widget _chips(String title, List<String> options, String? selected, ValueChanged<String> onPick, {String Function(String)? label}) {
    final missing = _missingPick && selected == null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(selected == null ? 'Select $title' : '$title : $selected', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: missing ? AppColors.danger : AppColors.textPrimary)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: options
              .map((o) => ChoiceChip(
                    label: Text(label?.call(o) ?? o, style: const TextStyle(fontSize: 12)),
                    selected: selected == o,
                    side: missing ? const BorderSide(color: AppColors.danger) : null,
                    onSelected: (_) => setState(() {
                      onPick(o);
                      _missingPick = false;
                    }),
                  ))
              .toList(),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final vendor = context.watch<VendorProvider>();
    final product = vendor.productById(widget.product.id) ?? widget.product;
    final VendorLine line = (productId: product.id, size: _size, color: _color);
    final qty = _picked ? vendor.cart[line] ?? 0 : 0;
    final max = vendor.lineMax(line);
    // Other sizes/colors of this product already in the order.
    final otherLines = vendor.cart.entries.where((e) => e.key.productId == product.id && e.key != line).toList();
    final image = _color != null ? product.colorImages[_color] ?? product.image : product.image;
    return Scaffold(
      appBar: AppBar(title: Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            AspectRatio(
              aspectRatio: 1.1,
              child: image.isEmpty
                  ? Container(color: AppColors.background, child: Icon(Icons.image_outlined, size: 48, color: AppColors.textMuted))
                  : AppNetworkImage(image),
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
                  PriceTag(pricePaise: product.wholesaleFor(_size, _color), mrpPaise: product.mrpFor(_size, _color) ?? product.priceFor(_size, _color), size: 22),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text('Customer price ${formatPaise(product.priceFor(_size, _color))}', style: TextStyle(fontSize: 12.5, color: AppColors.textMuted)),
                      const SizedBox(width: 10),
                      Flexible(child: Text('You save ${formatPaise((product.mrpFor(_size, _color) ?? product.priceFor(_size, _color)) - product.wholesaleFor(_size, _color))} per unit', style: const TextStyle(fontSize: 12.5, color: AppColors.success, fontWeight: FontWeight.w600))),
                    ],
                  ),
                  if (product.sizePrices.isNotEmpty && _size == null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text('Price depends on the ${product.sizeLabel.toLowerCase()} you choose', style: TextStyle(fontSize: 12, color: AppColors.orange, fontWeight: FontWeight.w500)),
                    ),
                  const SizedBox(height: 6),
                  Text('${product.stock} units in stock', style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary)),
                  const SizedBox(height: 18),
                  if (product.colors.isNotEmpty)
                    _chips('Color', product.colors, _color, (c) => _color = c, label: (c) {
                      final extra = product.extraFor(c);
                      return extra > 0 ? '$c  (+${formatPaise(extra)})' : c;
                    }),
                  if (product.sizes.isNotEmpty)
                    _chips(product.sizeLabel, product.sizes, _size, (s) => _size = s, label: (s) {
                      final extra = product.sizePrices[s] != null ? product.wholesaleFor(s) - product.wholesaleFor(null) : 0;
                      return extra > 0 ? '$s  (+${formatPaise(extra)})' : s;
                    }),
                  if (otherLines.isNotEmpty) ...[
                    Text('Already in your order', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.textPrimary)),
                    const SizedBox(height: 6),
                    ...otherLines.map((e) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 3),
                          child: Text('• ${[?e.key.size, ?e.key.color].join(' · ')} × ${e.value}', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                        )),
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
                    onPressed: VendorProvider.maxQuantity(product) == 0 || (_picked && max == 0) ? null : _add,
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.orange, foregroundColor: Colors.white),
                    child: Text(VendorProvider.maxQuantity(product) == 0 || (_picked && max == 0) ? 'Out of Stock' : 'Add to Order', style: const TextStyle(fontWeight: FontWeight.w700)),
                  ),
                )
              : Row(
                  children: [
                    Expanded(child: Text('In your order${[?_size, ?_color].isEmpty ? '' : ' (${[?_size, ?_color].join(' · ')})'}:', style: TextStyle(fontSize: 13, color: AppColors.textSecondary))),
                    WholesaleQtyButton(icon: Icons.remove, size: 36, onTap: () => vendor.setQuantity(product.id, qty - 1, size: _size, color: _color)),
                    Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: Text('$qty', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16))),
                    WholesaleQtyButton(icon: Icons.add, size: 36, onTap: qty >= max ? null : () => vendor.setQuantity(product.id, qty + 1, size: _size, color: _color)),
                  ],
                ),
        ),
      ),
    );
  }
}
