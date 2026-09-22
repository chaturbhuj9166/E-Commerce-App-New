import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/app_colors.dart';
import '../../providers/vendor_provider.dart';
import '../../widgets/price_tag.dart';
import '../../widgets/primary_button.dart';
import '../orders/order_placed_screen.dart';
import 'wholesale_home_screen.dart';

/// Vendor checkout has no saved-address book on the backend (POST /orders
/// takes a raw `address` object for VENDOR actors, not an addressId --
/// see Backend/src/services/orders.js `checkout()`), so this collects it
/// inline each time.
class WholesaleCheckoutScreen extends StatefulWidget {
  const WholesaleCheckoutScreen({super.key});

  @override
  State<WholesaleCheckoutScreen> createState() => _WholesaleCheckoutScreenState();
}

enum _VendorPayment { cod, demo }

// Mirrors Backend/src/lib/validation.js addressSchema.
final _phonePattern = RegExp(r'^\+?[0-9]{10,15}$');
final _postalPattern = RegExp(r'^[0-9]{6}$');
String _stripPhone(String v) => v.replaceAll(RegExp(r'[\s-]'), '');
String? _required(String? v) => v!.trim().isEmpty ? 'Required' : null;

class _WholesaleCheckoutScreenState extends State<WholesaleCheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _line1 = TextEditingController();
  final _city = TextEditingController();
  final _state = TextEditingController();
  final _postalCode = TextEditingController();
  _VendorPayment _method = _VendorPayment.cod;
  // "Pay Online" posts a DEMO payment, which the backend only accepts in DEMO_MODE.
  bool _demoPayments = false;
  bool _placing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    ApiClient.instance.demoMode().then((demo) {
      if (mounted) setState(() => _demoPayments = demo);
    });
  }

  @override
  void dispose() {
    for (final c in [_name, _phone, _line1, _city, _state, _postalCode]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _placeOrder() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _placing = true;
      _error = null;
    });
    try {
      final orderId = await context.read<VendorProvider>().checkout(
        address: {
          'name': _name.text.trim(),
          'phone': _stripPhone(_phone.text),
          'line1': _line1.text.trim(),
          'city': _city.text.trim(),
          'state': _state.text.trim(),
          'postalCode': _postalCode.text.trim(),
        },
        paymentMethod: _demoPayments && _method == _VendorPayment.demo ? 'DEMO' : 'COD',
      );
      if (!mounted) return;
      // This screen is disposed once the route below replaces the stack, so
      // the continue button must not use its context.
      final nav = Navigator.of(context);
      nav.pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (_) => OrderPlacedScreen(
            orderId: orderId,
            continueLabel: 'Back to Wholesale Catalog',
            onContinue: () => nav.pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const WholesaleHomeScreen()), (route) => false),
          ),
        ),
        (route) => false,
      );
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _placing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final vendor = context.watch<VendorProvider>();
    return Scaffold(
      appBar: AppBar(title: const Text('Wholesale Checkout')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const Text('Delivery Address', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              const SizedBox(height: 10),
              TextFormField(controller: _name, maxLength: 200, decoration: const InputDecoration(labelText: 'Business / contact name', counterText: ''), validator: _required),
              const SizedBox(height: 10),
              TextFormField(
                controller: _phone,
                decoration: const InputDecoration(labelText: 'Phone number'),
                keyboardType: TextInputType.phone,
                validator: (v) => _phonePattern.hasMatch(_stripPhone(v!)) ? null : 'Enter a valid phone number (10-15 digits)',
              ),
              const SizedBox(height: 10),
              TextFormField(controller: _line1, maxLength: 200, decoration: const InputDecoration(labelText: 'Address', counterText: ''), validator: _required),
              const SizedBox(height: 10),
              TextFormField(controller: _city, maxLength: 200, decoration: const InputDecoration(labelText: 'City', counterText: ''), validator: _required),
              const SizedBox(height: 10),
              TextFormField(controller: _state, maxLength: 200, decoration: const InputDecoration(labelText: 'State', counterText: ''), validator: _required),
              const SizedBox(height: 10),
              TextFormField(
                controller: _postalCode,
                decoration: const InputDecoration(labelText: 'Postal code'),
                keyboardType: TextInputType.number,
                validator: (v) => _postalPattern.hasMatch(v!.trim()) ? null : 'Enter a 6-digit postal code',
              ),
              const SizedBox(height: 20),
              const Text('Payment Method', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              RadioGroup<_VendorPayment>(
                groupValue: _demoPayments ? _method : _VendorPayment.cod,
                onChanged: (v) => setState(() => _method = v!),
                child: Column(
                  children: [
                    RadioListTile<_VendorPayment>(value: _VendorPayment.cod, title: const Text('Cash on Delivery'), activeColor: AppColors.navy),
                    if (_demoPayments) RadioListTile<_VendorPayment>(value: _VendorPayment.demo, title: const Text('Pay Online'), activeColor: AppColors.navy),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total Amount', style: TextStyle(fontWeight: FontWeight.w600)),
                    Text(formatPaise(vendor.subtotalPaise), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  ],
                ),
              ),
              if (vendor.limitsMissing) const Padding(padding: EdgeInsets.only(top: 12), child: Text(VendorProvider.noLimitsMessage, style: TextStyle(color: AppColors.danger))),
              if (_error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_error!, style: const TextStyle(color: AppColors.danger))),
              const SizedBox(height: 20),
              PrimaryButton(label: 'Place Order', loading: _placing, onPressed: vendor.limitsMissing || vendor.cart.isEmpty ? null : _placeOrder),
            ],
          ),
        ),
      ),
    );
  }
}
