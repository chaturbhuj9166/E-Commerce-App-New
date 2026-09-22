import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../models/cart_item.dart';
import '../../models/product.dart';
import '../../providers/cart_provider.dart';
import '../../providers/shop_provider.dart';
import '../../providers/wishlist_provider.dart';
import '../../widgets/app_network_image.dart';
import '../../widgets/bottom_nav_shell.dart';
import '../../widgets/price_tag.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/product_card.dart';
import '../checkout/checkout_address_screen.dart';
import '../products/product_details_screen.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CartProvider>().load();
      // Recommendations come from the Home feed; load it if nothing has yet.
      final shop = context.read<ShopProvider>();
      if (shop.latest.isEmpty && !shop.loading) shop.loadHome();
    });
  }

  /// Cart changes can fail (e.g. 400 insufficient stock) -- show why.
  Future<void> _run(Future<void> Function() action) async {
    try {
      await action();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  /// Products worth suggesting: same categories as the cart first, then
  /// deals and the newest items -- never something already in the cart.
  List<Product> _recommendations(List<CartItem> items, ShopProvider shop) {
    final inCart = items.map((i) => i.product.id).toSet();
    final categories = items.map((i) => i.product.category?.id).whereType<String>().toSet();
    final seen = <String>{};
    final pool = [...shop.deals, ...shop.latest].where((p) => p.stock > 0 && !inCart.contains(p.id) && seen.add(p.id)).toList();
    pool.sort((a, b) => (categories.contains(b.category?.id) ? 1 : 0) - (categories.contains(a.category?.id) ? 1 : 0));
    return pool.take(10).toList();
  }

  void _openProduct(String id) => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ProductDetailsScreen(productId: id))).then((_) {
        if (mounted) context.read<CartProvider>().load();
      });

  void _startShopping() {
    if (!BottomNavShell.selectTab(context, 0)) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();
    final shop = context.watch<ShopProvider>();
    final recommended = _recommendations(cart.items, shop);
    return Scaffold(
      appBar: AppBar(automaticallyImplyLeading: !widget.embedded, title: Text('My Cart (${cart.items.length})')),
      body: SafeArea(
        child: cart.loading && cart.items.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : cart.items.isEmpty
                ? _emptyCart(cart, shop)
                : Column(
                    children: [
                      Expanded(
                        child: RefreshIndicator(
                          onRefresh: () => context.read<CartProvider>().load(),
                          child: ListView(
                            padding: const EdgeInsets.fromLTRB(14, 14, 14, 20),
                            children: [
                              for (final item in cart.items) ...[_itemTile(item, cart), const SizedBox(height: 10)],
                              const SizedBox(height: 6),
                              _priceDetails(cart),
                              if (recommended.isNotEmpty) ...[
                                const SizedBox(height: 22),
                                _recommendedStrip('You may also like', recommended),
                              ],
                            ],
                          ),
                        ),
                      ),
                      _checkoutBar(cart),
                    ],
                  ),
      ),
    );
  }

  Widget _emptyCart(CartProvider cart, ShopProvider shop) {
    // Two different strips so an empty cart still has plenty to browse.
    final deals = shop.deals.where((p) => p.stock > 0).take(10).toList();
    final dealIds = deals.map((p) => p.id).toSet();
    final recommended = shop.latest.where((p) => p.stock > 0 && !dealIds.contains(p.id)).take(10).toList();
    return RefreshIndicator(
      onRefresh: () => context.read<CartProvider>().load(),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(14, 30, 14, 20),
        children: [
          Center(
            child: Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(color: AppColors.orange.withValues(alpha: 0.12), shape: BoxShape.circle),
              child: const Icon(Icons.shopping_cart_outlined, size: 46, color: AppColors.orange),
            ),
          ),
          const SizedBox(height: 16),
          const Center(child: Text('Your cart is empty', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700))),
          const SizedBox(height: 6),
          Center(child: Text('Looks like you haven\'t added anything yet.', style: TextStyle(color: AppColors.textSecondary))),
          if (cart.error != null) ...[
            const SizedBox(height: 10),
            Center(child: Text(cart.error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.danger))),
            Center(child: TextButton(onPressed: () => context.read<CartProvider>().load(), child: const Text('Retry'))),
          ],
          const SizedBox(height: 18),
          Center(child: SizedBox(width: 200, child: PrimaryButton(label: 'Start Shopping', orange: true, onPressed: _startShopping))),
          if (deals.isNotEmpty) ...[
            const SizedBox(height: 30),
            _recommendedStrip('Deals of the Day', deals),
          ],
          if (recommended.isNotEmpty) ...[
            const SizedBox(height: 22),
            _recommendedStrip('Recommended for you', recommended),
          ],
        ],
      ),
    );
  }

  Widget _itemTile(CartItem item, CartProvider cart) {
    final cartProvider = context.read<CartProvider>();
    return Opacity(
      opacity: item.available ? 1 : 0.6,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _openProduct(item.product.id),
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: item.available ? AppColors.border : AppColors.danger)),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: item.product.image.isEmpty
                    ? Container(width: 72, height: 72, color: AppColors.background, child: const Icon(Icons.image_outlined))
                    : AppNetworkImage(item.product.image, width: 72, height: 72),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item.product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                    const SizedBox(height: 4),
                    if (item.variantText.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Text(item.variantText, style: TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
                      ),
                    PriceTag(pricePaise: item.unitPaise, mrpPaise: item.mrpPaise, size: 14),
                    const SizedBox(height: 6),
                    if (!item.active || item.product.stock == 0)
                      const Text('No longer available -- remove to continue', style: TextStyle(color: AppColors.danger, fontSize: 12, fontWeight: FontWeight.w600))
                    else ...[
                      if (!item.available)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Text('Only ${item.product.stock} left -- reduce quantity', style: const TextStyle(color: AppColors.danger, fontSize: 12, fontWeight: FontWeight.w600)),
                        ),
                      Row(
                        children: [
                          _StepperButton(
                            icon: Icons.remove,
                            onTap: item.quantity <= 1 || cart.loading ? null : () => _run(() => cartProvider.setQuantity(item.product.id, item.quantity - 1, size: item.size, color: item.color)),
                          ),
                          Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: Text('${item.quantity}', style: const TextStyle(fontWeight: FontWeight.w600))),
                          _StepperButton(
                            icon: Icons.add,
                            onTap: cart.loading ? null : () => _run(() => cartProvider.setQuantity(item.product.id, item.quantity + 1, size: item.size, color: item.color)),
                          ),
                          const Spacer(),
                          Text(formatPaise(item.lineTotalPaise), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              IconButton(
                icon: Icon(Icons.delete_outline, color: AppColors.textMuted),
                onPressed: () => _run(() => cartProvider.remove(item.product.id, size: item.size, color: item.color)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _priceDetails(CartProvider cart) {
    final available = cart.items.where((i) => i.available);
    final mrpTotal = available.fold<int>(0, (s, i) => s + (i.mrpPaise != null && i.mrpPaise! > i.unitPaise ? i.mrpPaise! : i.unitPaise) * i.quantity);
    final savings = mrpTotal - cart.subtotalPaise;
    final units = available.fold<int>(0, (s, i) => s + i.quantity);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Price Details', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 12),
          _row('Price ($units item${units == 1 ? '' : 's'})', formatPaise(mrpTotal)),
          if (savings > 0) _row('Discount', '-${formatPaise(savings)}', color: AppColors.success),
          _row('Delivery', 'FREE', color: AppColors.success),
          const Divider(height: 20),
          _row('Total Amount', formatPaise(cart.subtotalPaise), bold: true),
          if (savings > 0) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
              decoration: BoxDecoration(color: AppColors.success.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
              child: Text('🎉 You save ${formatPaise(savings)} on this order', style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.w600, fontSize: 12.5)),
            ),
          ],
          const SizedBox(height: 10),
          Row(children: [
            Icon(Icons.verified_user_outlined, size: 16, color: AppColors.textMuted),
            const SizedBox(width: 6),
            Expanded(child: Text('Safe and secure payments · Easy returns', style: TextStyle(fontSize: 11.5, color: AppColors.textMuted))),
          ]),
        ],
      ),
    );
  }

  Widget _row(String label, String value, {Color? color, bool bold = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(fontSize: bold ? 14.5 : 13, fontWeight: bold ? FontWeight.w700 : FontWeight.w400, color: bold ? null : AppColors.textSecondary)),
            Text(value, style: TextStyle(fontSize: bold ? 15 : 13, fontWeight: bold ? FontWeight.w700 : FontWeight.w600, color: color)),
          ],
        ),
      );

  Widget _recommendedStrip(String title, List<Product> products) {
    final wishlist = context.watch<WishlistProvider>();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
        const SizedBox(height: 10),
        SizedBox(
          height: 240,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: products.length,
            separatorBuilder: (context, index) => const SizedBox(width: 10),
            itemBuilder: (context, i) {
              final p = products[i];
              return SizedBox(
                width: 158,
                child: ProductCard(
                  product: p,
                  wished: wishlist.contains(p.id),
                  onTap: () => _openProduct(p.id),
                  onWishlist: () async {
                    final error = await context.read<WishlistProvider>().toggleOrReport(p.id);
                    if (error != null && mounted) ScaffoldMessenger.of(this.context).showSnackBar(SnackBar(content: Text(error)));
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _checkoutBar(CartProvider cart) => SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          decoration: BoxDecoration(color: AppColors.surface, border: Border(top: BorderSide(color: AppColors.border))),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (cart.hasUnavailable)
                const Padding(
                  padding: EdgeInsets.only(bottom: 8),
                  child: Text('Remove or update the unavailable items to check out.', style: TextStyle(color: AppColors.danger, fontSize: 12)),
                ),
              Row(
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(formatPaise(cart.subtotalPaise), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                      Text('Total Amount', style: TextStyle(fontSize: 11.5, color: AppColors.textSecondary)),
                    ],
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: PrimaryButton(
                      label: 'Proceed to Checkout',
                      onPressed: cart.hasUnavailable || cart.loading
                          ? null
                          : () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CheckoutAddressScreen())),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
}

class _StepperButton extends StatelessWidget {
  const _StepperButton({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        width: 26,
        height: 26,
        decoration: BoxDecoration(border: Border.all(color: AppColors.border), borderRadius: BorderRadius.circular(6)),
        child: Icon(icon, size: 15, color: onTap == null ? AppColors.textMuted : null),
      ),
    );
  }
}
