import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../../core/api_client.dart';
import '../../core/app_colors.dart';
import '../../models/coupon.dart';
import '../../providers/cart_provider.dart';
import '../../providers/shop_provider.dart';
import '../../widgets/checkout_stepper.dart';
import '../../widgets/price_tag.dart';
import '../../widgets/primary_button.dart';
import '../orders/order_placed_screen.dart';
import 'checkout_payment_screen.dart';

class OrderSummaryScreen extends StatefulWidget {
  const OrderSummaryScreen({super.key, required this.addressId, required this.method});

  final String addressId;
  final PaymentMethod method;

  @override
  State<OrderSummaryScreen> createState() => _OrderSummaryScreenState();
}

class _OrderSummaryScreenState extends State<OrderSummaryScreen> {
  bool _placing = false;
  String? _error;
  final _couponController = TextEditingController();
  Coupon? _appliedCoupon;
  String? _couponError;

  /// UPI / card / net-banking route through the real payment gateway once
  /// the client supplies live Razorpay keys. Backend/src/services/payments.js
  /// is already wired for it; until then we use the Backend's own 'DEMO'
  /// payment method (only active when DEMO_MODE=true) so checkout works
  /// end-to-end today.
  String get _backendMethod => switch (widget.method) {
        PaymentMethod.wallet => 'WALLET',
        PaymentMethod.cod => 'COD',
        PaymentMethod.razorpay => 'DEMO',
      };

  int _estimatedDiscount(int subtotalPaise) {
    final c = _appliedCoupon;
    if (c == null) return 0;
    var discount = c.discountType == 'PERCENT' ? (subtotalPaise * c.value / 100).floor() : c.value;
    if (c.maxDiscountPaise != null) discount = discount > c.maxDiscountPaise! ? c.maxDiscountPaise! : discount;
    return discount > subtotalPaise ? subtotalPaise : discount;
  }

  Future<void> _applyCoupon(int subtotalPaise) async {
    setState(() => _couponError = null);
    final code = _couponController.text.trim().toUpperCase();
    if (code.isEmpty) return;
    final shop = context.read<ShopProvider>();
    if (shop.coupons.isEmpty) await shop.loadCoupons();
    final match = shop.coupons.where((c) => c.code == code).toList();
    if (match.isEmpty) {
      setState(() => _couponError = 'Invalid or expired coupon');
      return;
    }
    if (subtotalPaise < match.first.minOrderPaise) {
      setState(() => _couponError = 'Needs a minimum order of ${formatPaise(match.first.minOrderPaise)}');
      return;
    }
    setState(() => _appliedCoupon = match.first);
  }

  Future<void> _placeOrder(CartProvider cart) async {
    setState(() {
      _placing = true;
      _error = null;
    });
    try {
      final order = await ApiClient.instance.post('/orders', data: {
        'items': cart.items.map((i) => {'productId': i.product.id, 'quantity': i.quantity}).toList(),
        'addressId': widget.addressId,
        'paymentMethod': _backendMethod,
        if (_appliedCoupon != null) 'couponCode': _appliedCoupon!.code,
        'checkoutKey': const Uuid().v4(),
      }) as Map<String, dynamic>;
      await cart.load();
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => OrderPlacedScreen(orderId: order['id'] as String)),
        (route) => route.isFirst,
      );
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _placing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();
    const deliveryFeePaise = 0;
    final discountPaise = _estimatedDiscount(cart.subtotalPaise);
    final totalPaise = cart.subtotalPaise + deliveryFeePaise - discountPaise;
    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: SafeArea(
        child: Column(
          children: [
            const CheckoutStepper(step: 3),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  const Text('Order Summary', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                  const SizedBox(height: 10),
                  ...cart.items.map((item) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Row(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: item.product.image.isEmpty
                                  ? Container(width: 48, height: 48, color: AppColors.background, child: const Icon(Icons.image_outlined, size: 20))
                                  : Image.network(item.product.image, width: 48, height: 48, fit: BoxFit.cover),
                            ),
                            const SizedBox(width: 10),
                            Expanded(child: Text(item.product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13.5))),
                            Text(formatPaise(item.lineTotalPaise), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                          ],
                        ),
                      )),
                  const Divider(height: 24),
                  const Text('Apply Coupon', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                  const SizedBox(height: 10),
                  if (_appliedCoupon != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(color: AppColors.success.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                      child: Row(
                        children: [
                          const Icon(Icons.local_offer_rounded, color: AppColors.success, size: 18),
                          const SizedBox(width: 8),
                          Expanded(child: Text('${_appliedCoupon!.code} applied — ${_appliedCoupon!.summary}', style: const TextStyle(color: AppColors.success, fontSize: 12.5, fontWeight: FontWeight.w600))),
                          GestureDetector(onTap: () => setState(() => _appliedCoupon = null), child: const Icon(Icons.close, size: 18, color: AppColors.success)),
                        ],
                      ),
                    )
                  else
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _couponController,
                            textCapitalization: TextCapitalization.characters,
                            decoration: const InputDecoration(hintText: 'Enter coupon code'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        OutlinedButton(onPressed: () => _applyCoupon(cart.subtotalPaise), child: const Text('Apply')),
                      ],
                    ),
                  if (_couponError != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text(_couponError!, style: const TextStyle(color: AppColors.danger, fontSize: 12))),
                  const Divider(height: 24),
                  const Text('Price Details', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                  const SizedBox(height: 10),
                  _PriceRow(label: 'Items Total', value: formatPaise(cart.subtotalPaise)),
                  const _PriceRow(label: 'Delivery Fee', value: 'FREE', valueColor: AppColors.success),
                  if (discountPaise > 0) _PriceRow(label: 'Coupon Discount', value: '-${formatPaise(discountPaise)}', valueColor: AppColors.success),
                  const Divider(height: 24),
                  _PriceRow(label: 'Total Amount', value: formatPaise(totalPaise), bold: true),
                  if (_error != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(_error!, style: const TextStyle(color: AppColors.danger))),
                  const SizedBox(height: 16),
                ],
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 6, 16, 12),
                child: PrimaryButton(label: 'Place Order', loading: _placing, onPressed: cart.items.isEmpty ? null : () => _placeOrder(cart)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PriceRow extends StatelessWidget {
  const _PriceRow({required this.label, required this.value, this.bold = false, this.valueColor});
  final String label;
  final String value;
  final bool bold;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: bold ? 15 : 13.5, fontWeight: bold ? FontWeight.w700 : FontWeight.w400, color: bold ? AppColors.textPrimary : AppColors.textSecondary)),
          Text(value, style: TextStyle(fontSize: bold ? 16 : 13.5, fontWeight: FontWeight.w700, color: valueColor ?? AppColors.textPrimary)),
        ],
      ),
    );
  }
}
