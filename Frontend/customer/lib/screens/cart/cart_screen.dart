import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../providers/cart_provider.dart';
import '../../widgets/price_tag.dart';
import '../../widgets/primary_button.dart';
import '../checkout/checkout_address_screen.dart';

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
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<CartProvider>().load());
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();
    return Scaffold(
      appBar: AppBar(automaticallyImplyLeading: !widget.embedded, title: Text('My Cart (${cart.items.length})')),
      body: SafeArea(
        child: cart.loading
            ? const Center(child: CircularProgressIndicator())
            : cart.items.isEmpty
                ? Center(child: Text('Your cart is empty', style: TextStyle(color: AppColors.textMuted)))
                : Column(
                    children: [
                      Expanded(
                        child: ListView.separated(
                          padding: const EdgeInsets.all(14),
                          itemCount: cart.items.length,
                          separatorBuilder: (context, index) => const SizedBox(height: 10),
                          itemBuilder: (context, i) {
                            final item = cart.items[i];
                            return Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(8),
                                    child: item.product.image.isEmpty
                                        ? Container(width: 64, height: 64, color: AppColors.background, child: const Icon(Icons.image_outlined))
                                        : Image.network(item.product.image, width: 64, height: 64, fit: BoxFit.cover),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(item.product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                                        const SizedBox(height: 4),
                                        PriceTag(pricePaise: item.product.pricePaise, mrpPaise: item.product.mrpPaise, size: 14),
                                        const SizedBox(height: 6),
                                        Row(
                                          children: [
                                            _StepperButton(icon: Icons.remove, onTap: () => context.read<CartProvider>().setQuantity(item.product.id, item.quantity - 1 < 1 ? 1 : item.quantity - 1)),
                                            Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: Text('${item.quantity}', style: const TextStyle(fontWeight: FontWeight.w600))),
                                            _StepperButton(icon: Icons.add, onTap: () => context.read<CartProvider>().setQuantity(item.product.id, item.quantity + 1)),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                  IconButton(
                                    icon: Icon(Icons.delete_outline, color: AppColors.textMuted),
                                    onPressed: () => context.read<CartProvider>().remove(item.product.id),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
                      SafeArea(
                        top: false,
                        child: Container(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                          decoration: BoxDecoration(color: AppColors.surface, border: Border(top: BorderSide(color: AppColors.border))),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('Total Amount', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                                  Text(formatPaise(cart.subtotalPaise), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                                ],
                              ),
                              const SizedBox(height: 10),
                              PrimaryButton(
                                label: 'Proceed to Checkout',
                                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CheckoutAddressScreen())),
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

class _StepperButton extends StatelessWidget {
  const _StepperButton({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        width: 26,
        height: 26,
        decoration: BoxDecoration(border: Border.all(color: AppColors.border), borderRadius: BorderRadius.circular(6)),
        child: Icon(icon, size: 15),
      ),
    );
  }
}
