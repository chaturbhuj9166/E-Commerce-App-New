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
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ApiClient.instance.get('/addresses') as List;
      if (!mounted) return;
      setState(() {
        _addresses = data.map((e) => Address.fromJson(e as Map<String, dynamic>)).toList();
        if (!_addresses.any((a) => a.id == _selectedId)) _selectedId = _addresses.isNotEmpty ? _addresses.first.id : null;
      });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _addAddress() async {
    final address = await showModalBottomSheet<Address>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const _AddAddressSheet(),
    );
    if (address == null || !mounted) return;
    try {
      final created = await ApiClient.instance.post('/addresses', data: address.toJson()) as Map<String, dynamic>;
      _selectedId = created['id'] as String?;
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      return;
    }
    if (mounted) await _load();
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
                  : _error != null
                      ? Center(
                          child: Column(mainAxisSize: MainAxisSize.min, children: [
                            Padding(padding: const EdgeInsets.symmetric(horizontal: 24), child: Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.danger))),
                            const SizedBox(height: 12),
                            OutlinedButton(onPressed: _load, child: const Text('Retry')),
                          ]),
                        )
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
              Padding(
                padding: const EdgeInsets.fromLTRB(4, 2, 10, 0),
                child: Icon(selected ? Icons.radio_button_checked : Icons.radio_button_unchecked, color: selected ? AppColors.navy : AppColors.textMuted, size: 22),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(address.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    const SizedBox(height: 2),
                    Text('${address.line1}, ${address.city}, ${address.state} - ${address.postalCode}', style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5)),
                    const SizedBox(height: 2),
                    Text(address.phone.startsWith('+') ? address.phone : '+91 ${address.phone}', style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5)),
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

  // Mirrors Backend addressSchema: 1-200 chars, phone ^\+?[0-9]{10,15}$.
  static String? _required(String? v) => (v ?? '').trim().isEmpty ? 'Required' : null;
  static String _cleanPhone(String v) => v.replaceAll(RegExp(r'[\s\-()]'), '');

  @override
  void dispose() {
    for (final c in [_name, _phone, _line1, _city, _state, _postalCode]) {
      c.dispose();
    }
    super.dispose();
  }

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
              TextFormField(controller: _name, maxLength: 200, decoration: const InputDecoration(labelText: 'Full name', counterText: ''), validator: _required),
              const SizedBox(height: 10),
              TextFormField(
                controller: _phone,
                decoration: const InputDecoration(labelText: 'Phone number'),
                keyboardType: TextInputType.phone,
                validator: (v) => RegExp(r'^\+?[0-9]{10,15}$').hasMatch(_cleanPhone(v ?? '')) ? null : 'Enter a valid 10-15 digit phone number',
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
                maxLength: 6,
                decoration: const InputDecoration(labelText: 'Postal code', counterText: ''),
                keyboardType: TextInputType.number,
                validator: (v) => RegExp(r'^[0-9]{6}$').hasMatch(v?.trim() ?? '') ? null : 'Enter a 6-digit PIN code',
              ),
              const SizedBox(height: 16),
              PrimaryButton(
                label: 'Save Address',
                onPressed: () {
                  if (!_formKey.currentState!.validate()) return;
                  Navigator.of(context).pop(Address(
                    name: _name.text.trim(),
                    phone: _cleanPhone(_phone.text),
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
