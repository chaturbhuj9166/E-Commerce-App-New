import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
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

class _WholesaleCheckoutScreenState extends State<WholesaleCheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _line1 = TextEditingController();
  final _city = TextEditingController();
  final _state = TextEditingController();
  final _postalCode = TextEditingController();
  _VendorPayment _method = _VendorPayment.cod;
  bool _placing = false;
  String? _error;

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
          'phone': _phone.text.trim(),
          'line1': _line1.text.trim(),
          'city': _city.text.trim(),
          'state': _state.text.trim(),
          'postalCode': _postalCode.text.trim(),
        },
        paymentMethod: _method == _VendorPayment.cod ? 'COD' : 'DEMO',
      );
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (_) => OrderPlacedScreen(
            orderId: orderId,
            continueLabel: 'Back to Wholesale Catalog',
            onContinue: () => Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const WholesaleHomeScreen()), (route) => false),
          ),
        ),
        (route) => false,
      );
    } catch (e) {
      setState(() => _error = e.toString());
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
              TextFormField(controller: _name, decoration: const InputDecoration(labelText: 'Business / contact name'), validator: (v) => v!.isEmpty ? 'Required' : null),
              const SizedBox(height: 10),
              TextFormField(controller: _phone, decoration: const InputDecoration(labelText: 'Phone number'), keyboardType: TextInputType.phone, validator: (v) => v!.isEmpty ? 'Required' : null),
              const SizedBox(height: 10),
              TextFormField(controller: _line1, decoration: const InputDecoration(labelText: 'Address'), validator: (v) => v!.isEmpty ? 'Required' : null),
              const SizedBox(height: 10),
              TextFormField(controller: _city, decoration: const InputDecoration(labelText: 'City'), validator: (v) => v!.isEmpty ? 'Required' : null),
              const SizedBox(height: 10),
              TextFormField(controller: _state, decoration: const InputDecoration(labelText: 'State'), validator: (v) => v!.isEmpty ? 'Required' : null),
              const SizedBox(height: 10),
              TextFormField(controller: _postalCode, decoration: const InputDecoration(labelText: 'Postal code'), keyboardType: TextInputType.number, validator: (v) => v!.isEmpty ? 'Required' : null),
              const SizedBox(height: 20),
              const Text('Payment Method', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              RadioListTile<_VendorPayment>(
                value: _VendorPayment.cod,
                groupValue: _method,
                title: const Text('Cash on Delivery'),
                activeColor: AppColors.navy,
                onChanged: (v) => setState(() => _method = v!),
              ),
              RadioListTile<_VendorPayment>(
                value: _VendorPayment.demo,
                groupValue: _method,
                title: const Text('Pay Online'),
                activeColor: AppColors.navy,
                onChanged: (v) => setState(() => _method = v!),
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
              if (_error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_error!, style: const TextStyle(color: AppColors.danger))),
              const SizedBox(height: 20),
              PrimaryButton(label: 'Place Order', loading: _placing, onPressed: _placeOrder),
            ],
          ),
        ),
      ),
    );
  }
}
