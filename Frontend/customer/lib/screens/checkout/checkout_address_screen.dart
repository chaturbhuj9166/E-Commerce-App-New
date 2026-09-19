import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/app_colors.dart';
import '../../models/address.dart';
import '../../widgets/checkout_stepper.dart';
import '../../widgets/primary_button.dart';
import 'checkout_payment_screen.dart';

class CheckoutAddressScreen extends StatefulWidget {
  const CheckoutAddressScreen({super.key});

  @override
  State<CheckoutAddressScreen> createState() => _CheckoutAddressScreenState();
}

class _CheckoutAddressScreenState extends State<CheckoutAddressScreen> {
  List<Address> _addresses = [];
  String? _selectedId;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final data = await ApiClient.instance.get('/addresses') as List;
    setState(() {
      _addresses = data.map((e) => Address.fromJson(e as Map<String, dynamic>)).toList();
      _selectedId ??= _addresses.isNotEmpty ? _addresses.first.id : null;
      _loading = false;
    });
  }

  Future<void> _addAddress() async {
    final address = await showModalBottomSheet<Address>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const _AddAddressSheet(),
    );
    if (address == null) return;
    await ApiClient.instance.post('/addresses', data: address.toJson());
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: SafeArea(
        child: Column(
          children: [
            const CheckoutStepper(step: 1),
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 4, 16, 8),
              child: Align(alignment: Alignment.centerLeft, child: Text('Select Delivery Address', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15))),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : ListView(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      children: [
                        ..._addresses.map((a) => _AddressTile(
                              address: a,
                              selected: a.id == _selectedId,
                              onTap: () => setState(() => _selectedId = a.id),
                            )),
                        OutlinedButton.icon(
                          onPressed: _addAddress,
                          icon: const Icon(Icons.add, size: 18),
                          label: const Text('Add New Address'),
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size.fromHeight(50),
                            side: BorderSide(color: AppColors.border),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],
                    ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 6, 16, 12),
                child: PrimaryButton(
                  label: 'Continue',
                  onPressed: _selectedId == null
                      ? null
                      : () => Navigator.of(context).push(MaterialPageRoute(
                            builder: (_) => CheckoutPaymentScreen(addressId: _selectedId!),
                          )),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AddressTile extends StatelessWidget {
  const _AddressTile({required this.address, required this.selected, required this.onTap});
  final Address address;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: selected ? AppColors.navy : AppColors.border, width: selected ? 1.6 : 1),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Radio<bool>(value: true, groupValue: selected ? true : null, onChanged: (_) => onTap(), activeColor: AppColors.navy),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(address.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    const SizedBox(height: 2),
                    Text('${address.line1}, ${address.city}, ${address.state} - ${address.postalCode}', style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5)),
                    const SizedBox(height: 2),
                    Text('+91 ${address.phone}', style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AddAddressSheet extends StatefulWidget {
  const _AddAddressSheet();

  @override
  State<_AddAddressSheet> createState() => _AddAddressSheetState();
}

class _AddAddressSheetState extends State<_AddAddressSheet> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _line1 = TextEditingController();
  final _city = TextEditingController();
  final _state = TextEditingController();
  final _postalCode = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 16, right: 16, top: 16),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Add New Address', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              const SizedBox(height: 14),
              TextFormField(controller: _name, decoration: const InputDecoration(labelText: 'Full name'), validator: (v) => v!.isEmpty ? 'Required' : null),
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
              const SizedBox(height: 16),
              PrimaryButton(
                label: 'Save Address',
                onPressed: () {
                  if (!_formKey.currentState!.validate()) return;
                  Navigator.of(context).pop(Address(
                    name: _name.text.trim(),
                    phone: _phone.text.trim(),
                    line1: _line1.text.trim(),
                    city: _city.text.trim(),
                    state: _state.text.trim(),
                    postalCode: _postalCode.text.trim(),
                  ));
                },
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
